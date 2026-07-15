import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  buildPersonalRecommendations,
  buildRecommendationsForGame,
  type RecommendationGame,
  type RecommendationResult,
} from "@/lib/recommendations";

export const dynamic = "force-dynamic";

type HealthGame = {
  id: number;
  title: string;
  slug: string | null;
  coverArtUrl: string | null;
  hltbMain: number | null;
  franchiseId: number | null;
  franchise: { id: number; name: string } | null;
  metadataOverride: {
    coverArtUrl: string | null;
  } | null;
  gameGenres: {
    genreId: number;
    genre: { id: number; name: string };
  }[];
  gamePlatforms: {
    platform: { id: number; name: string };
  }[];
  userGames: {
    id: number;
    status: string;
    dateStarted: Date | null;
    dateCompleted: Date | null;
    hoursPlayed: number | null;
    platform: { id: number; name: string } | null;
    reviews: {
      overallRating: number | null;
      gameplayRating: number | null;
      storyRating: number | null;
      artRating: number | null;
      musicRating: number | null;
    }[];
  }[];
};

type IssueGame = {
  id: number;
  title: string;
  detail: string;
};

const ACTIVE_STATUSES = new Set(["PLAYING", "REPLAYING"]);
const BLOCKED_RECOMMENDATION_STATUSES = new Set(["COMPLETED", "PLAYING", "REPLAYING"]);

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(the|edition|version|remaster(?:ed)?|definitive|complete|collection)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function effectiveCover(game: HealthGame) {
  return game.metadataOverride?.coverArtUrl ?? game.coverArtUrl;
}

function latestReview(game: HealthGame) {
  return game.userGames.flatMap((copy) => copy.reviews).find(Boolean) ?? null;
}

function titleLink(game: { id: number; title: string }) {
  return `/admin/game/${game.id}`;
}

function toRecommendationGame(game: HealthGame): RecommendationGame {
  return {
    id: game.id,
    title: game.title,
    coverArtUrl: effectiveCover(game),
    hltbMain: game.hltbMain,
    franchiseId: game.franchiseId,
    franchise: game.franchise,
    gameGenres: game.gameGenres,
    userGames: game.userGames.map((copy) => ({
      status: copy.status,
      hoursPlayed: copy.hoursPlayed,
      reviews: copy.reviews,
    })),
  };
}

function recommendationAudit(games: RecommendationGame[]) {
  const groups = buildPersonalRecommendations(games, 12);
  const allResults = Object.values(groups).flat();
  const blockedTitles = new Set(
    games
      .filter((game) => game.userGames.some((copy) => BLOCKED_RECOMMENDATION_STATUSES.has(copy.status)))
      .map((game) => normalizeTitle(game.title)),
  );

  const selfRecommendations = allResults.filter(
    (result) => result.sourceGame?.id === result.game.id,
  );
  const completedRecommendations = allResults.filter((result) =>
    blockedTitles.has(normalizeTitle(result.game.title)),
  );

  const duplicateRecommendations: { type: string; gameId: number; count: number }[] = [];
  for (const [type, results] of Object.entries(groups)) {
    const resultCounts = new Map<number, number>();
    for (const result of results) {
      resultCounts.set(result.game.id, (resultCounts.get(result.game.id) ?? 0) + 1);
    }
    for (const [gameId, count] of resultCounts) {
      if (count > 1) duplicateRecommendations.push({ type, gameId, count });
    }
  }

  const likedSources = games.filter((game) => {
    const completed = game.userGames.some((copy) => copy.status === "COMPLETED");
    return completed && (latestRecommendationReview(game)?.overallRating ?? 0) >= 7.5;
  });
  const noRecommendations = likedSources.filter(
    (source) => buildRecommendationsForGame(source, games, 1).length === 0,
  );

  return {
    selfRecommendations,
    completedRecommendations,
    duplicateRecommendations,
    noRecommendations,
    totalVisible: allResults.length,
  };
}

function latestRecommendationReview(game: RecommendationGame) {
  return game.userGames.flatMap((copy) => copy.reviews).find(Boolean) ?? null;
}

