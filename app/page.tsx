import Link from "next/link";
import { GameLibrary } from "@/components/GameLibrary";
import { HomeDashboard } from "@/components/HomeDashboard";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{
    genre?: string;
    rating?: string;
    franchise?: string;
  }>;
};

function getCopyPriority(userGame: {
  status: string;
  dateCompleted: Date | null;
  reviews: { overallRating: number | null }[];
}) {
  if (userGame.status === "COMPLETED") return 5;
  if (userGame.status === "PLAYING") return 4;
  if (userGame.status === "REPLAYING") return 3;
  if (userGame.status === "ONHOLD") return 2;
  if (userGame.status === "BACKLOG") return 1;
  return 0;
}

export default async function Home({ searchParams }: PageProps) {
  const { genre, rating, franchise } = await searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const startOfNextYear = new Date(currentYear + 1, 0, 1);

  const userGames = await prisma.userGame.findMany({
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
      platform: true,
      reviews: {
        orderBy: {
          reviewDate: "desc",
        },
      },
    },
    orderBy: {
      dateCompleted: "desc",
    },
  });

  const catalogUserGames = [...userGames]
    .sort((a, b) => {
      const priorityDifference = getCopyPriority(b) - getCopyPriority(a);

      if (priorityDifference !== 0) return priorityDifference;

      const aRating = a.reviews[0]?.overallRating ?? -1;
      const bRating = b.reviews[0]?.overallRating ?? -1;

      if (aRating !== bRating) return bRating - aRating;

      const aDate = a.dateCompleted ? new Date(a.dateCompleted).getTime() : 0;
      const bDate = b.dateCompleted ? new Date(b.dateCompleted).getTime() : 0;

      return bDate - aDate;
    })
    .filter(
      (userGame, index, array) =>
        array.findIndex((item) => item.gameId === userGame.gameId) === index,
    );

  const recentGames = [...catalogUserGames]
    .map((userGame) => {
      const latestReview = userGame.reviews[0];
      const reviewDate = latestReview?.reviewDate
        ? new Date(latestReview.reviewDate)
        : null;
      const userGameUpdatedAt = new Date(userGame.updatedAt);
      const gameUpdatedAt = new Date(userGame.game.updatedAt);
      const updatedAt = [reviewDate, userGameUpdatedAt, gameUpdatedAt]
        .filter((date): date is Date => date != null)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        id: userGame.game.id,
        title: userGame.game.title,
        coverArtUrl: userGame.game.coverArtUrl,
        activity: getActivityLabel(userGame.status, reviewDate, updatedAt),
        updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10);

  const latestReviews = catalogUserGames
    .map((userGame) => ({
      game: userGame.game.title,
      review: userGame.reviews[0],
    }))
    .filter(
      (entry): entry is typeof entry & { review: NonNullable<typeof entry.review> } =>
        entry.review != null,
    );

  const overallRatings = latestReviews
    .filter((entry) => entry.review.overallRating != null)
    .map((entry) => ({ game: entry.game, value: entry.review.overallRating! }));

  const playedWithHours = catalogUserGames.filter(
    (userGame) => userGame.hoursPlayed != null && userGame.hoursPlayed > 0,
  );

  const completedThisYear = catalogUserGames.filter(
    (userGame) =>
      userGame.status === "COMPLETED" &&
      userGame.dateCompleted != null &&
      userGame.dateCompleted >= startOfYear &&
      userGame.dateCompleted < startOfNextYear,
  );

  const startedThisYear = catalogUserGames.filter(
    (userGame) =>
      userGame.dateStarted != null &&
      userGame.dateStarted >= startOfYear &&
      userGame.dateStarted < startOfNextYear,
  );

  const highestRated = [...overallRatings].sort((a, b) => b.value - a.value)[0];
  const lowestRated = [...overallRatings].sort((a, b) => a.value - b.value)[0];
  const longestGame = [...playedWithHours].sort(
    (a, b) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0),
  )[0];
  const shortestGame = [...playedWithHours].sort(
    (a, b) => (a.hoursPlayed ?? 0) - (b.hoursPlayed ?? 0),
  )[0];

  const groups = [
    {
      title: "Collection",
      stats: [
        { label: "Total Games", value: catalogUserGames.length },
        { label: "Completed", value: countStatus(catalogUserGames, "COMPLETED") },
        { label: "Playing", value: countStatus(catalogUserGames, "PLAYING") },
        { label: "Backlog", value: countStatus(catalogUserGames, "BACKLOG") },
        { label: "Dropped", value: countStatus(catalogUserGames, "DROPPED") },
      ],
    },
    {
      title: "Ratings",
      stats: [
        { label: "Average Rating", value: formatAverage(overallRatings.map((item) => item.value)) },
        { label: "Highest Rated", value: highestRated ? `${highestRated.value}/10` : "N/A", detail: highestRated?.game },
        { label: "Lowest Rated", value: lowestRated ? `${lowestRated.value}/10` : "N/A", detail: lowestRated?.game },
        { label: "Average Gameplay", value: formatAverage(latestReviews.map((item) => item.review.gameplayRating)) },
        { label: "Average Story", value: formatAverage(latestReviews.map((item) => item.review.storyRating)) },
        { label: "Average Music", value: formatAverage(latestReviews.map((item) => item.review.musicRating)) },
        { label: "Average Art", value: formatAverage(latestReviews.map((item) => item.review.artRating)) },
      ],
    },
    {
      title: "Time",
      stats: [
        { label: "Hours Played", value: formatHours(sumHours(catalogUserGames)) },
        { label: "Average Game Length", value: playedWithHours.length ? formatHours(sumHours(playedWithHours) / playedWithHours.length) : "N/A" },
        { label: "Longest Game", value: longestGame ? formatHours(longestGame.hoursPlayed ?? 0) : "N/A", detail: longestGame?.game.title },
        { label: "Shortest Game", value: shortestGame ? formatHours(shortestGame.hoursPlayed ?? 0) : "N/A", detail: shortestGame?.game.title },
        { label: `Hours in ${currentYear}`, value: formatHours(sumHours(completedThisYear)) },
      ],
    },
    {
      title: "Library",
      stats: [
        { label: "Platforms Owned", value: new Set(catalogUserGames.map((game) => game.platform?.name).filter(Boolean)).size },
        { label: "Genres Played", value: new Set(catalogUserGames.flatMap((game) => game.game.gameGenres.map((entry) => entry.genre.name))).size },
        { label: "Franchises", value: new Set(catalogUserGames.map((game) => game.game.franchise?.name).filter(Boolean)).size },
        { label: `Started in ${currentYear}`, value: startedThisYear.length },
        { label: `Completed in ${currentYear}`, value: completedThisYear.length },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="flex items-center justify-between px-8 pt-6">
        <h1 className="text-3xl font-bold">Game Vault</h1>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/admin"
            title="Admin"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-600 hover:border-zinc-600 hover:text-zinc-300"
          >
            ⚙
          </Link>
        </div>
      </div>

      <HomeDashboard recentGames={recentGames} groups={groups} />

      <GameLibrary
        userGames={catalogUserGames}
        initialGenre={genre ?? "ALL"}
        initialRating={rating ?? "ALL"}
        initialFranchise={franchise ?? "ALL"}
        showSummaryStats={false}
      />
    </main>
  );
}

function getActivityLabel(
  status: string,
  reviewDate: Date | null,
  latestDate: Date,
) {
  if (reviewDate && reviewDate.getTime() === latestDate.getTime()) {
    return "Review updated";
  }

  if (status === "COMPLETED") return "Completed";
  if (status === "PLAYING") return "Now playing";
  if (status === "REPLAYING") return "Replaying";
  if (status === "BACKLOG") return "Backlog updated";
  if (status === "DROPPED") return "Marked dropped";
  if (status === "ONHOLD") return "Placed on hold";
  return "Game updated";
}

function countStatus<T extends { status: string }>(games: T[], status: string) {
  return games.filter((game) => game.status === status).length;
}

function formatAverage(values: (number | null | undefined)[]) {
  const valid = values.filter((value): value is number => value != null);
  if (valid.length === 0) return "N/A";
  return `${(valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1)}/10`;
}

function sumHours(games: { hoursPlayed: number | null }[]) {
  return games.reduce((sum, game) => sum + (game.hoursPlayed ?? 0), 0);
}

function formatHours(hours: number) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hrs`;
}
