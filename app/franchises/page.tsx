import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RatingBadge } from "@/components/RatingBadge";

type PageProps = {
  searchParams: Promise<{
    sort?: string;
    direction?: string;
  }>;
};

export default async function FranchisesPage({ searchParams }: PageProps) {
  const { sort = "averageRating", direction = "desc" } = await searchParams;
  const franchises = await prisma.franchise.findMany({
    where: {
      name: {
        not: "Standalone",
      },
      games: {
        some: {},
      },
    },
    include: {
      games: {
        include: {
          userGames: {
            include: {
              reviews: {
                orderBy: {
                  reviewDate: "desc",
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const rows = franchises
    .map((franchise) => {
      const userGames = franchise.games.flatMap((game) =>
        game.userGames.map((userGame) => ({
          ...userGame,
          game,
        })),
      );

      const completionEligibleGames = userGames.filter(
        (userGame) => !userGame.game.isEndless,
      );

      const completedGames = completionEligibleGames.filter(
        (userGame) => userGame.status === "COMPLETED",
      );

      const ratings = userGames
        .map((userGame) => userGame.reviews[0]?.overallRating)
        .filter((rating): rating is number => rating != null);

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : null;

      const totalHours = userGames.reduce(
        (sum, userGame) => sum + (userGame.hoursPlayed ?? 0),
        0,
      );

      const averageHours =
        userGames.length > 0 ? totalHours / userGames.length : null;

      const completionRate =
        completionEligibleGames.length > 0
          ? (completedGames.length / completionEligibleGames.length) * 100
          : 0;

      const highestRatedGame = [...userGames]
        .filter((userGame) => userGame.reviews[0]?.overallRating != null)
        .sort(
          (a, b) =>
            (b.reviews[0]?.overallRating ?? 0) -
            (a.reviews[0]?.overallRating ?? 0),
        )[0];

      const mostPlayedGame = [...userGames]
        .filter((userGame) => userGame.hoursPlayed != null)
        .sort((a, b) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0))[0];
        if (
  averageRating != null &&
  (averageRating < 0 || averageRating > 10)
) {
  console.log(
    franchise.name,
    averageRating,
    ratings,
  );
}

      return {
        id: franchise.id,
        name: franchise.name,
        games: franchise.games.length,
        copies: userGames.length,
        completed: completedGames.length,
        completionRate,
        averageRating,
        totalHours,
        averageHours,
        highestRatedGame,
        mostPlayedGame,
      };
    })
    .sort((a, b) => {
  let result = 0;

  if (sort === "averageRating") {
    result = (a.averageRating ?? -1) - (b.averageRating ?? -1);
  }

  if (sort === "completionRate") {
    result = a.completionRate - b.completionRate;
  }

  if (sort === "highestRating") {
    const aRating = a.highestRatedGame?.reviews[0]?.overallRating ?? -1;
    const bRating = b.highestRatedGame?.reviews[0]?.overallRating ?? -1;
    result = aRating - bRating;
  }

  if (sort === "games") {
    result = a.games - b.games;
  }

  return direction === "asc" ? result : -result;
});

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Back to Library
        </Link>

        <h1 className="mt-4 text-4xl font-bold">Franchises</h1>
        <p className="mt-2 text-zinc-400">
          Franchise rankings and collection stats.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Franchises" value={rows.length} />
        <StatCard
          label="Total Games"
          value={rows.reduce((sum, row) => sum + row.games, 0)}
        />
        <StatCard
          label="Total Copies"
          value={rows.reduce((sum, row) => sum + row.copies, 0)}
        />
        <StatCard
          label="Total Hours"
          value={`${rows
            .reduce((sum, row) => sum + row.totalHours, 0)
            .toFixed(1)} hrs`}
        />
      </section>
<section className="mt-8 flex flex-wrap gap-3">
  <SortLink sort="averageRating" label="Average Rating" currentSort={sort} direction={direction} />
  <SortLink sort="completionRate" label="Completion %" currentSort={sort} direction={direction} />
  <SortLink sort="highestRating" label="Highest Individual Rating" currentSort={sort} direction={direction} />
  <SortLink sort="games" label="Amount of Games" currentSort={sort} direction={direction} />
</section>
      <section className="mt-10 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="grid grid-cols-[56px_1.3fr_90px_110px_110px_110px_1fr_1fr] gap-4 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <span>Rank</span>
          <span>Franchise</span>
          <span>Games</span>
          <span>Completed</span>
          <span>Completion</span>
          <span>Rating</span>
          <span>Highest Rated</span>
          <span>Most Played</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {rows.map((row, index) => (
            <Link
              key={row.id}
              href={`/franchise/${row.id}`}
              className="grid grid-cols-[56px_1.3fr_90px_110px_110px_110px_1fr_1fr] items-center gap-4 px-4 py-4 hover:bg-zinc-800"
            >
              <span className="font-semibold text-zinc-400">#{index + 1}</span>

              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-zinc-500">
  {row.completed}/{row.games} completed • {row.totalHours.toFixed(1)} hrs
</p>
              </div>

              <span>{row.games}</span>
              <span>{row.completed}</span>
              <span>{row.completionRate.toFixed(1)}%</span>

              <span>
                {row.averageRating != null
  ? row.averageRating.toFixed(2)
  : "N/A"}
              </span>

              <span className="truncate text-sm text-zinc-300">
                {row.highestRatedGame
                  ? `${row.highestRatedGame.game.title} (${row.highestRatedGame.reviews[0]?.overallRating}/10)`
                  : "N/A"}
              </span>

              <span className="truncate text-sm text-zinc-300">
                {row.mostPlayedGame
                  ? `${row.mostPlayedGame.game.title} (${row.mostPlayedGame.hoursPlayed} hrs)`
                  : "N/A"}
              </span>
            </Link>
          ))}
        </div>
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
function SortLink({
  sort,
  label,
  currentSort,
  direction,
}: {
  sort: string;
  label: string;
  currentSort: string;
  direction: string;
}) {
  const isActive = currentSort === sort;
  const nextDirection = isActive && direction === "desc" ? "asc" : "desc";

  return (
    <Link
      href={`/franchises?sort=${sort}&direction=${nextDirection}`}
      className={`rounded-lg border px-4 py-2 text-sm ${
        isActive
          ? "border-zinc-400 bg-zinc-800 text-white"
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white"
      }`}
    >
      {label} {isActive ? (direction === "desc" ? "↓" : "↑") : ""}
    </Link>
  );
}