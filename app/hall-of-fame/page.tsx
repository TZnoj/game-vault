import { prisma } from "@/lib/prisma";
import { HallOfFameDashboard } from "@/components/hall-of-fame/HallOfFameDashboard";

export const dynamic = "force-dynamic";

type ReviewShape = {
  overallRating: number | null;
  storyRating: number | null;
  musicRating: number | null;
  gameplayRating: number | null;
  artRating: number | null;
  reviewDate: Date | null;
  id: number;
};

function latestReview(reviews: ReviewShape[]) {
  return [...reviews].sort((a, b) => {
    const aTime = a.reviewDate?.getTime() ?? a.id;
    const bTime = b.reviewDate?.getTime() ?? b.id;
    return bTime - aTime;
  })[0] ?? null;
}

export default async function HallOfFamePage() {
  const games = await prisma.game.findMany({
    include: {
      franchise: true,
      gameGenres: { include: { genre: true } },
      gamePlatforms: { include: { platform: true } },
      userGames: {
        include: {
          platform: true,
          reviews: true,
        },
      },
    },
    orderBy: { title: "asc" },
  });

  const entries = games
    .map((game) => {
      const completedCopies = game.userGames.filter(
        (copy) => copy.status === "COMPLETED",
      );
      const reviewCandidates = game.userGames.flatMap((copy) =>
        copy.reviews.map((review) => ({ review, copy })),
      );
      const selected = reviewCandidates
        .sort((a, b) => {
          const aTime = a.review.reviewDate?.getTime() ?? a.review.id;
          const bTime = b.review.reviewDate?.getTime() ?? b.review.id;
          return bTime - aTime;
        })
        .find(({ review }) => review.overallRating != null);

      if (!selected?.review.overallRating) return null;

      const review = latestReview(selected.copy.reviews) ?? selected.review;
      const platformNames = Array.from(
        new Set([
          ...game.userGames.map((copy) => copy.platform?.name).filter(Boolean),
          ...game.gamePlatforms.map((item) => item.platform.name),
        ] as string[]),
      );
      const hours = completedCopies
        .map((copy) => copy.hoursPlayed)
        .filter((value): value is number => typeof value === "number" && value > 0)
        .sort((a, b) => b - a)[0] ?? null;

      return {
        id: game.id,
        slug: game.slug,
        title: game.title,
        coverArtUrl: game.metadataOverride?.coverArtUrl ?? game.coverArtUrl,
        releaseDate: game.metadataOverride?.manualReleaseDate?.toISOString() ?? game.releaseDate?.toISOString() ?? null,
        overallRating: selected.review.overallRating,
        storyRating: review.storyRating,
        musicRating: review.musicRating,
        gameplayRating: review.gameplayRating,
        artRating: review.artRating,
        hours,
        genres: game.gameGenres.map((item) => item.genre.name),
        platforms: platformNames,
        franchise:
          game.franchise && game.franchise.name.toLowerCase() !== "standalone"
            ? game.franchise.name
            : null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return <HallOfFameDashboard entries={entries} />;
}
