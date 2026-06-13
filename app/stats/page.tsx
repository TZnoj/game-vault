import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  CompletedByMonthChart,
  GenreBreakdownChart,
  RatingsDistributionChart,
} from "@/components/StatsCharts";
import { RatingBadge } from "@/components/RatingBadge";

export default async function StatsPage() {
const userGames = await prisma.userGame.findMany({
  include: {
    platform: true,
    game: {
      include: {
        franchise: true,
        gameGenres: {
          include: {
            genre: true,
          },
        },
      },
    },
    reviews: {
      orderBy: {
        reviewDate: "desc",
      },
    },
  },
});


  const completionEligibleGames = userGames.filter(
  (userGame) => !userGame.game.isEndless,
);
const completedGames = completionEligibleGames.filter(
  (game) => game.status === "COMPLETED",
);
  const inProgressGames = userGames.filter((game) => game.status === "PLAYING");
  const backlogGames = completionEligibleGames.filter(
  (game) => game.status === "BACKLOG",
);
  const onHoldGames = userGames.filter((game) => game.status === "ONHOLD");

  const totalHoursPlayed = completedGames.reduce(
    (sum, game) => sum + (game.hoursPlayed ?? 0),
    0,
  );

  const backlogHoursRemaining = backlogGames.reduce(
  (sum, userGame) =>
    sum + (userGame.game.hltbMain ?? userGame.hoursPlayed ?? 0),
  0
);

const completedGamesWithHours = completedGames.filter(
  (userGame) => userGame.hoursPlayed != null
);

const averageCompletionTime =
  completedGamesWithHours.length > 0
    ? completedGamesWithHours.reduce(
        (sum, userGame) => sum + (userGame.hoursPlayed ?? 0),
        0
      ) / completedGamesWithHours.length
    : null;

const reviewsWritten = userGames.filter(
  (userGame) => userGame.reviews.length > 0
).length;

const platformsPlayed = new Set(
  userGames
    .map((userGame) => userGame.platformId)
    .filter((platformId): platformId is number => platformId != null)
).size;

  const allRatings = userGames
    .map((game) => game.reviews[0]?.overallRating)
    .filter((rating): rating is number => rating != null);

  const averageRating =
    allRatings.length > 0
      ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
      : null;

const completionRate =
  completionEligibleGames.length > 0
    ? (completedGames.length / completionEligibleGames.length) * 100
    : 0;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const topRatedGames = userGames
    .filter((game) => {
      const rating = game.reviews[0]?.overallRating;
      const dateCompleted = game.dateCompleted
        ? new Date(game.dateCompleted)
        : null;

      return (
        rating != null && dateCompleted != null && dateCompleted >= oneYearAgo
      );
    })
    .sort(
      (a, b) =>
        (b.reviews[0]?.overallRating ?? 0) - (a.reviews[0]?.overallRating ?? 0),
    )
    .slice(0, 10);

  const completedByYear = new Map<number, number>();
  const hoursByYear = new Map<number, number>();
  const ratingsByYear = new Map<number, number[]>();

  const genreCounts = new Map<string, number>();
  const genreRatings = new Map<string, number[]>();

  for (const userGame of userGames) {
    if (userGame.status === "COMPLETED" && userGame.dateCompleted) {
      const year = new Date(userGame.dateCompleted).getFullYear();

      completedByYear.set(year, (completedByYear.get(year) ?? 0) + 1);
      hoursByYear.set(
        year,
        (hoursByYear.get(year) ?? 0) + (userGame.hoursPlayed ?? 0),
      );

      const rating = userGame.reviews[0]?.overallRating;
      if (rating != null) {
        ratingsByYear.set(year, [...(ratingsByYear.get(year) ?? []), rating]);
      }
    }

    if (userGame.status !== "BACKLOG") {
      const rating = userGame.reviews[0]?.overallRating ?? null;

      for (const gameGenre of userGame.game.gameGenres) {
        const genre = gameGenre.genre.name;

        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);

        if (rating != null) {
          genreRatings.set(genre, [...(genreRatings.get(genre) ?? []), rating]);
        }
      }
    }
  }

  const mostPlayedGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const averageRatingByGenre = [...genreRatings.entries()]
    .map(([genre, ratings]) => ({
      genre,
      average:
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
      count: ratings.length,
    }))
    .sort((a, b) => b.average - a.average);

  const years = [
    ...new Set([...completedByYear.keys(), ...hoursByYear.keys()]),
  ].sort((a, b) => a - b);

  const highestRatedGenre = averageRatingByGenre[0];
  const mostPlayedGenre = mostPlayedGenres[0];

  const franchiseStats = new Map<
    string,
    {
      id: number;
      games: number;
      completed: number;
      hours: number;
      ratings: number[];
    }
  >();

