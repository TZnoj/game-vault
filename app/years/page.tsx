import { prisma } from "@/lib/prisma";
import { YearComparisonDashboard } from "@/components/year-comparison/YearComparisonDashboard";

export const dynamic = "force-dynamic";

type CompletedEntry = {
  id: number;
  status: string;
  dateCompleted: Date | null;
  hoursPlayed: number | null;
  platform: { id: number; name: string } | null;
  game: {
    id: number;
    title: string;
    hltbMain: number | null;
    gameGenres: { genre: { id: number; name: string } }[];
  };
  reviews: {
    overallRating: number | null;
    reviewDate: Date | null;
  }[];
};

function calendarYear(date: Date) {
  return date.getUTCFullYear();
}

export default async function YearsPage() {
  const entries = (await prisma.userGame.findMany({
    where: {
      status: "COMPLETED",
      dateCompleted: { not: null },
    },
    include: {
      platform: true,
      game: {
        include: {
          gameGenres: { include: { genre: true } },
        },
      },
      reviews: {
        orderBy: [{ reviewDate: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
    orderBy: { dateCompleted: "asc" },
  })) as CompletedEntry[];

  // A title may exist as more than one physical/digital copy. Count it once per year.
  const uniqueByYearAndGame = new Map<string, CompletedEntry>();
  for (const entry of entries) {
    if (!entry.dateCompleted) continue;
    const year = calendarYear(entry.dateCompleted);
    const key = `${year}:${entry.game.id}`;
    const existing = uniqueByYearAndGame.get(key);

    // Prefer the copy with a review, then the copy with recorded hours.
    if (
      !existing ||
      (!existing.reviews[0] && entry.reviews[0]) ||
      (existing.hoursPlayed == null && entry.hoursPlayed != null)
    ) {
      uniqueByYearAndGame.set(key, entry);
    }
  }

  const data = [...uniqueByYearAndGame.values()].map((entry) => ({
    id: entry.id,
    gameId: entry.game.id,
    title: entry.game.title,
    dateCompleted: entry.dateCompleted!.toISOString(),
    hoursPlayed: entry.hoursPlayed,
    hltbMain: entry.game.hltbMain,
    overallRating: entry.reviews[0]?.overallRating ?? null,
    platform: entry.platform
      ? { id: entry.platform.id, name: entry.platform.name }
      : null,
    genres: entry.game.gameGenres.map(({ genre }) => ({
      id: genre.id,
      name: genre.name,
    })),
  }));

  return <YearComparisonDashboard entries={data} />;
}
