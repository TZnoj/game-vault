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

type FranchiseReview = {
  overallRating: number | null;
};

type FranchiseUserGame = {
  id: number;
  status: string;
  hoursPlayed: number | null;
  platform?: {
    name: string;
  } | null;
  reviews: FranchiseReview[];
};

type FranchiseGame = {
  id: number;
  title: string;
  coverArtUrl: string | null;
  isEndless: boolean;
  gameGenres: {
    genre: {
      name: string;
    };
  }[];
  userGames: FranchiseUserGame[];
};

type FranchiseUserGameWithGame = FranchiseUserGame & {
  game: FranchiseGame;
};

type FranchiseWithGames = {
  id: number;
  name: string;
  games: FranchiseGame[];
};

type FranchiseRankingGame = {
  userGames: FranchiseUserGame[];
};

type FranchiseRanking = {
  id: number;
  name: string;
  games: FranchiseRankingGame[];
};

export default async function FranchisePage({ params }: PageProps) {
  const { id } = await params;
  const franchiseId = Number(id);

  if (!Number.isInteger(franchiseId)) {
    notFound();
  }

  const franchise = await prisma.franchise.findUnique({
    where: {
      id: franchiseId,
    },
    include: {
      games: {
        include: {
          gameGenres: {
            include: {
              genre: true,
            },
          },
          userGames: {
            include: {
              platform: true,
              reviews: {
                orderBy: {
                  reviewDate: "desc",
                },
              },
            },
          },
        },
        orderBy: {
          title: "asc",
        },
      },
    },
  });

  if (!franchise) {
    notFound();
  }

  const allFranchises = await prisma.franchise.findMany({
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
});

  const userGames: FranchiseUserGameWithGame[] = (
  franchise as FranchiseWithGames
).games.flatMap((game: FranchiseGame) =>
  game.userGames.map((userGame: FranchiseUserGame) => ({
    ...userGame,
    game,
  })),
);

  const completionEligibleGames = userGames.filter(
  (userGame: FranchiseUserGameWithGame) => !userGame.game.isEndless,
);

const completedGames = completionEligibleGames.filter(
  (userGame: FranchiseUserGameWithGame) => userGame.status === "COMPLETED",
);

const totalHours = completedGames.reduce(
  (sum: number, userGame: FranchiseUserGameWithGame) =>
    sum + (userGame.hoursPlayed ?? 0),
  0,
);

  const ratings = userGames
    .map((userGame) => userGame.reviews[0]?.overallRating)
    .filter((rating): rating is number => rating != null);

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null;

const completionRate =
  completionEligibleGames.length > 0
    ? (completedGames.length / completionEligibleGames.length) * 100
    : 0;

const gamesWithHours = userGames.filter(
  (userGame) => userGame.hoursPlayed != null,
);

const averageHours =
  gamesWithHours.length > 0
    ? gamesWithHours.reduce(
        (sum, userGame) => sum + (userGame.hoursPlayed ?? 0),
        0,
      ) / gamesWithHours.length
    : null;

const mostPlayed = [...userGames]
  .filter((userGame: FranchiseUserGameWithGame) => userGame.hoursPlayed != null)
  .sort(
    (a: FranchiseUserGameWithGame, b: FranchiseUserGameWithGame) =>
      (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0),
  )[0];

const franchiseRankings = (allFranchises as unknown as FranchiseRanking[])
  .map((franchise: FranchiseRanking) => {
    const franchiseUserGames = franchise.games.flatMap(
      (game: FranchiseRankingGame) => game.userGames,
    );

    const ratings = franchiseUserGames
      .map((userGame: FranchiseUserGame) => userGame.reviews[0]?.overallRating)
      .filter((rating): rating is number => rating != null);

    const average =
      ratings.length > 0
        ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) /
          ratings.length
        : null;

    return {
      id: franchise.id,
      name: franchise.name,
      games: franchise.games.length,
      average,
    };
  })
  .filter(
    (franchise: { games: number; average: number | null }) =>
      franchise.games > 0 && franchise.average != null,
  )
  .sort(
    (
      a: { average: number | null },
      b: { average: number | null },
    ) => (b.average ?? 0) - (a.average ?? 0),
  );

const franchiseRank =
  franchiseRankings.findIndex(
    (rankedFranchise: { id: number }) => rankedFranchise.id === franchise.id,
  ) + 1;

