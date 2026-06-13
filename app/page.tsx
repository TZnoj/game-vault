import Link from "next/link";
import { GameLibrary } from "@/components/GameLibrary";
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

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const aRating = a.reviews[0]?.overallRating ?? -1;
    const bRating = b.reviews[0]?.overallRating ?? -1;

    if (aRating !== bRating) {
      return bRating - aRating;
    }

    const aDate = a.dateCompleted ? new Date(a.dateCompleted).getTime() : 0;
    const bDate = b.dateCompleted ? new Date(b.dateCompleted).getTime() : 0;

    return bDate - aDate;
  })
  .filter(
    (userGame, index, array) =>
      array.findIndex((item) => item.gameId === userGame.gameId) === index,
  );

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

      <GameLibrary
  userGames={catalogUserGames}
  initialGenre={genre ?? "ALL"}
  initialRating={rating ?? "ALL"}
  initialFranchise={franchise ?? "ALL"}
/>
    </main>
  );
}