const isRealFranchise = (name: string) =>
  name.toLowerCase() !== "standalone";

  for (const userGame of userGames) {
    const franchise = userGame.game.franchise;
    if (!franchise) continue;

    const current = franchiseStats.get(franchise.name) ?? {
      id: franchise.id,
      games: 0,
      completed: 0,
      hours: 0,
      ratings: [],
    };

    current.games += 1;

    if (userGame.status === "COMPLETED") {
      current.completed += 1;
      current.hours += userGame.hoursPlayed ?? 0;
    }

    const rating = userGame.reviews[0]?.overallRating;
    if (rating != null) {
      current.ratings.push(rating);
    }

    franchiseStats.set(franchise.name, current);
  }

 const topFranchisesByGames = [...franchiseStats.entries()]
  .filter(([name, stats]) => isRealFranchise(name) && stats.games > 0)
  .sort((a, b) => b[1].games - a[1].games)
  .slice(0, 10);

const topFranchisesByHours = [...franchiseStats.entries()]
  .filter(([name, stats]) => isRealFranchise(name) && stats.hours > 0)
  .sort((a, b) => b[1].hours - a[1].hours)
  .slice(0, 10);

const highestRatedFranchises = [...franchiseStats.entries()]
  .filter(([name]) => isRealFranchise(name))
  .map(([name, stats]) => ({
    name,
    id: stats.id,
    average:
      stats.ratings.length > 0
        ? stats.ratings.reduce((sum, rating) => sum + rating, 0) /
          stats.ratings.length
        : null,
    count: stats.ratings.length,
  }))
  .filter((franchise) => franchise.average != null && franchise.count > 0)
  .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
  .slice(0, 10);

const mostCompletedFranchises = [...franchiseStats.entries()]
  .filter(([name, stats]) => isRealFranchise(name) && stats.completed > 0)
  .sort((a, b) => b[1].completed - a[1].completed)
  .slice(0, 10);

  const ratingDistribution = new Map<number, number>();

  for (const rating of allRatings) {
    const rounded = Math.floor(rating);
    ratingDistribution.set(rounded, (ratingDistribution.get(rounded) ?? 0) + 1);
  }

const platformStats = new Map<
  string,
  {
    id: number;
    games: number;
    completed: number;
    hours: number;
    ratings: number[];
  }
>();

for (const userGame of userGames) {
  const platform = userGame.platform;
  if (!platform) continue;

  const current = platformStats.get(platform.name) ?? {
    id: platform.id,
    games: 0,
    completed: 0,
    hours: 0,
    ratings: [],
  };

  current.games += 1;

  if (userGame.status === "COMPLETED") {
    current.completed += 1;
    current.hours += userGame.hoursPlayed ?? 0;
  }

  const rating = userGame.reviews[0]?.overallRating;
  if (rating != null) {
    current.ratings.push(rating);
  }

  platformStats.set(platform.name, current);
}

const topPlatformsByGames = [...platformStats.entries()]
  .filter(([, stats]) => stats.games > 0)
  .sort((a, b) => b[1].games - a[1].games)
  .slice(0, 10);

const highestRatedPlatforms = [...platformStats.entries()]
  .map(([name, stats]) => ({
    name,
    id: stats.id,
    average:
      stats.ratings.length > 0
        ? stats.ratings.reduce((sum, rating) => sum + rating, 0) /
          stats.ratings.length
        : null,
    count: stats.ratings.length,
  }))
  .filter((platform) => platform.average != null && platform.count > 0)
  .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
  .slice(0, 10);

