import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RatingBadge } from "@/components/RatingBadge";
import { GameRecommendations } from "@/components/recommendations/GameRecommendations";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ReviewRecord = {
  overallRating: number | null;
  gameplayRating: number | null;
  storyRating: number | null;
  artRating: number | null;
  musicRating: number | null;
  notes: string | null;
  reviewDate: Date | null;
};

type UserGameRecord = {
  id: number;
  gameId: number;
  platformId: number | null;
  status: string;
  hoursPlayed: number | null;
  dateStarted: Date | null;
  dateCompleted: Date | null;
  platform: { id: number; name: string } | null;
  reviews: ReviewRecord[];
};

type GenreRecord = {
  genreId: number;
  genre: { id: number; name: string };
};

type RankedGame = {
  id: number;
  title: string;
  gameGenres: GenreRecord[];
  userGames: UserGameRecord[];
};

type SimilarGame = RankedGame & {
  coverArtUrl: string | null;
  releaseDate: Date | null;
  franchiseId: number | null;
};

type SimilarGameResult = SimilarGame & {
  similarityScore: number;
  similarityReasons: string[];
};

type SummaryItem = {
  label: string;
  detail: string;
};

export default async function GamePage({ params }: PageProps) {
  const { id } = await params;
  const gameId = Number(id);

  if (!Number.isInteger(gameId)) notFound();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      franchise: true,
      gameGenres: { include: { genre: true } },
      userGames: {
        include: {
          platform: true,
          reviews: { orderBy: { reviewDate: "desc" } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!game) notFound();

  const typedGame = game as typeof game & {
    gameGenres: GenreRecord[];
    userGames: UserGameRecord[];
  };

  const primaryUserGame =
    typedGame.userGames.find((copy) => copy.reviews.length > 0) ??
    typedGame.userGames[0];
  const review = primaryUserGame?.reviews[0];
  const genres = typedGame.gameGenres.map((entry) => entry.genre.name);
  const genreIds = typedGame.gameGenres.map((entry) => entry.genreId);

  const [previousGame, nextGame, candidateGames, rankedGames] =
    await Promise.all([
      prisma.game.findFirst({
        where: { id: { lt: typedGame.id } },
        orderBy: { id: "desc" },
      }),
      prisma.game.findFirst({
        where: { id: { gt: typedGame.id } },
        orderBy: { id: "asc" },
      }),
      prisma.game.findMany({
        where: { id: { not: typedGame.id } },
        include: {
          gameGenres: { include: { genre: true } },
          userGames: {
            include: {
              platform: true,
              reviews: { orderBy: { reviewDate: "desc" } },
            },
          },
        },
      }),
      prisma.game.findMany({
        include: {
          gameGenres: { include: { genre: true } },
          userGames: {
            include: {
              platform: true,
              reviews: { orderBy: { reviewDate: "desc" } },
            },
          },
        },
      }),
    ]);

  const similarGames = buildSimilarGames(
    typedGame,
    candidateGames as SimilarGame[],
    review?.overallRating ?? null,
    genreIds,
  );

  const personalRankings = buildPersonalRankings(
    typedGame.id,
    rankedGames as RankedGame[],
    genres,
    typedGame.userGames
      .map((copy) => copy.platform?.name)
      .filter((name): name is string => Boolean(name)),
  );

  const summary = buildReviewSummary(review);
  const completionPercentage = calculateCompletionPercentage(
    primaryUserGame,
    game.hltbMain,
  );

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <Link href="/" className="secondaryButton">
              ← Library
            </Link>
            <Link href={`/admin/game/${game.id}`} className="secondaryButton">
              ⚙ Edit
            </Link>
          </div>

          <div className="flex gap-2">
            {previousGame && (
              <Link href={`/game/${previousGame.id}`} className="secondaryButton">
                ← Previous
              </Link>
            )}
            {nextGame && (
              <Link href={`/game/${nextGame.id}`} className="secondaryButton">
                Next →
              </Link>
            )}
          </div>
        </div>

        <section className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside>
            <div className="sticky top-6">
              {game.coverArtUrl ? (
                <Image
                  src={game.coverArtUrl}
                  alt={`${game.title} cover art`}
                  width={220}
                  height={330}
                  priority
                  className="h-auto w-full rounded-xl border border-zinc-800 object-cover shadow-2xl"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500">
                  No Cover
                </div>
              )}

              {personalRankings.length > 0 && (
                <section className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                    Personal Ranking
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {personalRankings.map((ranking) => (
                      <span
                        key={ranking}
                        className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200"
                      >
                        ★ {ranking}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <header>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                {game.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {genres.length > 0 ? (
                  genres.map((genre) => (
                    <span key={genre} className="tag">
                      {genre}
                    </span>
                  ))
                ) : (
                  <span className="tag text-zinc-500">Unknown Genre</span>
                )}
                {game.franchise && (
                  <Link href={`/franchise/${game.franchise.id}`} className="tag hover:text-white">
                    {game.franchise.name}
                  </Link>
                )}
              </div>
            </header>

            <section className="mt-8">
              <SectionHeading
                eyebrow="Your Playthrough"
                title="Review Metadata"
                description="The key details behind this review and completion."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Status" value={formatStatus(primaryUserGame?.status)} />
                <InfoCard label="Platform" value={primaryUserGame?.platform?.name ?? "N/A"} />
                <InfoCard label="Date Started" value={formatCalendarDate(primaryUserGame?.dateStarted)} />
                <InfoCard label="Date Finished" value={formatCalendarDate(primaryUserGame?.dateCompleted)} />
                <InfoCard label="Hours" value={formatHours(primaryUserGame?.hoursPlayed ?? null)} />
                <InfoCard label="HLTB Main" value={formatHours(game.hltbMain)} />
                <InfoCard
                  label="Completion"
                  value={completionPercentage == null ? "N/A" : `${completionPercentage}%`}
                />
                <InfoCard
                  label="Overall Rating"
                  value={<RatingBadge rating={review?.overallRating} compact />}
                />
              </div>
            </section>

            {review && (
              <section className="mt-10">
                <SectionHeading
                  eyebrow="Scorecard"
                  title="Rating Breakdown"
                  description="A visual overview of how each part of the game scored."
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <RatingBar label="Gameplay" rating={review.gameplayRating} />
                  <RatingBar label="Story" rating={review.storyRating} />
                  <RatingBar label="Art" rating={review.artRating} />
                  <RatingBar label="Music" rating={review.musicRating} />
                </div>
              </section>
            )}

            {(summary.strengths.length > 0 || summary.weaknesses.length > 0) && (
              <section className="mt-10">
                <SectionHeading
                  eyebrow="At a Glance"
                  title="Review Summary"
                  description="Automatically generated from your category ratings."
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <SummaryCard title="Strengths" items={summary.strengths} positive />
                  <SummaryCard title="Weaknesses" items={summary.weaknesses} />
                </div>
              </section>
            )}

            {review?.notes && (
              <section className="mt-10">
                <SectionHeading eyebrow="Full Review" title="Your Notes" />
                <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 leading-8 text-zinc-300 shadow-sm">
                  {review.notes}
                </div>
              </section>
            )}

            <section className="mt-10">
              <SectionHeading
                eyebrow="Collection"
                title="Owned Copies"
                description="Every copy of this game currently in your library."
              />
              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
                {typedGame.userGames.map((copy) => {
                  const copyReview = copy.reviews[0];
                  return (
                    <div
                      key={copy.id}
                      className="grid gap-3 border-b border-zinc-800 p-4 last:border-b-0 sm:grid-cols-[1.3fr_repeat(4,1fr)_auto] sm:items-center"
                    >
                      <div>
                        <p className="font-semibold">{copy.platform?.name ?? "Unknown Platform"}</p>
                        <p className="text-xs text-zinc-500">Copy #{copy.id}</p>
                      </div>
                      <CopyValue label="Status" value={formatStatus(copy.status)} />
                      <CopyValue label="Hours" value={formatHours(copy.hoursPlayed)} />
                      <CopyValue
                        label="Rating"
                        value={copyReview?.overallRating != null ? `${copyReview.overallRating}/10` : "N/A"}
                      />
                      <CopyValue label="Completed" value={formatCalendarDate(copy.dateCompleted)} />
                      <Link
                        href={`/admin/copy/${copy.id}`}
                        className="text-sm font-semibold text-zinc-300 hover:text-white hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </section>

        <GameRecommendations gameId={game.id} />
      </div>

      <style>{`
        .secondaryButton { border-radius: 0.5rem; border: 1px solid rgb(63 63 70); background: rgb(24 24 27); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
        .secondaryButton:hover { border-color: rgb(161 161 170); }
        .tag { display: inline-flex; border-radius: 9999px; border: 1px solid rgb(63 63 70); background: rgb(24 24 27); padding: 0.375rem 0.75rem; font-size: 0.875rem; color: rgb(212 212 216); }
      `}</style>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-2 text-lg font-bold text-zinc-100">{value}</div>
    </div>
  );
}

function RatingBar({ label, rating }: { label: string; rating: number | null | undefined }) {
  const normalized = rating == null ? 0 : Math.max(0, Math.min(10, rating));
  const percentage = normalized * 10;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex items-end justify-between gap-4">
        <p className="font-semibold text-zinc-200">{label}</p>
        <p className="text-2xl font-black">{rating == null ? "N/A" : rating}</p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800" aria-label={`${label}: ${rating ?? "not rated"} out of 10`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
        <span>0</span><span>10</span>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: SummaryItem[];
  positive?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${positive ? "border-emerald-500/25 bg-emerald-500/5" : "border-rose-500/25 bg-rose-500/5"}`}>
      <h3 className={`text-lg font-bold ${positive ? "text-emerald-300" : "text-rose-300"}`}>{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.label} className="flex gap-3">
              <span className={positive ? "text-emerald-400" : "text-rose-400"}>{positive ? "+" : "−"}</span>
              <div>
                <p className="font-semibold text-zinc-200">{item.label}</p>
                <p className="text-sm text-zinc-400">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">Nothing strongly stands out in this category yet.</p>
      )}
    </div>
  );
}

function CopyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-zinc-200">{value}</p>
    </div>
  );
}

function buildReviewSummary(review: ReviewRecord | undefined) {
  const categories = [
    { label: "Gameplay", rating: review?.gameplayRating },
    { label: "Story", rating: review?.storyRating },
    { label: "Art", rating: review?.artRating },
    { label: "Music", rating: review?.musicRating },
  ];

  const strengths = categories
    .filter((category) => category.rating != null && category.rating >= 8)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .map((category) => ({
      label: category.label,
      detail: strengthDescription(category.label, category.rating ?? 0),
    }));

  const weaknesses = categories
    .filter((category) => category.rating != null && category.rating <= 5)
    .sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0))
    .map((category) => ({
      label: category.label,
      detail: weaknessDescription(category.label, category.rating ?? 0),
    }));

  return { strengths, weaknesses };
}

function strengthDescription(label: string, rating: number) {
  const adjective = rating >= 9.5 ? "Exceptional" : rating >= 9 ? "Outstanding" : "A major strength";
  return `${adjective} ${label.toLowerCase()} (${rating}/10).`;
}

function weaknessDescription(label: string, rating: number) {
  const adjective = rating <= 2 ? "A serious weakness" : rating <= 4 ? "A notable weakness" : "The weakest part of the experience";
  return `${adjective} in ${label.toLowerCase()} (${rating}/10).`;
}

function buildPersonalRankings(
  currentGameId: number,
  games: RankedGame[],
  currentGenres: string[],
  currentPlatforms: string[],
) {
  const scoredGames = games
    .map((game) => ({ game, rating: getLatestOverallRating(game.userGames) }))
    .filter((entry): entry is { game: RankedGame; rating: number } => entry.rating != null)
    .sort((a, b) => b.rating - a.rating || a.game.title.localeCompare(b.game.title));

  const currentIndex = scoredGames.findIndex((entry) => entry.game.id === currentGameId);
  const badges: string[] = [];

  if (currentIndex >= 0 && currentIndex < 10) {
    badges.push(`#${currentIndex + 1} Overall`);
  }

  const currentRating = scoredGames.find((entry) => entry.game.id === currentGameId)?.rating;
  if (currentRating == null) return badges;

  for (const genreName of currentGenres) {
    const genreRatings = scoredGames
      .filter(({ game }) => game.gameGenres.some((entry) => entry.genre.name === genreName))
      .map((entry) => entry.rating);
    if (genreRatings.length > 0 && currentRating === Math.max(...genreRatings)) {
      badges.push(`Top ${genreName} Game`);
    }
  }

  for (const platformName of [...new Set(currentPlatforms)]) {
    const platformRatings = scoredGames
      .filter(({ game }) => game.userGames.some((copy) => copy.platform?.name === platformName))
      .map((entry) => entry.rating);
    if (platformRatings.length > 0 && currentRating === Math.max(...platformRatings)) {
      badges.push(`Top ${platformName} Game`);
    }
  }

  return badges.slice(0, 6);
}

function getLatestOverallRating(userGames: UserGameRecord[]) {
  const ratings = userGames
    .map((copy) => copy.reviews[0]?.overallRating)
    .filter((rating): rating is number => rating != null);
  return ratings.length > 0 ? Math.max(...ratings) : null;
}

function calculateCompletionPercentage(userGame: UserGameRecord | undefined, hltbMain: number | null) {
  if (!userGame) return null;
  if (userGame.status === "COMPLETED") return 100;
  if (userGame.hoursPlayed == null || hltbMain == null || hltbMain <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((userGame.hoursPlayed / hltbMain) * 100)));
}

function buildSimilarGames(
  currentGame: {
    franchiseId: number | null;
    releaseDate: Date | null;
    userGames: UserGameRecord[];
  },
  candidates: SimilarGame[],
  currentRating: number | null,
  genreIds: number[],
): SimilarGameResult[] {
  const currentGenreIds = new Set(genreIds);
  const currentPlatformIds = new Set(
    currentGame.userGames.map((copy) => copy.platformId).filter((id): id is number => id != null),
  );
  const currentReleaseYear = currentGame.releaseDate?.getFullYear() ?? null;

  return candidates
    .map((candidate) => {
      const candidateRating = getLatestOverallRating(candidate.userGames);
      const candidateGenreIds = candidate.gameGenres.map((entry) => entry.genreId);
      const sharedGenreCount = candidateGenreIds.filter((id) => currentGenreIds.has(id)).length;
      const reasons: string[] = [];
      let score = genreIds.length > 0 ? Math.round((sharedGenreCount / genreIds.length) * 40) : 0;

      if (sharedGenreCount > 0) reasons.push(`${sharedGenreCount} shared genre${sharedGenreCount === 1 ? "" : "s"}`);
      if (currentGame.franchiseId && candidate.franchiseId === currentGame.franchiseId) {
        score += 30;
        reasons.push("Same franchise");
      }
      if (candidate.userGames.some((copy) => copy.platformId != null && currentPlatformIds.has(copy.platformId))) {
        score += 15;
        reasons.push("Same platform");
      }
      if (currentRating != null && candidateRating != null) {
        const difference = Math.abs(currentRating - candidateRating);
        score += Math.max(0, 15 - difference * 3);
        if (difference <= 1) reasons.push("Similar rating");
      }
      if (currentReleaseYear && candidate.releaseDate) {
        const difference = Math.abs(currentReleaseYear - candidate.releaseDate.getFullYear());
        if (difference <= 2) score += 5;
        else if (difference <= 5) score += 3;
      }

      return { ...candidate, similarityScore: score, similarityReasons: reasons };
    })
    .filter((candidate) => candidate.similarityScore >= 20)
    .sort((a, b) => b.similarityScore - a.similarityScore || a.title.localeCompare(b.title))
    .slice(0, 6);
}

function formatHours(hours: number | null | undefined) {
  return hours != null ? `${hours} hrs` : "N/A";
}

function formatStatus(status: string | undefined) {
  if (!status) return "N/A";
  return status
    .replace("ONHOLD", "On Hold")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCalendarDate(date: Date | string | null | undefined) {
  if (!date) return "N/A";
  const value = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
