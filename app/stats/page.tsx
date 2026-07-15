import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DashboardGame = {
  id: number;
  status: string;
  dateStarted: Date | null;
  dateCompleted: Date | null;
  hoursPlayed: number | null;
  platform: { id: number; name: string } | null;
  game: {
    id: number;
    title: string;
    isEndless: boolean;
    franchise: { id: number; name: string } | null;
    gameGenres: { genre: { id: number; name: string } }[];
  };
  reviews: {
    overallRating: number | null;
    gameplayRating: number | null;
    storyRating: number | null;
    musicRating: number | null;
    artRating: number | null;
  }[];
};

type Aggregate = {
  games: number;
  completed: number;
  hours: number;
  ratings: number[];
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function formatNumber(value: number | null, digits = 1) {
  return value == null ? "N/A" : value.toFixed(digits);
}

function completionPercent(stats: Aggregate) {
  return stats.games > 0 ? (stats.completed / stats.games) * 100 : 0;
}

export default async function StatsPage() {
  const userGames = (await prisma.userGame.findMany({
    include: {
      platform: true,
      game: {
        include: {
          franchise: true,
          gameGenres: {
            include: { genre: true },
          },
        },
      },
      reviews: {
        orderBy: [{ reviewDate: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
  })) as DashboardGame[];

  const completed = userGames.filter((entry) => entry.status === "COMPLETED");
  const started = userGames.filter(
    (entry) => entry.dateStarted != null || entry.status !== "BACKLOG",
  );
  const dropped = userGames.filter((entry) => entry.status === "DROPPED");
  const backlog = userGames.filter((entry) => entry.status === "BACKLOG");
  const completionEligible = userGames.filter((entry) => !entry.game.isEndless);
  const completionRate =
    completionEligible.length > 0
      ? (completed.filter((entry) => !entry.game.isEndless).length /
          completionEligible.length) *
        100
      : 0;

  const ratings = userGames
    .map((entry) => entry.reviews[0])
    .filter((review): review is NonNullable<typeof review> => review != null);

  const overallRatings = ratings
    .map((review) => review.overallRating)
    .filter((value): value is number => value != null);
  const gameplayRatings = ratings
    .map((review) => review.gameplayRating)
    .filter((value): value is number => value != null);
  const storyRatings = ratings
    .map((review) => review.storyRating)
    .filter((value): value is number => value != null);
  const musicRatings = ratings
    .map((review) => review.musicRating)
    .filter((value): value is number => value != null);
  const artRatings = ratings
    .map((review) => review.artRating)
    .filter((value): value is number => value != null);

  const ratedGames = userGames
    .filter((entry) => entry.reviews[0]?.overallRating != null)
    .sort(
      (a, b) =>
        (b.reviews[0]?.overallRating ?? 0) -
        (a.reviews[0]?.overallRating ?? 0),
    );
  const highestRated = ratedGames[0] ?? null;
  const lowestRated = ratedGames.at(-1) ?? null;

  const ratingDistribution = Array.from({ length: 10 }, (_, index) => {
    const rating = 10 - index;
    const count = overallRatings.filter((value) =>
      rating === 10 ? value >= 10 : value >= rating && value < rating + 1,
    ).length;
    return { rating, count };
  });
  const maxRatingCount = Math.max(1, ...ratingDistribution.map((row) => row.count));

  const completedHours = completed
    .map((entry) => entry.hoursPlayed)
    .filter((value): value is number => value != null && value >= 0);
  const totalHours = completedHours.reduce((sum, value) => sum + value, 0);
  const gamesWithHours = completed
    .filter((entry) => entry.hoursPlayed != null)
    .sort((a, b) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0));
  const longest = gamesWithHours[0] ?? null;
  const shortest = gamesWithHours.at(-1) ?? null;

  const hoursByMonth = Array.from({ length: 12 }, () => 0);
  const hoursByYear = new Map<number, number>();
  for (const entry of completed) {
    if (!entry.dateCompleted || entry.hoursPlayed == null) continue;
    const date = new Date(entry.dateCompleted);
    hoursByMonth[date.getMonth()] += entry.hoursPlayed;
    hoursByYear.set(
      date.getFullYear(),
      (hoursByYear.get(date.getFullYear()) ?? 0) + entry.hoursPlayed,
    );
  }
  const maxMonthlyHours = Math.max(1, ...hoursByMonth);
  const yearRows = [...hoursByYear.entries()].sort((a, b) => b[0] - a[0]);
  const maxYearHours = Math.max(1, ...yearRows.map(([, hours]) => hours));

  const genreStats = new Map<string, Aggregate & { id: number }>();
  const platformStats = new Map<string, Aggregate & { id: number }>();
  const franchiseStats = new Map<string, Aggregate & { id: number }>();

  function addToAggregate(
    map: Map<string, Aggregate & { id: number }>,
    name: string,
    id: number,
    entry: DashboardGame,
  ) {
    const current = map.get(name) ?? {
      id,
      games: 0,
      completed: 0,
      hours: 0,
      ratings: [],
    };
    current.games += 1;
    if (entry.status === "COMPLETED") {
      current.completed += 1;
      current.hours += entry.hoursPlayed ?? 0;
    }
    const rating = entry.reviews[0]?.overallRating;
    if (rating != null) current.ratings.push(rating);
    map.set(name, current);
  }

  for (const entry of userGames) {
    for (const relation of entry.game.gameGenres) {
      addToAggregate(
        genreStats,
        relation.genre.name,
        relation.genre.id,
        entry,
      );
    }
    if (entry.platform) {
      addToAggregate(
        platformStats,
        entry.platform.name,
        entry.platform.id,
        entry,
      );
    }
    const franchise = entry.game.franchise;
    if (franchise && franchise.name.toLowerCase() !== "standalone") {
      addToAggregate(franchiseStats, franchise.name, franchise.id, entry);
    }
  }

  const genres = [...genreStats.entries()].sort(
    (a, b) => b[1].games - a[1].games || a[0].localeCompare(b[0]),
  );
  const platforms = [...platformStats.entries()].sort(
    (a, b) => b[1].games - a[1].games || a[0].localeCompare(b[0]),
  );
  const franchises = [...franchiseStats.entries()].sort(
    (a, b) => b[1].games - a[1].games || a[0].localeCompare(b[0]),
  );

  const highestRatedGenre = [...genres]
    .filter(([, stats]) => stats.ratings.length > 0)
    .sort(
      (a, b) =>
        (average(b[1].ratings) ?? 0) - (average(a[1].ratings) ?? 0) ||
        b[1].ratings.length - a[1].ratings.length,
    )[0];
  const topPlatform = platforms[0];
  const topFranchise = franchises[0];

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">
          Game Vault Analytics
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          Statistics Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-zinc-400">
          A complete view of your progress, ratings, playtime, genres,
          platforms, and franchises.
        </p>
      </header>

      <DashboardSection title="Completion Stats">
        <StatGrid>
          <StatCard label="Games Completed" value={completed.length} />
          <StatCard label="Games Started" value={started.length} />
          <StatCard label="Games Dropped" value={dropped.length} />
          <StatCard label="Backlog Size" value={backlog.length} />
          <StatCard
            label="Completion Rate"
            value={`${completionRate.toFixed(1)}%`}
            detail={`${completed.filter((entry) => !entry.game.isEndless).length} of ${completionEligible.length} eligible games`}
          />
        </StatGrid>
      </DashboardSection>

      <DashboardSection title="Ratings">
        <StatGrid>
          <StatCard label="Overall Average" value={formatNumber(average(overallRatings))} />
          <StatCard label="Gameplay Average" value={formatNumber(average(gameplayRatings))} />
          <StatCard label="Story Average" value={formatNumber(average(storyRatings))} />
          <StatCard label="Music Average" value={formatNumber(average(musicRatings))} />
          <StatCard label="Art Average" value={formatNumber(average(artRatings))} />
          <StatCard label="Median Rating" value={formatNumber(median(overallRatings))} />
          <GameStatCard label="Highest Rated" entry={highestRated} />
          <GameStatCard label="Lowest Rated" entry={lowestRated} />
        </StatGrid>

        <Panel title="Rating Distribution" className="mt-6">
          <div className="space-y-3">
            {ratingDistribution.map(({ rating, count }) => (
              <BarRow
                key={rating}
                label={String(rating)}
                value={count}
                width={(count / maxRatingCount) * 100}
              />
            ))}
          </div>
        </Panel>
      </DashboardSection>

      <DashboardSection title="Time">
        <StatGrid>
          <StatCard label="Total Hours" value={`${totalHours.toFixed(1)} hrs`} />
          <StatCard label="Average Hours" value={`${formatNumber(average(completedHours))} hrs`} />
          <StatCard label="Median Hours" value={`${formatNumber(median(completedHours))} hrs`} />
          <GameStatCard label="Longest Game" entry={longest} valueSuffix="hrs" valueField="hours" />
          <GameStatCard label="Shortest Game" entry={shortest} valueSuffix="hrs" valueField="hours" />
        </StatGrid>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="Hours Per Month">
            <div className="space-y-3">
              {MONTHS.map((month, index) => (
                <BarRow
                  key={month}
                  label={month}
                  value={`${hoursByMonth[index].toFixed(1)} hrs`}
                  width={(hoursByMonth[index] / maxMonthlyHours) * 100}
                />
              ))}
            </div>
          </Panel>
          <Panel title="Hours Per Year">
            <div className="space-y-3">
              {yearRows.length > 0 ? (
                yearRows.map(([year, hours]) => (
                  <BarRow
                    key={year}
                    label={String(year)}
                    value={`${hours.toFixed(1)} hrs`}
                    width={(hours / maxYearHours) * 100}
                  />
                ))
              ) : (
                <EmptyState message="No completed games with dated hours yet." />
              )}
            </div>
          </Panel>
        </div>
      </DashboardSection>

      <DashboardSection title="Genres">
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <StatCard
            label="Most Played"
            value={genres[0]?.[0] ?? "N/A"}
            detail={genres[0] ? `${genres[0][1].games} games` : undefined}
          />
          <StatCard
            label="Highest Rated"
            value={highestRatedGenre?.[0] ?? "N/A"}
            detail={
              highestRatedGenre
                ? `${formatNumber(average(highestRatedGenre[1].ratings))}/10 across ${highestRatedGenre[1].ratings.length} ratings`
                : undefined
            }
          />
        </div>
        <StatsTable
          headers={["Genre", "Games", "Completed", "Average Rating", "Average Hours", "Completion"]}
          rows={genres.map(([name, stats]) => [
            <Link key={name} href={`/?genre=${encodeURIComponent(name)}`} className="font-semibold hover:underline">{name}</Link>,
            stats.games,
            stats.completed,
            formatNumber(average(stats.ratings)),
            stats.completed > 0 ? `${(stats.hours / stats.completed).toFixed(1)} hrs` : "N/A",
            `${completionPercent(stats).toFixed(1)}%`,
          ])}
        />
      </DashboardSection>

      <DashboardSection title="Platforms">
        <div className="mb-6">
          <StatCard
            label="Top Platform"
            value={topPlatform?.[0] ?? "N/A"}
            detail={topPlatform ? `${topPlatform[1].games} games` : undefined}
          />
        </div>
        <StatsTable
          headers={["Platform", "Games", "Completed", "Average Rating", "Hours", "Completion"]}
          rows={platforms.map(([name, stats]) => [
            <Link key={name} href={`/platform/${stats.id}`} className="font-semibold hover:underline">{name}</Link>,
            stats.games,
            stats.completed,
            formatNumber(average(stats.ratings)),
            `${stats.hours.toFixed(1)} hrs`,
            `${completionPercent(stats).toFixed(1)}%`,
          ])}
        />
      </DashboardSection>

      <DashboardSection title="Franchises">
        <div className="mb-6">
          <StatCard
            label="Top Franchise"
            value={topFranchise?.[0] ?? "N/A"}
            detail={topFranchise ? `${topFranchise[1].games} games played` : undefined}
          />
        </div>
        <StatsTable
          headers={["Franchise", "Games Played", "Completed", "Completion", "Average Rating", "Hours"]}
          rows={franchises.map(([name, stats]) => [
            <Link key={name} href={`/franchise/${stats.id}`} className="font-semibold hover:underline">{name}</Link>,
            stats.games,
            stats.completed,
            `${completionPercent(stats).toFixed(1)}%`,
            formatNumber(average(stats.ratings)),
            `${stats.hours.toFixed(1)} hrs`,
          ])}
        />
      </DashboardSection>
    </main>
  );
}

function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-2xl font-black tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
      <p className="text-sm font-semibold text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-zinc-100">{value}</p>
      {detail ? <p className="mt-2 text-sm text-zinc-400">{detail}</p> : null}
    </div>
  );
}

function GameStatCard({
  label,
  entry,
  valueSuffix,
  valueField = "rating",
}: {
  label: string;
  entry: DashboardGame | null;
  valueSuffix?: string;
  valueField?: "rating" | "hours";
}) {
  if (!entry) return <StatCard label={label} value="N/A" />;
  const value =
    valueField === "hours"
      ? entry.hoursPlayed
      : entry.reviews[0]?.overallRating;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
      <p className="text-sm font-semibold text-zinc-500">{label}</p>
      <Link
        href={`/game/${entry.game.id}`}
        className="mt-2 block text-lg font-black text-zinc-100 hover:text-emerald-400 hover:underline"
      >
        {entry.game.title}
      </Link>
      <p className="mt-2 text-sm font-bold text-emerald-400">
        {value != null ? `${value.toFixed(1)}${valueSuffix ? ` ${valueSuffix}` : "/10"}` : "N/A"}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 ${className}`}>
      <h3 className="mb-5 text-xl font-black">{title}</h3>
      {children}
    </section>
  );
}

function BarRow({
  label,
  value,
  width,
}: {
  label: string;
  value: React.ReactNode;
  width: number;
}) {
  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
      <span className="font-semibold text-zinc-300">{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${Math.max(0, Math.min(100, width))}%` }}
        />
      </div>
      <span className="min-w-16 text-right text-sm font-bold text-zinc-300">{value}</span>
    </div>
  );
}

function StatsTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) return <EmptyState message="No data available yet." />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/80">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-zinc-800/80 last:border-0 hover:bg-zinc-800/30">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-4 py-3 text-zinc-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-700 p-5 text-sm text-zinc-500">
      {message}
    </p>
  );
}
