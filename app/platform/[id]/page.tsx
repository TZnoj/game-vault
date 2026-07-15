import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RatingBadge } from "@/components/RatingBadge";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ReviewData = {
  overallRating: number | null;
  reviewDate: Date | null;
};

type UserGameData = {
  id: number;
  status: string;
  dateStarted: Date | null;
  dateCompleted: Date | null;
  hoursPlayed: number | null;
  createdAt: Date;
  updatedAt: Date;
  reviews: ReviewData[];
  game: {
    id: number;
    title: string;
    coverArtUrl: string | null;
    releaseDate: Date | null;
    isEndless: boolean;
    franchise: { id: number; name: string } | null;
    gameGenres: { genre: { id: number; name: string } }[];
  };
};

type TitleEntry = {
  gameId: number;
  title: string;
  coverArtUrl: string | null;
  releaseDate: Date | null;
  status: string;
  rating: number | null;
  hoursPlayed: number | null;
  dateCompleted: Date | null;
  createdAt: Date;
  updatedAt: Date;
  genres: { id: number; name: string }[];
  franchise: { id: number; name: string } | null;
};

const STATUS_PRIORITY: Record<string, number> = {
  COMPLETED: 6,
  PLAYING: 5,
  REPLAYING: 5,
  ONHOLD: 4,
  DROPPED: 3,
  BACKLOG: 2,
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Completed",
  PLAYING: "Playing",
  REPLAYING: "Replaying",
  BACKLOG: "Backlog",
  DROPPED: "Dropped",
  ONHOLD: "On Hold",
};

function latestReview(copies: UserGameData[]): ReviewData | null {
  return copies
    .flatMap((copy) => copy.reviews)
    .filter((review) => review.overallRating != null)
    .sort((a, b) => {
      const aTime = a.reviewDate?.getTime() ?? 0;
      const bTime = b.reviewDate?.getTime() ?? 0;
      return bTime - aTime;
    })[0] ?? null;
}

function representativeStatus(copies: UserGameData[]) {
  return [...copies]
    .sort(
      (a, b) =>
        (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0),
    )[0]?.status ?? "BACKLOG";
}

function newestDate(dates: (Date | null | undefined)[]): Date | null {
  const valid = dates.filter((date): date is Date => date instanceof Date);
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid.map((date) => date.getTime())));
}