const mostCompletedPlatforms = [...platformStats.entries()]
  .filter(([, stats]) => stats.completed > 0)
  .sort((a, b) => b[1].completed - a[1].completed)
  .slice(0, 10);

  const ratingRows = [...ratingDistribution.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rating, count]) => ({
      rating: String(rating),
      count,
    }));

  const completedByMonth = new Map<string, number>();

  for (const userGame of completedGames) {
    if (!userGame.dateCompleted) continue;

    const date = new Date(userGame.dateCompleted);
    const month = date.toLocaleDateString("en-CA", {
      month: "short",
    });

    completedByMonth.set(month, (completedByMonth.get(month) ?? 0) + 1);
  }

  const monthOrder = [
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

  const completedMonthRows = monthOrder
    .map((month) => ({
      month,
      count: completedByMonth.get(month) ?? 0,
    }))
    .filter((row) => row.count > 0);

  const totalGenreCount = mostPlayedGenres.reduce(
    (sum, [, count]) => sum + count,
    0,
  );

  const genreBreakdownRows = mostPlayedGenres.map(([genre, count]) => ({
    genre,
    count,
    percentage: totalGenreCount > 0 ? (count / totalGenreCount) * 100 : 0,
  }));

  return (
    <main className="min-h-screen bg-zinc-950 px-8 py-8 text-white">
      <div className="mt-6 mb-8">
        <h1 className="text-4xl font-bold">Stats Dashboard</h1>
        <p className="mt-2 text-zinc-400">
          A breakdown of your gaming history.
        </p>
      </div>

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
        <StatCard label="Total Games" value={userGames.length} />
        <StatCard label="Games Completed" value={completedGames.length} />
        <StatCard label="In Progress" value={inProgressGames.length} />
        <StatCard label="On Hold" value={onHoldGames.length} />
        <StatCard label="Backlog Size" value={backlogGames.length} />
        <StatCard label="Hours Played" value={totalHoursPlayed.toFixed(1)} />
        <StatCard
  label="Backlog Hours"
  value={`${backlogHoursRemaining.toFixed(1)} hrs`}
/>

<StatCard
  label="Avg Completion Time"
  value={
    averageCompletionTime != null
      ? `${averageCompletionTime.toFixed(1)} hrs`
      : "N/A"
  }
/>

<StatCard label="Reviews Written" value={reviewsWritten} />

<StatCard label="Platforms Played" value={platformsPlayed} />
        <StatCard
          label="Average Rating"
          value={averageRating != null ? averageRating.toFixed(1) : "N/A"}
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate.toFixed(1)}%`}
        />
        <StatCard
          label="Most Played Genre"
          value={mostPlayedGenre ? mostPlayedGenre[0] : "N/A"}
        />
        <StatCard
          label="Highest Rated Genre"
          value={highestRatedGenre ? highestRatedGenre.genre : "N/A"}
        />
      </section>

      <section className="mt-10 grid gap-6 2xl:grid-cols-3">
        <Panel title="Top 10 Rated Games - Last Year">
          <div className="space-y-3">
            {topRatedGames.map((userGame, index) => (
              <StatRow
                key={userGame.id}
                label={`${index + 1}. ${userGame.game.title}`}
                value={<RatingBadge rating={userGame.reviews[0]?.overallRating} compact />}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Most Played Genres">
          <div className="space-y-3">
            {mostPlayedGenres.map(([genre, count]) => (
              <GenreRow key={genre} genre={genre} value={`${count} games`} />
            ))}
          </div>
        </Panel>

        <Panel title="Average Rating By Genre">
          <div className="space-y-3">
            {averageRatingByGenre.map((item) => (
              <GenreRow
                key={item.genre}
                genre={item.genre}
                value={`${item.average.toFixed(1)}/10`}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Yearly Summary">
          <div className="space-y-3">
            {years.map((year) => {
              const ratings = ratingsByYear.get(year) ?? [];
              const average =
                ratings.length > 0
                  ? ratings.reduce((sum, rating) => sum + rating, 0) /
                    ratings.length
                  : null;

              return (
                <StatRow
                  key={year}
                  label={String(year)}
                  value={`${completedByYear.get(year) ?? 0} games • ${(
                    hoursByYear.get(year) ?? 0
                  ).toFixed(1)} hrs • ${
                    average != null ? average.toFixed(1) : "N/A"
                  } avg`}
                />
              );
            })}
          </div>
        </Panel>
      </section>
<section className="mt-10 grid gap-6 xl:grid-cols-3">
  <Panel title="Top Franchises By Games">
    <div className="space-y-3">
      {topFranchisesByGames.map(([name, stats]) => (
        <FranchiseRow
          key={name}
          id={stats.id}
          name={name}
          value={`${stats.games} games`}
        />
      ))}
    </div>
  </Panel>

  <Panel title="Highest Rated Franchises">
    <div className="space-y-3">
      {highestRatedFranchises.map((franchise) => (
        <FranchiseRow
          key={franchise.name}
          id={franchise.id}
          name={`${franchise.name} (${franchise.count})`}
          value={`${franchise.average?.toFixed(1)}/10`}
        />
      ))}
    </div>
  </Panel>

  <Panel title="Most Completed Franchises">
    <div className="space-y-3">
      {mostCompletedFranchises.map(([name, stats]) => (
        <FranchiseRow
          key={name}
          id={stats.id}
          name={name}
          value={`${stats.completed} completed`}
        />
      ))}
    </div>
  </Panel>
</section>
<section className="mt-10 grid gap-6 lg:grid-cols-3">
  <Panel title="Top Platforms By Games">
    <div className="space-y-3">
      {topPlatformsByGames.length > 0 ? (
        topPlatformsByGames.map(([name, stats]) => (
          <PlatformRow
            key={name}
            id={stats.id}
            name={name}
            value={`${stats.games} games`}
          />
        ))
      ) : (
        <EmptyState message="No platform data yet." />
      )}
    </div>
  </Panel>

  <Panel title="Highest Rated Platforms">
    <div className="space-y-3">
      {highestRatedPlatforms.length > 0 ? (
        highestRatedPlatforms.map((platform) => (
          <PlatformRow
            key={platform.name}
            id={platform.id}
            name={`${platform.name} (${platform.count})`}
            value={`${platform.average?.toFixed(1)}/10`}
          />
        ))
      ) : (
        <EmptyState message="No platform ratings yet." />
      )}
    </div>
  </Panel>

  <Panel title="Most Completed Platforms">
    <div className="space-y-3">
      {mostCompletedPlatforms.length > 0 ? (
        mostCompletedPlatforms.map(([name, stats]) => (
          <PlatformRow
            key={name}
            id={stats.id}
            name={name}
            value={`${stats.completed} completed`}
          />
        ))
      ) : (
        <EmptyState message="No completed platform data yet." />
      )}
    </div>
  </Panel>
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <RatingsDistributionChart data={ratingRows} />
        <CompletedByMonthChart data={completedMonthRows} />
        <GenreBreakdownChart data={genreBreakdownRows} />
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="h-full rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1 border-b border-zinc-800 last:border-0">
      <span className="text-zinc-300">{label}</span>
      <span className="whitespace-nowrap font-semibold">{value}</span>
    </div>
  );
}

function GenreRow({ genre, value }: { genre: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1 border-b border-zinc-800 last:border-0">
      <Link
        href={`/?genre=${encodeURIComponent(genre)}`}
        className="min-w-0 truncate text-zinc-300 hover:text-white hover:underline"
      >
        {genre}
      </Link>
      <span className="whitespace-nowrap font-semibold">{value}</span>
    </div>
  );
}
function FranchiseRow({
  id,
  name,
  value,
}: {
  id: number;
  name: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800 py-2 last:border-0">
      <Link
        href={`/franchise/${id}`}
        className="min-w-0 truncate text-zinc-300 hover:text-white hover:underline"
      >
        {name}
      </Link>
      <span className="whitespace-nowrap font-semibold">{value}</span>
    </div>
  );
}
function PlatformRow({
  id,
  name,
  value,
}: {
  id: number;
  name: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800 py-2 last:border-0">
      <Link
        href={`/platform/${id}`}
        className="min-w-0 truncate text-zinc-300 hover:text-white hover:underline"
      >
        {name}
      </Link>
      <span className="whitespace-nowrap font-semibold">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
      {message}
    </p>
  );
}