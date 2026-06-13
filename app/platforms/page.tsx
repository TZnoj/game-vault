import Link from "next/link";
import { prisma } from "@/lib/prisma";

type PlatformListUserGame = {
  status: string;
  hoursPlayed: number | null;
  game: {
    hltbMain: number | null;
  };
  reviews: {
    overallRating: number | null;
  }[];
};

type PlatformListItem = {
  id: number;
  name: string;
  userGames: PlatformListUserGame[];
};

type PlatformStat = {
  id: number;
  name: string;
  gamesOwned: number;
  gamesCompleted: number;
  completionRate: number;
  hoursPlayed: number;
  backlogHours: number;
  averageRating: number | null;
};

export default async function PlatformsPage() {
  const platforms = await prisma.platform.findMany({
    orderBy: {
      name: "asc",
    },
      where: {
    userGames: {
      some: {},
    },
  },
    include: {
      userGames: {
        include: {
          game: true,
          reviews: {
            orderBy: {
              reviewDate: "desc",
            },
          },
        },
      },
    },
  });

  const platformStats: PlatformStat[] = (platforms as PlatformListItem[]).map(
  (platform: PlatformListItem) => {
    const gamesOwned = platform.userGames.length;

    const gamesCompleted = platform.userGames.filter(
      (userGame: PlatformListUserGame) => userGame.status === "COMPLETED",
    ).length;

    const completionRate =
      gamesOwned > 0 ? (gamesCompleted / gamesOwned) * 100 : 0;

    const hoursPlayed = platform.userGames
      .filter((userGame: PlatformListUserGame) => userGame.status === "COMPLETED")
      .reduce((sum, userGame: PlatformListUserGame) => sum + (userGame.hoursPlayed ?? 0), 0);

    const backlogHours = platform.userGames
      .filter((userGame: PlatformListUserGame) => userGame.status !== "COMPLETED")
      .reduce(
        (sum, userGame: PlatformListUserGame) =>
          sum + (userGame.game.hltbMain ?? userGame.hoursPlayed ?? 0),
        0,
      );

    const ratings = platform.userGames
      .map((userGame: PlatformListUserGame) => userGame.reviews[0]?.overallRating)
      .filter((rating: number | null): rating is number => rating != null);

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, rating: number) => sum + rating, 0) / ratings.length
        : null;

    return {
      id: platform.id,
      name: platform.name,
      gamesOwned,
      gamesCompleted,
      completionRate,
      hoursPlayed,
      backlogHours,
      averageRating,
    };
    },
);

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Platforms</h1>
        <p className="mt-2 text-zinc-400">
          Collection stats by console and platform.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {platformStats.map((platform) => (
          <Link
            key={platform.id}
            href={`/platform/${platform.id}`}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-500"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{platform.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {platform.gamesOwned} games owned
                </p>
              </div>

              <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                {platform.completionRate.toFixed(0)}%
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <MiniStat label="Beaten" value={platform.gamesCompleted} />
              <MiniStat
                label="Rating"
                value={
                  platform.averageRating != null
                    ? platform.averageRating.toFixed(1)
                    : "N/A"
                }
              />
              <MiniStat label="Hours" value={platform.hoursPlayed.toFixed(1)} />
              <MiniStat
                label="Backlog"
                value={`${platform.backlogHours.toFixed(1)} hrs`}
              />
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
