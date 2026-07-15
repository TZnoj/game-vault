import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RatingBadge } from "@/components/RatingBadge";

type PageProps = {
  params: Promise<{ id: string }>;
};

type Status =
  | "BACKLOG"
  | "PLAYING"
  | "COMPLETED"
  | "DROPPED"
  | "REPLAYING"
  | "ONHOLD";

const STATUS_LABELS: Record<Status, string> = {
  BACKLOG: "Backlog",
  PLAYING: "Playing",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  REPLAYING: "Replaying",
  ONHOLD: "On Hold",
};

const STATUS_PRIORITY: Status[] = [
  "COMPLETED",
  "REPLAYING",
  "PLAYING",
  "ONHOLD",
  "DROPPED",
  "BACKLOG",
];

function latestReview<T extends { reviewDate: Date | null }>(reviews: T[]) {
  return [...reviews].sort((a, b) => {
    const aTime = a.reviewDate?.getTime() ?? 0;
    const bTime = b.reviewDate?.getTime() ?? 0;
    return bTime - aTime;
  })[0];
}

function aggregateStatus(statuses: string[]): Status {
  for (const status of STATUS_PRIORITY) {
    if (statuses.includes(status)) return status;
  }
  return "BACKLOG";
}

function formatReleaseDate(date: Date | null) {
  if (!date) return "Release date unknown";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default async function FranchisePage({ params }: PageProps) {
  const { id } = await params;
  const franchiseId = Number(id);

  if (!Number.isInteger(franchiseId)) notFound();

  const franchise = await prisma.franchise.findFirst({
    where: {
      id: franchiseId,
      name: { not: "Standalone" },
    },
    include: {
      games: {
        include: {
          gameGenres: { include: { genre: true } },
          userGames: {
            include: {
              platform: true,
              reviews: { orderBy: { reviewDate: "desc" } },
            },
          },
        },
      },
    },
  });

  if (!franchise) notFound();

  const games = franchise.games.map((game) => {
    const status = aggregateStatus(game.userGames.map((copy) => copy.status));

    const reviewedCopies = game.userGames
      .map((copy) => ({ copy, review: latestReview(copy.reviews) }))
      .filter((entry) => entry.review?.overallRating != null)
      .sort(
        (a, b) =>
          (b.review?.reviewDate?.getTime() ?? 0) -
          (a.review?.reviewDate?.getTime() ?? 0),
      );

    const rating = reviewedCopies[0]?.review?.overallRating ?? null;
    const completedCopies = game.userGames.filter(
      (copy) => copy.status === "COMPLETED",
    );
    const hours = completedCopies.reduce(
      (sum, copy) => sum + (copy.hoursPlayed ?? 0),
      0,
    );
    const hoursEntries = completedCopies.filter(
      (copy) => copy.hoursPlayed != null,
    ).length;

    return {
      ...game,
      status,
      rating,
      completedHours: hoursEntries > 0 ? hours : null,
      platforms: Array.from(
        new Set(
          game.userGames
            .map((copy) => copy.platform?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ),
      genres: game.gameGenres.map((entry) => entry.genre.name),
    };
  });

  const totalGames = games.length;
  const completedGames = games.filter((game) => game.status === "COMPLETED");
  const playingGames = games.filter(
    (game) => game.status === "PLAYING" || game.status === "REPLAYING",
  );
  const backlogGames = games.filter((game) => game.status === "BACKLOG");
  const droppedGames = games.filter((game) => game.status === "DROPPED");
  const onHoldGames = games.filter((game) => game.status === "ONHOLD");

  const completionEligible = games.filter((game) => !game.isEndless);
  const completionRate =
    completionEligible.length > 0
      ? (completionEligible.filter((game) => game.status === "COMPLETED").length /
          completionEligible.length) *
        100
      : 0;

  const ratedGames = games.filter(
    (game): game is typeof game & { rating: number } => game.rating != null,
  );
  const averageRating =
    ratedGames.length > 0
      ? ratedGames.reduce((sum, game) => sum + game.rating, 0) /
        ratedGames.length
      : null;
  const bestGame = [...ratedGames].sort((a, b) => b.rating - a.rating)[0];
  const worstGame = [...ratedGames].sort((a, b) => a.rating - b.rating)[0];

  const gamesWithHours = games.filter(
    (game): game is typeof game & { completedHours: number } =>
      game.completedHours != null,
  );
  const averageHours =
    gamesWithHours.length > 0
      ? gamesWithHours.reduce((sum, game) => sum + game.completedHours, 0) /
        gamesWithHours.length
      : null;

  const timelineGames = [...games].sort((a, b) => {
    if (a.releaseDate && b.releaseDate) {
      return a.releaseDate.getTime() - b.releaseDate.getTime();
    }
    if (a.releaseDate) return -1;
    if (b.releaseDate) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/franchises" className="text-sm text-zinc-400 hover:text-white">
          ← Back to Franchises
        </Link>

        <header className="mt-5 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Franchise overview
          </p>
          <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                {franchise.name}
              </h1>
              <p className="mt-3 text-zinc-400">
                {totalGames} {totalGames === 1 ? "game" : "games"} owned in this franchise
              </p>
            </div>

            <div className="min-w-64 rounded-2xl border border-zinc-700 bg-zinc-950/70 p-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-400">Completion</p>
                  <p className="mt-1 text-4xl font-black">
                    {completionRate.toFixed(0)}%
                  </p>
                </div>
                <p className="pb-1 text-sm text-zinc-400">
                  {completedGames.length}/{completionEligible.length}
                </p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(completionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <OverviewCard label="Games" value={totalGames} />
          <OverviewCard label="Completed" value={completedGames.length} />
          <OverviewCard label="Playing" value={playingGames.length} />
          <OverviewCard label="Backlog" value={backlogGames.length} />
          <OverviewCard label="On Hold" value={onHoldGames.length} />
          <OverviewCard label="Dropped" value={droppedGames.length} />
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Ratings and time
            </p>
            <h2 className="mt-1 text-2xl font-bold">Franchise performance</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              label="Average Rating"
              value={averageRating != null ? `${averageRating.toFixed(1)}/10` : "N/A"}
              detail={ratedGames.length > 0 ? `Across ${ratedGames.length} rated games` : "No ratings yet"}
            />
            <GameFeatureCard label="Best Game" game={bestGame} />
            <GameFeatureCard label="Worst Game" game={worstGame} />
            <FeatureCard
              label="Average Hours"
              value={averageHours != null ? `${averageHours.toFixed(1)} hrs` : "N/A"}
              detail={
                gamesWithHours.length > 0
                  ? `Across ${gamesWithHours.length} completed games`
                  : "No completed playtimes recorded"
              }
            />
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Release timeline
              </p>
              <h2 className="mt-1 text-2xl font-bold">Games in release order</h2>
            </div>
            <p className="text-sm text-zinc-500">Unknown dates appear last.</p>
          </div>

          <div className="relative mt-7 space-y-5 before:absolute before:bottom-0 before:left-[19px] before:top-0 before:w-px before:bg-zinc-800 sm:before:left-[91px]">
            {timelineGames.map((game, index) => (
              <article
                key={game.id}
                className="relative grid grid-cols-[40px_1fr] gap-4 sm:grid-cols-[72px_18px_1fr] sm:gap-4"
              >
                <div className="hidden pt-5 text-right text-sm font-semibold text-zinc-500 sm:block">
                  {game.releaseDate ? game.releaseDate.getUTCFullYear() : "—"}
                </div>

                <div className="relative z-10 mt-5 h-10 w-10 rounded-full border-4 border-zinc-950 bg-zinc-700 text-center text-xs font-bold leading-8 text-zinc-200 sm:h-[18px] sm:w-[18px] sm:border-[3px] sm:leading-none">
                  <span className="sm:hidden">{index + 1}</span>
                </div>

                <Link
                  href={`/game/${game.id}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-600 hover:bg-zinc-900/80"
                >
                  <div className="grid sm:grid-cols-[110px_1fr]">
                    <div className="relative hidden aspect-[3/4] bg-zinc-800 sm:block">
                      {game.coverArtUrl ? (
                        <Image
                          src={game.coverArtUrl}
                          alt={`${game.title} cover art`}
                          fill
                          sizes="110px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                          No Cover
                        </div>
                      )}
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            {formatReleaseDate(game.releaseDate)}
                          </p>
                          <h3 className="mt-1 text-xl font-bold group-hover:text-emerald-300">
                            {game.title}
                          </h3>
                        </div>
                        <StatusBadge status={game.status} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        {game.platforms.map((platform) => (
                          <span key={platform} className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">
                            {platform}
                          </span>
                        ))}
                        {game.genres.slice(0, 3).map((genre) => (
                          <span key={genre} className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-400">
                            {genre}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-400">
                        <span>
                          Rating: {game.rating != null ? <RatingBadge rating={game.rating} /> : "N/A"}
                        </span>
                        <span>
                          Hours: {game.completedHours != null ? `${game.completedHours.toFixed(1)} hrs` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function OverviewCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function FeatureCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-h-40 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-4 text-3xl font-black">{value}</p>
      <p className="mt-3 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}

function GameFeatureCard({
  label,
  game,
}: {
  label: string;
  game?: { id: number; title: string; rating: number };
}) {
  if (!game) return <FeatureCard label={label} value="N/A" detail="No rated games" />;

  return (
    <Link
      href={`/game/${game.id}`}
      className="group min-h-40 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-600"
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-4 line-clamp-2 text-xl font-bold group-hover:text-emerald-300">
        {game.title}
      </p>
      <p className="mt-3 text-2xl font-black">{game.rating.toFixed(1)}/10</p>
    </Link>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    COMPLETED: "border-emerald-700 bg-emerald-950 text-emerald-300",
    PLAYING: "border-sky-700 bg-sky-950 text-sky-300",
    REPLAYING: "border-violet-700 bg-violet-950 text-violet-300",
    BACKLOG: "border-zinc-700 bg-zinc-800 text-zinc-300",
    DROPPED: "border-red-800 bg-red-950 text-red-300",
    ONHOLD: "border-amber-800 bg-amber-950 text-amber-300",
  };

  return (
    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