function scoreTone(score: number) {
  if (score >= 98) return { label: "Perfect database", color: "text-emerald-300", bar: "bg-emerald-400" };
  if (score >= 90) return { label: "Excellent health", color: "text-lime-300", bar: "bg-lime-400" };
  if (score >= 75) return { label: "Good, with cleanup needed", color: "text-amber-300", bar: "bg-amber-400" };
  return { label: "Needs attention", color: "text-rose-300", bar: "bg-rose-400" };
}

export default async function AdminCollectionHealthPage() {
  const games = (await prisma.game.findMany({
    include: {
      metadataOverride: true,
      franchise: true,
      gameGenres: { include: { genre: true } },
      gamePlatforms: { include: { platform: true } },
      userGames: {
        include: {
          platform: true,
          reviews: {
            orderBy: [{ reviewDate: "desc" }, { id: "desc" }],
          },
        },
      },
    },
    orderBy: { title: "asc" },
  })) as HealthGame[];

  const missingCovers: IssueGame[] = games
    .filter((game) => !effectiveCover(game))
    .map((game) => ({ id: game.id, title: game.title, detail: "Missing cover art" }));

  const missingHltb: IssueGame[] = games
    .filter((game) => game.hltbMain == null || game.hltbMain <= 0)
    .map((game) => ({ id: game.id, title: game.title, detail: "Missing HLTB Main time" }));

  const missingGenres: IssueGame[] = games
    .filter((game) => game.gameGenres.length === 0)
    .map((game) => ({ id: game.id, title: game.title, detail: "No genres assigned" }));

  const missingPlatforms: IssueGame[] = games
    .filter(
      (game) =>
        game.gamePlatforms.length === 0 &&
        game.userGames.every((copy) => copy.platform == null),
    )
    .map((game) => ({ id: game.id, title: game.title, detail: "No platform assigned" }));

  const missingRatings: IssueGame[] = games
    .filter((game) => {
      const completed = game.userGames.some((copy) => copy.status === "COMPLETED");
      return completed && latestReview(game)?.overallRating == null;
    })
    .map((game) => ({ id: game.id, title: game.title, detail: "Completed without an overall rating" }));

  const completedWithoutDate: IssueGame[] = games.flatMap((game) =>
    game.userGames
      .filter((copy) => copy.status === "COMPLETED" && copy.dateCompleted == null)
      .map((copy) => ({
        id: game.id,
        title: game.title,
        detail: `${copy.platform?.name ?? "Unknown platform"}: completed with no completion date`,
      })),
  );

  const playingWithoutDate: IssueGame[] = games.flatMap((game) =>
    game.userGames
      .filter((copy) => ACTIVE_STATUSES.has(copy.status) && copy.dateStarted == null)
      .map((copy) => ({
        id: game.id,
        title: game.title,
        detail: `${copy.platform?.name ?? "Unknown platform"}: ${copy.status === "REPLAYING" ? "replaying" : "playing"} with no start date`,
      })),
  );

  const normalizedGroups = new Map<string, HealthGame[]>();
  for (const game of games) {
    const key = normalizeTitle(game.title);
    if (!key) continue;
    const group = normalizedGroups.get(key) ?? [];
    group.push(game);
    normalizedGroups.set(key, group);
  }

  const duplicateTitleGroups = [...normalizedGroups.values()].filter((group) => group.length > 1);
  const multiCopyGroups = games.filter((game) => game.userGames.length > 1);
  const duplicateGroups = [
    ...duplicateTitleGroups.map((group) => ({
      key: `title-${group.map((game) => game.id).join("-")}`,
      title: group.map((game) => game.title).join(" / "),
      games: group,
      detail: "Possible duplicate game records",
    })),
    ...multiCopyGroups.map((game) => ({
      key: `copies-${game.id}`,
      title: game.title,
      games: [game],
      detail: "Multiple owned copies — confirm these are intentional",
    })),
  ];

  const recommendationGames = games.map(toRecommendationGame);
  const recommendationIssues = recommendationAudit(recommendationGames);
  const recommendationIssueCount =
    recommendationIssues.selfRecommendations.length +
    recommendationIssues.completedRecommendations.length +
    recommendationIssues.duplicateRecommendations.length +
    recommendationIssues.noRecommendations.length;

  const actionableIssueCount =
    missingCovers.length +
    missingHltb.length +
    missingGenres.length +
    missingPlatforms.length +
    missingRatings.length +
    completedWithoutDate.length +
    playingWithoutDate.length +
    duplicateGroups.length +
    recommendationIssueCount;

  const baseChecks = games.length * 4;
  const reviewChecks = games.filter((game) => game.userGames.some((copy) => copy.status === "COMPLETED")).length;
  const dateChecks = games.reduce(
    (sum, game) =>
      sum +
      game.userGames.filter(
        (copy) => copy.status === "COMPLETED" || ACTIVE_STATUSES.has(copy.status),
      ).length,
    0,
  );
  const possibleChecks = Math.max(1, baseChecks + reviewChecks + dateChecks + duplicateGroups.length + 4);
  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(((possibleChecks - actionableIssueCount) / possibleChecks) * 100)),
  );
  const tone = scoreTone(healthScore);

  const categories = [
    { title: "Missing Covers", description: "Games without usable cover art.", items: missingCovers, accent: "sky" },
    { title: "Missing HLTB", description: "Games without a Main Story estimate.", items: missingHltb, accent: "violet" },
    { title: "Missing Genres", description: "Games that cannot be categorized or recommended accurately.", items: missingGenres, accent: "fuchsia" },
    { title: "Missing Platforms", description: "Games with no library or metadata platform.", items: missingPlatforms, accent: "cyan" },
    { title: "Missing Ratings", description: "Completed games that have not been reviewed.", items: missingRatings, accent: "amber" },
    { title: "Completed Without Date", description: "Completed copies missing a completion date.", items: completedWithoutDate, accent: "emerald" },
    { title: "Playing Without Start Date", description: "Active copies missing a start date.", items: playingWithoutDate, accent: "orange" },
  ] as const;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">Admin · Database Maintenance</p>
            <h1 className="mt-2 text-4xl font-black sm:text-5xl">Collection Health</h1>
            <p className="mt-3 max-w-3xl text-zinc-400">
              Find incomplete metadata, missing review data, suspicious duplicates, and recommendation problems before they affect the rest of Game Vault.
            </p>
          </div>
          <Link
            href="/admin"
            className="w-fit rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            Back to Admin
          </Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-zinc-400">Overall Score</p>
              <div className="mt-2 text-7xl font-black tracking-tight">{healthScore}%</div>
              <p className={`mt-2 text-lg font-bold ${tone.color}`}>{tone.label}</p>
              <p className="mt-2 text-sm text-zinc-500">
                {actionableIssueCount === 0
                  ? "No actionable issues found."
                  : `Needs ${actionableIssueCount} ${actionableIssueCount === 1 ? "improvement" : "improvements"}.`}
              </p>
            </div>
            <div>
              <div className="h-5 overflow-hidden rounded-full bg-zinc-800" title={`${healthScore}% healthy`}>
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${healthScore}%` }} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryStat label="Games checked" value={games.length} />
                <SummaryStat label="Metadata issues" value={missingCovers.length + missingHltb.length + missingGenres.length + missingPlatforms.length} />
                <SummaryStat label="Review/date issues" value={missingRatings.length + completedWithoutDate.length + playingWithoutDate.length} />
                <SummaryStat label="Duplicate/reco issues" value={duplicateGroups.length + recommendationIssueCount} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <IssuePanel key={category.title} {...category} />
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">Duplicate Detection</p>
              <h2 className="mt-2 text-2xl font-black">Possible duplicate or multi-copy games</h2>
              <p className="mt-1 text-sm text-zinc-400">Review these groups and confirm whether they represent intentional platform copies.</p>
            </div>
            <CountBadge count={duplicateGroups.length} />
          </div>

          {duplicateGroups.length === 0 ? (
            <EmptyState message="No suspicious duplicates found." detail="Your title and copy records look clean." />
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {duplicateGroups.map((group) => (
                <div key={group.key} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{group.title}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{group.detail}</p>
                    </div>
                    <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300">Same game?</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {group.games.flatMap((game) => {
                      const platformNames = Array.from(
                        new Set([
                          ...game.userGames.map((copy) => copy.platform?.name).filter((value): value is string => typeof value === "string"),
                          ...game.gamePlatforms.map((entry) => entry.platform.name),
                        ]),
                      );
                      return [
                        <Link key={game.id} href={titleLink(game)} className="block rounded-xl bg-zinc-900 px-3 py-2 transition hover:bg-zinc-800">
                          <span className="font-semibold text-zinc-100">{game.title}</span>
                          <span className="ml-2 text-sm text-zinc-500">{platformNames.join(" • ") || "No platform"}</span>
                        </Link>,
                      ];
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">Recommendation Audit</p>
              <h2 className="mt-2 text-2xl font-black">Recommendation system checks</h2>
              <p className="mt-1 text-sm text-zinc-400">Validates the currently generated recommendation data against your exclusion rules.</p>
            </div>
            <CountBadge count={recommendationIssueCount} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AuditCard title="Self recommendations" count={recommendationIssues.selfRecommendations.length} goodText="No game recommends itself." />
            <AuditCard title="Completed/active recommended" count={recommendationIssues.completedRecommendations.length} goodText="No completed or active games appear." />
            <AuditCard title="Repeated recommendations" count={recommendationIssues.duplicateRecommendations.length} goodText="No duplicate recommendation cards found." />
            <AuditCard title="Sources with no matches" count={recommendationIssues.noRecommendations.length} goodText="Every liked source has at least one match." />
          </div>

          {recommendationIssueCount > 0 && (
            <div className="mt-5 space-y-3">
              {recommendationIssues.selfRecommendations.map((result, index) => (
                <RecommendationIssue key={`self-${result.game.id}-${index}`} result={result} detail="This game is recommending itself." />
              ))}
              {recommendationIssues.completedRecommendations.map((result, index) => (
                <RecommendationIssue key={`blocked-${result.game.id}-${index}`} result={result} detail="This title is completed, playing, or replaying and should be excluded." />
              ))}
              {recommendationIssues.noRecommendations.map((game) => (
                <Link key={`none-${game.id}`} href={titleLink(game)} className="block rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 hover:border-zinc-600">
                  <span className="font-semibold">{game.title}</span>
                  <span className="ml-2 text-sm text-zinc-500">No eligible recommendation found.</span>
                </Link>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-zinc-600">Audited {recommendationIssues.totalVisible} generated recommendation cards.</p>
        </section>
      </div>
    </main>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-medium text-zinc-500">{label}</div>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-black ${count === 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
      {count} {count === 1 ? "issue" : "issues"}
    </span>
  );
}

function IssuePanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: IssueGame[];
  accent: string;
}) {
  return (
    <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 open:bg-zinc-900">
      <summary className="cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
          <CountBadge count={items.length} />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-600 group-open:hidden">Click to view</p>
      </summary>
      <div className="border-t border-zinc-800 px-5 pb-5 pt-4">
        {items.length === 0 ? (
          <EmptyState message={`No ${title.toLowerCase()}.`} detail="This check passed." />
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {items.map((item, index) => (
              <Link key={`${item.id}-${index}`} href={`/admin/game/${item.id}`} className="block rounded-xl bg-zinc-950/70 px-3 py-3 transition hover:bg-zinc-800">
                <div className="font-semibold text-zinc-100">{item.title}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{item.detail}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function EmptyState({ message, detail }: { message: string; detail: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-5 py-8 text-center">
      <p className="font-bold text-zinc-300">{message}</p>
      <p className="mt-1 text-sm text-zinc-600">{detail}</p>
    </div>
  );
}

function AuditCard({ title, count, goodText }: { title: string; count: number; goodText: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className={`text-3xl font-black ${count === 0 ? "text-emerald-300" : "text-rose-300"}`}>{count}</div>
      <div className="mt-2 font-bold text-zinc-200">{title}</div>
      <div className="mt-1 text-xs text-zinc-500">{count === 0 ? goodText : "Review the entries below."}</div>
    </div>
  );
}

function RecommendationIssue({ result, detail }: { result: RecommendationResult; detail: string }) {
  return (
    <Link href={`/admin/game/${result.game.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 hover:border-zinc-600">
      <span className="font-semibold">{result.game.title}</span>
      <span className="ml-2 text-sm text-zinc-500">{detail}</span>
    </Link>
  );
}
