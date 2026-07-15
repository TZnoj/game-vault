import { prisma } from "@/lib/prisma";
import { TimelineDashboard } from "@/components/timeline/TimelineDashboard";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const [userGames, genres, franchises, platforms] = await Promise.all([
    prisma.userGame.findMany({
      include: {
        platform: true,
        reviews: {
          orderBy: { reviewDate: "desc" },
          take: 1,
        },
        game: {
          include: {
            franchise: true,
            gameGenres: {
              include: { genre: true },
            },
          },
        },
      },
      orderBy: [
        { dateCompleted: "desc" },
        { dateStarted: "desc" },
        { updatedAt: "desc" },
      ],
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.franchise.findMany({ orderBy: { name: "asc" } }),
    prisma.platform.findMany({ orderBy: { name: "asc" } }),
  ]);

  const entries = userGames.map((entry) => ({
    id: entry.id,
    status: entry.status,
    dateStarted: entry.dateStarted?.toISOString() ?? null,
    dateCompleted: entry.dateCompleted?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    hoursPlayed: entry.hoursPlayed,
    platform: entry.platform?.name ?? null,
    rating: entry.reviews[0]?.overallRating ?? null,
    game: {
      id: entry.game.id,
      title: entry.game.title,
      coverArtUrl: entry.game.coverArtUrl,
      franchise: entry.game.franchise?.name ?? null,
      genres: entry.game.gameGenres.map((item) => item.genre.name),
    },
  }));

  return (
    <TimelineDashboard
      entries={entries}
      genres={genres.map((item) => item.name)}
      franchises={franchises.map((item) => item.name)}
      platforms={platforms.map((item) => item.name)}
    />
  );
}