const longestFranchiseRankings = (allFranchises as unknown as FranchiseRanking[])
  .map((franchise: FranchiseRanking) => {
    const franchiseUserGames = franchise.games.flatMap(
      (game: FranchiseRankingGame) => game.userGames,
    );

    const totalHours = franchiseUserGames.reduce(
      (sum: number, userGame: FranchiseUserGame) =>
        sum + (userGame.hoursPlayed ?? 0),
      0,
    );

    return {
      id: franchise.id,
      name: franchise.name,
      games: franchise.games.length,
      totalHours,
    };
  })
  .filter(
    (franchise: { games: number; totalHours: number }) =>
      franchise.games > 0 && franchise.totalHours > 0,
  )
  .sort(
    (
      a: { totalHours: number },
      b: { totalHours: number },
    ) => b.totalHours - a.totalHours,
  );

const longestFranchiseRank =
  longestFranchiseRankings.findIndex(
    (rankedFranchise: { id: number }) => rankedFranchise.id === franchise.id,
  ) + 1;

const highestRated = [...userGames]
  .filter(
    (userGame: FranchiseUserGameWithGame) =>
      userGame.reviews[0]?.overallRating != null,
  )
  .sort(
    (a: FranchiseUserGameWithGame, b: FranchiseUserGameWithGame) =>
      (b.reviews[0]?.overallRating ?? 0) -
      (a.reviews[0]?.overallRating ?? 0),
  )[0];

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8 flex items-center gap-3"></div>

      <h1 className="text-4xl font-bold">{franchise.name}</h1>
      <p className="mt-2 text-zinc-400">Franchise overview</p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
        <StatCard label="Games" value={franchise.games.length} />
        <StatCard label="Completed" value={completedGames.length} />
        <StatCard label="Hours Played" value={totalHours.toFixed(1)} />
        <StatCard
          label="Average Rating"
          value={averageRating != null ? averageRating.toFixed(1) : "N/A"}
        />
        <StatCard
          label="Highest Rated"
          value={
            highestRated
              ? `${highestRated.game.title} - ${highestRated.reviews[0]?.overallRating}/10`
              : "N/A"
          }
        />
        <StatCard
  label="Completion Rate"
  value={`${completionRate.toFixed(1)}%`}
/>

<StatCard
  label="Average Hours"
  value={averageHours != null ? `${averageHours.toFixed(1)} hrs` : "N/A"}
/>

<StatCard
  label="Most Played"
  value={
    mostPlayed
      ? `${mostPlayed.game.title} - ${mostPlayed.hoursPlayed} hrs`
      : "N/A"
  }
/>
<StatCard
  label="Franchise Rank"
  value={franchiseRank > 0 ? `#${franchiseRank}` : "N/A"}
/>

<StatCard
  label="Longest Franchise Rank"
  value={longestFranchiseRank > 0 ? `#${longestFranchiseRank}` : "N/A"}
/>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Games</h2>

        <div className="mt-4 grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {(franchise as FranchiseWithGames).games.map((game: FranchiseGame) => {
            const userGame = game.userGames[0];
            const review = userGame?.reviews[0];
            const genres = game.gameGenres.map(
  (gameGenre: { genre: { name: string } }) => gameGenre.genre.name,
);

            return (
              <Link
                key={game.id}
                href={`/game/${game.id}`}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg hover:border-zinc-600"
              >
                <div className="relative aspect-[3/4] bg-zinc-800">
                  {game.coverArtUrl ? (
                    <Image
                      src={game.coverArtUrl}
                      alt={`${game.title} cover art`}
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

                <div className="space-y-2 p-3">
                  <h3 className="text-base font-semibold">{game.title}</h3>

                  <p className="text-xs text-zinc-400">
                    {userGame?.platform?.name ?? "Unknown Platform"} •{" "}
                    {userGame?.status ?? "N/A"}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {genres.length > 0 ? genres.join(", ") : "Unknown Genre"}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <InfoBox
                      label="Hours"
                      value={
                        userGame?.hoursPlayed != null
                          ? `${userGame.hoursPlayed} hrs`
                          : "N/A"
                      }
                    />
                    <InfoBox
                      label="Rating"
                      value={<RatingBadge rating={review?.overallRating} compact />}
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
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