function oldestDate(dates: Date[]): Date {
  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function groupUniqueTitles(userGames: UserGameData[]): TitleEntry[] {
  const grouped = new Map<number, UserGameData[]>();

  for (const userGame of userGames) {
    const copies = grouped.get(userGame.game.id) ?? [];
    copies.push(userGame);
    grouped.set(userGame.game.id, copies);
  }

  return [...grouped.values()].map((copies) => {
    const first = copies[0];
    const review = latestReview(copies);
    const completedCopies = copies.filter((copy) => copy.status === "COMPLETED");
    const playedCopies = copies.filter((copy) => copy.hoursPlayed != null);

    return {
      gameId: first.game.id,
      title: first.game.title,
      coverArtUrl: first.game.coverArtUrl,
      releaseDate: first.game.releaseDate,
      status: representativeStatus(copies),
      rating: review?.overallRating ?? null,
      hoursPlayed:
        playedCopies.length > 0
          ? Math.max(...playedCopies.map((copy) => copy.hoursPlayed ?? 0))
          : null,
      dateCompleted: newestDate(
        completedCopies.map((copy) => copy.dateCompleted),
      ),
      createdAt: oldestDate(copies.map((copy) => copy.createdAt)),
      updatedAt: new Date(
        Math.max(...copies.map((copy) => copy.updatedAt.getTime())),
      ),
      genres: first.game.gameGenres.map((gameGenre) => gameGenre.genre),
      franchise: first.game.franchise,
    };
  });
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mostCommonName(
  entries: TitleEntry[],
  selector: (entry: TitleEntry) => { id: number; name: string }[],
): { id: number; name: string; count: number } | null {
  const counts = new Map<number, { id: number; name: string; count: number }>();

  for (const entry of entries) {
    for (const item of selector(entry)) {
      const current = counts.get(item.id);
      counts.set(item.id, {
        id: item.id,
        name: item.name,
        count: (current?.count ?? 0) + 1,
      });
    }
  }

  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  )[0] ?? null;
}

export default async function PlatformPage({ params }: PageProps) {
  const { id } = await params;
  const platformId = Number(id);

  if (!Number.isInteger(platformId)) notFound();

  const platform = await prisma.platform.findUnique({
    where: { id: platformId },
    include: {
      userGames: {
        include: {
          game: {
            include: {
              franchise: true,
              gameGenres: { include: { genre: true } },
            },
          },
          reviews: { orderBy: { reviewDate: "desc" } },
        },
      },
    },
  });

  if (!platform) notFound();

  const titles = groupUniqueTitles(platform.userGames as UserGameData[]);
  const completed = titles.filter((game) => game.status === "COMPLETED");
  const playing = titles.filter(
    (game) => game.status === "PLAYING" || game.status === "REPLAYING",
  );
  const backlog = titles.filter((game) => game.status === "BACKLOG");
  const onHold = titles.filter((game) => game.status === "ONHOLD");
  const dropped = titles.filter((game) => game.status === "DROPPED");
  const eligible = titles.filter((game) => {
    const source = platform.userGames.find(
      (userGame) => userGame.game.id === game.gameId,
    );
    return !source?.game.isEndless;
  });
  const completionRate =
    eligible.length > 0
      ? (eligible.filter((game) => game.status === "COMPLETED").length /
          eligible.length) *
        100
      : 0;

  const ratings = titles
    .map((game) => game.rating)
    .filter((rating): rating is number => rating != null);
  const averageRating = average(ratings);

  const completedHours = completed
    .map((game) => game.hoursPlayed)
    .filter((hours): hours is number => hours != null);
  const averageHours = average(completedHours);
  const totalHours = completedHours.reduce((sum, hours) => sum + hours, 0);

  const favoriteGenre = mostCommonName(titles, (game) => game.genres);
  const favoriteFranchise = mostCommonName(titles, (game) => {
    if (
      !game.franchise ||
      game.franchise.name.trim().toLowerCase() === "standalone"
    ) {
      return [];
    }
    return [game.franchise];
  });

  const topRated = [...titles]
    .filter((game) => game.rating != null)
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title),
    )
    .slice(0, 6);

  const mostPlayed = [...titles]
    .filter((game) => game.hoursPlayed != null)
    .sort(
      (a, b) =>
        (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, 6);

  const recentlyAdded = [...titles]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  const recentlyCompleted = [...completed]
    .filter((game) => game.dateCompleted != null)
    .sort(
      (a, b) =>
        (b.dateCompleted?.getTime() ?? 0) -
        (a.dateCompleted?.getTime() ?? 0),
    )
    .slice(0, 6);

  const allGames = [...titles].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <Link href="/platforms" className="text-sm text-zinc-400 hover:text-white">
          ← Back to Platforms
        </Link>

        <header className="mt-5 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-400">
                Platform Collection
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">
                {platform.name}
              </h1>
              <p className="mt-3 text-zinc-400">
                {titles.length} unique {titles.length === 1 ? "game" : "games"} owned
              </p>
            </div>

            <div className="min-w-64 rounded-2xl border border-zinc-700 bg-black/25 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-400">Completion</p>
                  <p className="mt-1 text-4xl font-black">{completionRate.toFixed(0)}%</p>
                </div>
                <p className="text-sm text-zinc-400">
                  {completed.length} / {eligible.length}
                </p>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${Math.min(completionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <StatCard label="Games Owned" value={titles.length} />
          <StatCard label="Completed" value={completed.length} />
          <StatCard label="Playing" value={playing.length} />
          <StatCard label="Backlog" value={backlog.length} />
          <StatCard label="Average Rating" value={averageRating != null ? averageRating.toFixed(1) : "N/A"} />
          <StatCard label="Average Hours" value={averageHours != null ? `${averageHours.toFixed(1)} hrs` : "N/A"} />
          <StatCard label="Total Hours" value={`${totalHours.toFixed(1)} hrs`} />
          <StatCard label="Favorite Genre" value={favoriteGenre?.name ?? "N/A"} subvalue={favoriteGenre ? `${favoriteGenre.count} games` : undefined} />
          <StatCard label="Favorite Franchise" value={favoriteFranchise?.name ?? "N/A"} subvalue={favoriteFranchise ? `${favoriteFranchise.count} games` : undefined} />
          <StatCard label="Other" value={onHold.length + dropped.length} subvalue={`${onHold.length} on hold · ${dropped.length} dropped`} />
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Highlights</p>
            <h2 className="mt-1 text-3xl font-bold">Top Games</h2>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <GameListPanel title="Top Rated" games={topRated} metric="rating" empty="No rated games yet." />
            <GameListPanel title="Most Played" games={mostPlayed} metric="hours" empty="No playtime recorded yet." />
            <GameListPanel title="Recently Added" games={recentlyAdded} metric="added" empty="No games found." />
            <GameListPanel title="Recently Completed" games={recentlyCompleted} metric="completed" empty="No completed games with dates yet." />
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Collection</p>
              <h2 className="mt-1 text-3xl font-bold">All {platform.name} Games</h2>
            </div>
            <p className="text-sm text-zinc-500">{allGames.length} titles</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {allGames.map((game) => (
              <GameCard key={game.gameId} game={game} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string | number;
  subvalue?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-black">{value}</p>
      {subvalue ? <p className="mt-1 text-xs text-zinc-500">{subvalue}</p> : null}
    </div>
  );
}

function GameListPanel({
  title,
  games,
  metric,
  empty,
}: {
  title: string;
  games: TitleEntry[];
  metric: "rating" | "hours" | "added" | "completed";
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-xl font-bold">{title}</h3>
      {games.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="mt-4 divide-y divide-zinc-800">
          {games.map((game, index) => (
            <Link
              key={game.gameId}
              href={`/game/${game.gameId}`}
              className="flex items-center gap-4 py-3 hover:text-cyan-300"
            >
              <span className="w-6 text-center text-sm font-bold text-zinc-600">
                {index + 1}
              </span>
              <div className="relative h-16 w-12 flex-none overflow-hidden rounded-md bg-zinc-800">
                {game.coverArtUrl ? (
                  <Image src={game.coverArtUrl} alt="" fill sizes="48px" className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{game.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{STATUS_LABELS[game.status] ?? game.status}</p>
              </div>
              <div className="shrink-0 text-right text-sm font-bold">
                {metric === "rating" ? <RatingBadge rating={game.rating} compact /> : null}
                {metric === "hours" ? `${game.hoursPlayed?.toFixed(1)} hrs` : null}
                {metric === "added" ? formatCalendarDate(game.createdAt) : null}
                {metric === "completed" && game.dateCompleted ? formatCalendarDate(game.dateCompleted) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function GameCard({ game }: { game: TitleEntry }) {
  return (
    <Link
      href={`/game/${game.gameId}`}
      className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-1 hover:border-zinc-600"
    >
      <div className="relative aspect-[3/4] bg-zinc-800">
        {game.coverArtUrl ? (
          <Image
            src={game.coverArtUrl}
            alt={`${game.title} cover art`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">No Cover</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-bold">{game.title}</h3>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-300">
            {STATUS_LABELS[game.status] ?? game.status}
          </span>
          <RatingBadge rating={game.rating} compact />
        </div>
      </div>
    </Link>
  );
}

function formatCalendarDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
