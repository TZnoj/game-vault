import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RatingBadge } from "@/components/RatingBadge";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PlatformReview = {
  overallRating: number | null;
};

type PlatformGameGenre = {
  genre: {
    name: string;
  };
};

type PlatformUserGame = {
  id: number;
  status: string;
  hoursPlayed: number | null;
  game: {
    id: number;
    title: string;
    coverArtUrl: string | null;
    hltbMain: number | null;
    isEndless: boolean;
    franchise: {
      name: string;
    } | null;
    gameGenres: PlatformGameGenre[];
  };
  reviews: PlatformReview[];
};

type PlatformRanking = {
  id: number;
  name: string;
  userGames: {
    reviews: PlatformReview[];
  }[];
};

export default async function PlatformPage({ params }: PageProps) {
  const { id } = await params;
  const platformId = Number(id);

  if (!Number.isInteger(platformId)) {
    notFound();
  }

  const platform = await prisma.platform.findUnique({
    where: {
      id: platformId,
    },
    include: {
      userGames: {
        include: {
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
        orderBy: {
          game: {
            title: "asc",
          },
        },
      },
    },
  });

  if (!platform) {
    notFound();
  }
  const allPlatforms = await prisma.platform.findMany({
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

  const gamesOwned = platform.userGames.length;
  const completionEligibleGames = platform.userGames.filter(
  (userGame: PlatformUserGame) =>
    !userGame.game.isEndless &&
    !platform.userGames.some(
      (otherUserGame: PlatformUserGame) =>
        otherUserGame.game.id === userGame.game.id &&
        otherUserGame.status === "COMPLETED",
    ),
);

  const completedGames = completionEligibleGames.filter(
  (userGame: PlatformUserGame) => userGame.status === "COMPLETED",
);
  const backlogGames = completionEligibleGames.filter(
  (userGame: PlatformUserGame) => userGame.status !== "COMPLETED",
);
  const completionRate =
  completionEligibleGames.length > 0
    ? (completedGames.length / completionEligibleGames.length) * 100
    : 0;

  const hoursPlayed = completedGames.reduce(
  (sum: number, userGame: PlatformUserGame) =>
    sum + (userGame.hoursPlayed ?? 0),
  0,
);

  const backlogHours = backlogGames.reduce(
  (sum: number, userGame: PlatformUserGame) =>
    sum + (userGame.game.hltbMain ?? userGame.hoursPlayed ?? 0),
  0,
);

  const ratings = platform.userGames
  .map((userGame: PlatformUserGame) => userGame.reviews[0]?.overallRating)
  .filter(
  (rating: number | null): rating is number =>
    rating != null,
);

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length
      : null;

const platformRankings = (allPlatforms as unknown as PlatformRanking[])
  .map((platform: PlatformRanking) => {
    const ratings = platform.userGames
  .map(
    (userGame: { reviews: PlatformReview[] }) =>
      userGame.reviews[0]?.overallRating,
  )
  .filter(
    (rating: number | null): rating is number =>
      rating != null,
  );

    const average =
      ratings.length > 0
        ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length
        : null;

    return {
      id: platform.id,
      name: platform.name,
      gamesOwned: platform.userGames.length,
      average,
    };
  })
  .filter(
  (platform: {
    id: number;
    name: string;
    gamesOwned: number;
    average: number | null;
  }) =>
    platform.gamesOwned > 0 &&
    platform.average != null,
)
.sort(
  (
    a: { average: number | null },
    b: { average: number | null },
  ) => (b.average ?? 0) - (a.average ?? 0),
);

const platformRank =
  platformRankings.findIndex(
    (rankedPlatform: { id: number }) => rankedPlatform.id === platform.id,
  ) + 1; 

  const gamesWithHours = platform.userGames.filter(
  (userGame: PlatformUserGame) => userGame.hoursPlayed != null,
);

const averageHours =
  gamesWithHours.length > 0
    ? gamesWithHours.reduce(
        (sum: number, userGame: PlatformUserGame) => sum + (userGame.hoursPlayed ?? 0),
        0,
      ) / gamesWithHours.length
    : null;

const highestRatedGame = [...platform.userGames]
  .filter((userGame: PlatformUserGame) => userGame.reviews[0]?.overallRating != null)
  .sort(
    (a: PlatformUserGame, b: PlatformUserGame) =>
      (b.reviews[0]?.overallRating ?? 0) - (a.reviews[0]?.overallRating ?? 0),
  )[0];

const mostPlayedGame = [...platform.userGames]
  .filter((userGame: PlatformUserGame) => userGame.hoursPlayed != null)
  .sort((a: PlatformUserGame, b: PlatformUserGame) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0))[0];

  const topRatedGames = [...platform.userGames]
    .filter((userGame: PlatformUserGame) => userGame.reviews[0]?.overallRating != null)
    .sort(
      (a: PlatformUserGame, b: PlatformUserGame) =>
        (b.reviews[0]?.overallRating ?? 0) - (a.reviews[0]?.overallRating ?? 0),
    )
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8">
        <Link
          href="/platforms"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← Back to Platforms
        </Link>

        <h1 className="mt-4 text-4xl font-bold">{platform.name}</h1>
        <p className="mt-2 text-zinc-400">Platform collection overview.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
        <StatCard label="Games Owned" value={gamesOwned} />
        <StatCard label="Games Beaten" value={completedGames.length} />
        <StatCard
          label="Completion Rate"
          value={`${completionRate.toFixed(1)}%`}
        />
        <StatCard
          label="Average Rating"
          value={averageRating != null ? averageRating.toFixed(1) : "N/A"}
        />
        <StatCard label="Hours Played" value={hoursPlayed.toFixed(1)} />
        <StatCard label="Backlog Games" value={backlogGames.length} />
        <StatCard
          label="Backlog Hours"
          value={`${backlogHours.toFixed(1)} hrs`}
        />
        <StatCard
  label="Average Hours"
  value={averageHours != null ? `${averageHours.toFixed(1)} hrs` : "N/A"}
/>

<StatCard
  label="Highest Rated Game"
  value={highestRatedGame?.game.title ?? "N/A"}
/>

<StatCard
  label="Most Played Game"
  value={mostPlayedGame?.game.title ?? "N/A"}
/>
<StatCard
  label="Platform Rank"
  value={platformRank > 0 ? `#${platformRank}` : "N/A"}
/>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Panel title="Top Rated Games">
          <div className="space-y-3">
            {topRatedGames.map((userGame) => (
              <Link
                key={userGame.id}
                href={`/game/${userGame.game.id}`}
                className="flex items-center justify-between gap-6 border-b border-zinc-800 py-2 last:border-0 hover:text-white"
              >
                <span className="text-zinc-300">{userGame.game.title}</span>
                <RatingBadge rating={userGame.reviews[0]?.overallRating} compact />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Status Breakdown">
          <div className="space-y-3">
            {getStatusRows(platform.userGames).map((row) => (
              <div
                key={row.status}
                className="flex items-center justify-between gap-6 border-b border-zinc-800 py-2 last:border-0"
              >
                <span className="text-zinc-300">{row.status}</span>
                <span className="whitespace-nowrap font-semibold">
                  {row.count} games
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Games</h2>

        <div className="mt-4 grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {platform.userGames.map((userGame: PlatformUserGame) => {
            const review = userGame.reviews[0];
            const genres = userGame.game.gameGenres.map(
  (gameGenre: PlatformGameGenre) => gameGenre.genre.name,
);

            return (
              <Link
                key={userGame.id}
                href={`/game/${userGame.game.id}`}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg hover:border-zinc-600"
              >
                <div className="relative aspect-[3/4] bg-zinc-800">
                  {userGame.game.coverArtUrl ? (
                    <Image
                      src={userGame.game.coverArtUrl}
                      alt={`${userGame.game.title} cover art`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-500">
                      No Cover
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-3">
                  <h3 className="text-base font-semibold">
                    {userGame.game.title}
                  </h3>

                  <div className="mt-2 min-h-[2.5rem] text-xs text-zinc-400">
                    <p>{userGame.status}</p>
                    <p>
                      {genres.length > 0 ? genres.join(", ") : "Unknown Genre"}
                    </p>
                  </div>

                  <div className="mt-2 min-h-[1rem] text-xs text-zinc-500">
                    {userGame.game.franchise?.name ?? ""}
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-3 text-xs">
                    <InfoBox
                      label="Rating"
                      value={<RatingBadge rating={review?.overallRating} compact />}
                    />
                    <InfoBox
                      label="Hours"
                      value={
                        userGame.hoursPlayed != null
                          ? `${userGame.hoursPlayed} hrs`
                          : "N/A"
                      }
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function getStatusRows(
  userGames: {
    status: string;
  }[],
) {
  const counts = new Map<string, number>();

  for (const userGame of userGames) {
    counts.set(userGame.status, (counts.get(userGame.status) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([status, count]) => ({
      status,
      count,
    }))
    .sort((a, b) => b.count - a.count);
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
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-2">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
