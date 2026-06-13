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

type GameGenreWithGenre = {
  genreId: number;
  genre: {
    name: string;
  };
};

type GameReview = {
  overallRating: number | null;
};

type GameUserGame = {
  id: number;
  gameId: number;
  platformId: number | null;
  status: string;
  hoursPlayed: number | null;
  dateCompleted: Date | null;
  platform: {
    name: string;
  } | null;
  reviews: GameReview[];
};

type SimilarGame = {
  id: number;
  title: string;
  coverArtUrl: string | null;
  releaseDate: Date | null;
  franchiseId: number | null;
  gameGenres: GameGenreWithGenre[];
  userGames: GameUserGame[];
};

type SimilarGameResult = SimilarGame & {
  similarityScore: number;
  similarityReasons: string[];
};

export default async function GamePage({ params }: PageProps) {
  const { id } = await params;
  const gameId = Number(id);

  if (!Number.isInteger(gameId)) {
    notFound();
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      franchise: true,
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
  });

  if (!game) {
    notFound();
  }

  const typedGame = game as typeof game & {
    gameGenres: GameGenreWithGenre[];
    userGames: GameUserGame[];
  };

  const userGame = typedGame.userGames[0];
  const review = userGame?.reviews[0];

  const genres = typedGame.gameGenres.map(
    (gameGenre: GameGenreWithGenre) => gameGenre.genre.name,
  );

  const genreIds = typedGame.gameGenres.map(
    (gameGenre: GameGenreWithGenre) => gameGenre.genreId,
  );

  const previousGame = await prisma.game.findFirst({
    where: {
      id: {
        lt: typedGame.id,
      },
    },
    orderBy: {
      id: "desc",
    },
  });

  const nextGame = await prisma.game.findFirst({
    where: {
      id: {
        gt: typedGame.id,
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const candidateGames = await prisma.game.findMany({
    where: {
      id: {
        not: typedGame.id,
      },
    },
    include: {
      franchise: true,
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
  });

  const currentGenreIds = new Set(genreIds);

  const currentPlatformIds = new Set(
    typedGame.userGames
      .map((userGame: GameUserGame) => userGame.platformId)
      .filter((platformId): platformId is number => platformId != null),
  );

  const currentRating = review?.overallRating ?? null;

  const currentReleaseYear = typedGame.releaseDate
    ? new Date(typedGame.releaseDate).getFullYear()
    : null;

  const similarGames: SimilarGameResult[] = (candidateGames as SimilarGame[])
    .map((candidate: SimilarGame) => {
      const candidateUserGame = candidate.userGames[0];
      const candidateReview = candidateUserGame?.reviews[0];

      const candidateGenreIds = candidate.gameGenres.map(
        (gameGenre: GameGenreWithGenre) => gameGenre.genreId,
      );

      const sharedGenreCount = candidateGenreIds.filter((genreId: number) =>
        currentGenreIds.has(genreId),
      ).length;

      let score = 0;
      const reasons: string[] = [];

      const genrePercent =
        genreIds.length > 0 ? sharedGenreCount / genreIds.length : 0;

      score += genrePercent * 40;

      if (sharedGenreCount > 0) {
        reasons.push("Same Genre");
      }

      if (
        typedGame.franchiseId &&
        candidate.franchiseId &&
        typedGame.franchiseId === candidate.franchiseId
      ) {
        score += 30;
        reasons.push("Same Franchise");
      }

      const candidatePlatformIds = candidate.userGames
        .map((userGame: GameUserGame) => userGame.platformId)
        .filter((platformId): platformId is number => platformId != null);

      const hasSharedPlatform = candidatePlatformIds.some(
        (platformId: number) => currentPlatformIds.has(platformId),
      );

      if (hasSharedPlatform) {
        score += 15;
        reasons.push("Same Platform");
      }

      if (currentRating != null && candidateReview?.overallRating != null) {
        const ratingDifference = Math.abs(
          currentRating - candidateReview.overallRating,
        );

        const ratingScore = Math.max(0, 15 - ratingDifference * 3);

        score += ratingScore;

        if (ratingDifference <= 1) {
          reasons.push("Similar Rating");
        }
      }

      if (currentReleaseYear && candidate.releaseDate) {
        const releaseYearDifference = Math.abs(
          currentReleaseYear - new Date(candidate.releaseDate).getFullYear(),
        );

        if (releaseYearDifference <= 2) {
          score += 5;
        } else if (releaseYearDifference <= 5) {
          score += 3;
        } else if (releaseYearDifference <= 10) {
          score += 1;
        }
      }

      return {
        ...candidate,
        similarityScore: score,
        similarityReasons: reasons,
      };
    })
    .filter(
      (candidate: SimilarGameResult) => candidate.similarityScore >= 20,
    )
    .sort((a: SimilarGameResult, b: SimilarGameResult) => {
      if (b.similarityScore !== a.similarityScore) {
        return b.similarityScore - a.similarityScore;
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:border-zinc-400"
          >
            ← Library
          </Link>
          <Link
            href={`/admin/game/${game.id}`}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:border-zinc-400"
          >
            ⚙ Edit
          </Link>
        </div>

        <div className="flex gap-2">
          {previousGame && (
            <Link
              href={`/game/${previousGame.id}`}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:border-zinc-400"
            >
              ← Previous
            </Link>
          )}

          {nextGame && (
            <Link
              href={`/game/${nextGame.id}`}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:border-zinc-400"
            >
              Next →
            </Link>
          )}
        </div>
      </div>

      <section className="grid gap-8 lg:grid-cols-[160px_1fr]">
        <div className="w-[160px]">
          {game.coverArtUrl ? (
            <Image
              src={game.coverArtUrl}
              alt={`${game.title} cover art`}
              width={160}
              height={220}
              className="rounded-lg border border-zinc-800 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-[220px] w-[160px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800 text-zinc-500">
              No Cover
            </div>
          )}
        </div>

        <div>
          <h1 className="text-4xl font-bold">{game.title}</h1>

          <div className="mt-3 flex flex-wrap gap-2">
            {genres.length > 0 ? (
              genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300"
                >
                  {genre}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-500">
                Unknown Genre
              </span>
            )}
          </div>

          {game.franchise && (
            <div className="mt-3">
              <Link
                href={`/franchise/${game.franchise.id}`}
                className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-400 hover:text-white"
              >
                Franchise: {game.franchise.name}
              </Link>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="Status" value={userGame?.status ?? "N/A"} />
            <InfoCard
              label="Platform"
              value={userGame?.platform?.name ?? "N/A"}
            />
            <InfoCard
              label="Your Time"
              value={formatHours(userGame?.hoursPlayed ?? null)}
            />
            <InfoCard label="HLTB" value={formatHours(game.hltbMain)} />
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
  <div className="mb-4 flex items-center justify-between gap-4">
    <div>
      <h2 className="text-xl font-bold">Owned Copies</h2>
      <p className="mt-1 text-sm text-zinc-400">
        All copies of this game in your collection.
      </p>
    </div>

 
  </div>

  <div className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
    {game.userGames.map((copy) => {
  const copyReview = copy.reviews[0];

  return (
    <div
      key={copy.id}
      className="grid gap-4 px-4 py-3 sm:grid-cols-[1fr_120px_100px_100px_130px_80px]"
    >
      <div>
        <p className="font-semibold">
          {copy.platform?.name ?? "Unknown Platform"}
        </p>
        <p className="text-sm text-zinc-500">Copy #{copy.id}</p>
      </div>

      <div>
        <p className="text-xs text-zinc-500">Status</p>
        <p className="text-sm font-semibold">{copy.status}</p>
      </div>

      <div>
        <p className="text-xs text-zinc-500">Hours</p>
        <p className="text-sm font-semibold">
          {copy.hoursPlayed != null ? `${copy.hoursPlayed} hrs` : "N/A"}
        </p>
      </div>

      <div>
        <p className="text-xs text-zinc-500">Rating</p>
        <p className="text-sm font-semibold">
          {copyReview?.overallRating != null
            ? `${copyReview.overallRating}/10`
            : "N/A"}
        </p>
      </div>

      <div>
        <p className="text-xs text-zinc-500">Completed</p>
        <p className="text-sm font-semibold">
          {formatDateDisplay(copy.dateCompleted)}
        </p>
      </div>

      <div className="flex items-center justify-end">
        <Link
          href={`/admin/game/${copy.gameId}/copy/${copy.id}`}
          className="text-sm text-zinc-300 hover:text-white hover:underline"
        >
          Edit
        </Link>
      </div>
    </div>
  );
})}
  </div>
</section>
<InfoCard
  label="Overall Rating"
  value={<RatingBadge rating={review?.overallRating} compact />}
/>
            <InfoCard
              label="Metacritic Rating"
              value={game.metacriticScore ?? "N/A"}
            />
            <InfoCard
              label="Date Completed"
              value={formatDate(userGame?.dateCompleted ?? null)}
            />
            <InfoCard
              label="Release Date"
              value={formatDate(game.releaseDate)}
            />
          </div>

          {review && (
            <section className="mt-8">
              <h2 className="text-2xl font-bold">Rating Breakdown</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard
                  label="Gameplay"
                  value={formatRating(review.gameplayRating)}
                />
                <InfoCard
                  label="Story"
                  value={formatRating(review.storyRating)}
                />
                <InfoCard label="Art" value={formatRating(review.artRating)} />
                <InfoCard
                  label="Music"
                  value={formatRating(review.musicRating)}
                />
              </div>
            </section>
          )}

          {review?.notes && (
            <section className="mt-8">
              <h2 className="text-2xl font-bold">Notes</h2>
              <p className="mt-3 max-w-4xl rounded-xl border border-zinc-800 bg-zinc-900 p-4 leading-7 text-zinc-300">
                {review.notes}
              </p>
            </section>
          )}
        </div>
      </section>

      {similarGames.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Similar Games</h2>

          <div className="mt-4 flex flex-wrap justify-center lg:justify-start gap-4">
            {similarGames.map((similarGame) => (
              <Link
                key={similarGame.id}
                href={`/game/${similarGame.id}`}
                className="group flex w-24 flex-col items-center"
              >
                {similarGame.coverArtUrl ? (
                  <Image
                    src={similarGame.coverArtUrl}
                    alt={`${similarGame.title} cover art`}
                    width={96}
                    height={144}
                    className="h-36 w-24 rounded-md border border-zinc-800 object-cover shadow-md transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-36 w-24 items-center justify-center rounded-md border border-zinc-800 bg-zinc-800 text-xs text-zinc-500">
                    No Cover
                  </div>
                )}

                <p className="mt-2 w-full text-center text-xs font-semibold leading-tight text-zinc-300 group-hover:text-white">
                  {similarGame.title}
                </p>

                <div className="mt-1 flex flex-col items-center gap-1">
                  {similarGame.similarityReasons?.map((reason) => (
                    <span key={reason} className="text-[10px] text-zinc-500">
                      ✓ {reason}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatHours(hours: number | null) {
  return hours != null ? `${hours} hrs` : "N/A";
}

function formatRating(rating: number | null | undefined) {
  return rating != null ? `${rating}/10` : "N/A";
}

function formatDate(date: Date | string | null) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function formatDateDisplay(date: Date | string | null | undefined) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}