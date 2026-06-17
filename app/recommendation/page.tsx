import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TimeBucket = "Short" | "Medium" | "Long" | "Very Long" | "Unknown";

type RecommendationUserGame = {
  id: number;
  status: string;
  dateCompleted: Date | null;
  hoursPlayed: number | null;
  platform: {
    id: number;
    name: string;
  } | null;
  game: {
  id: number;
  title: string;
  coverArtUrl: string | null;
  hltbMain: number | null;
  isEndless: boolean;
  franchise: {
    id: number;
    name: string;
  } | null;
  gameGenres: {
    genre: {
      id: number;
      name: string;
    };
  }[];
};

type Recommendation = RecommendationUserGame & {
  score: number;
  baseScore: number;
  timeBucket: TimeBucket;
  reasons: string[];
};

function getTimeBucket(hours: number | null): TimeBucket {
  if (hours == null) return "Unknown";
  if (hours < 8) return "Short";
  if (hours <= 20) return "Medium";
  if (hours <= 40) return "Long";
  return "Very Long";
}

function getRandomJitter(score: number) {
  return score * (Math.random() * 0.1 - 0.05);
}

export default async function RecommendationsPage() {
  const userGames = (await prisma.userGame.findMany({
    include: {
      platform: true,
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
    },
    orderBy: {
      game: {
        title: "asc",
      },
    },
  })) as RecommendationUserGame[];

  const currentlyPlaying = userGames.filter(
    (userGame: RecommendationUserGame) => userGame.status === "PLAYING",
  );

  const recentlyCompleted = userGames
    .filter(
      (userGame: RecommendationUserGame) =>
        userGame.status === "COMPLETED" && userGame.dateCompleted != null,
    )
    .sort(
      (a: RecommendationUserGame, b: RecommendationUserGame) =>
        new Date(b.dateCompleted!).getTime() -
        new Date(a.dateCompleted!).getTime(),
    )
    .slice(0, 5);

  const referenceGames = [...currentlyPlaying, ...recentlyCompleted];

  const activePlatformIds = new Set(
    currentlyPlaying
      .map((userGame: RecommendationUserGame) => userGame.platform?.id ?? null)
      .filter(
        (platformId: number | null): platformId is number =>
          platformId != null,
      ),
  );

  const recentGenreIds = new Set(
    referenceGames.flatMap((userGame: RecommendationUserGame) =>
      userGame.game.gameGenres.map(
        (gameGenre: { genre: { id: number; name: string } }) =>
          gameGenre.genre.id,
      ),
    ),
  );

  const recentFranchiseIds = new Set(
    referenceGames
      .map(
        (userGame: RecommendationUserGame) =>
          userGame.game.franchise?.id ?? null,
      )
      .filter(
        (franchiseId: number | null): franchiseId is number =>
          franchiseId != null,
      ),
  );

  const currentTimeBuckets = new Set(
    currentlyPlaying
      .map((userGame: RecommendationUserGame) =>
        getTimeBucket(userGame.game.hltbMain),
      )
      .filter((bucket: TimeBucket) => bucket !== "Unknown"),
  );

  const playingMostlyShort =
    currentlyPlaying.length > 0 &&
    currentlyPlaying.every((userGame: RecommendationUserGame) => {
      const bucket = getTimeBucket(userGame.game.hltbMain);
      return bucket === "Short" || bucket === "Medium";
    });

  const playingMostlyLong =
    currentlyPlaying.length > 0 &&
    currentlyPlaying.some((userGame: RecommendationUserGame) => {
      const bucket = getTimeBucket(userGame.game.hltbMain);
      return bucket === "Long" || bucket === "Very Long";
    });

  const backlogGames = userGames.filter(
  (userGame: RecommendationUserGame) =>
    userGame.status === "BACKLOG" && !userGame.game.isEndless,
);

  const recommendations: Recommendation[] = backlogGames
    .map((userGame: RecommendationUserGame) => {
      let score = 0;
      const reasons: string[] = [];

      const platformId = userGame.platform?.id ?? null;
      const genreIds = userGame.game.gameGenres.map(
        (gameGenre: { genre: { id: number; name: string } }) =>
          gameGenre.genre.id,
      );
      const franchiseId = userGame.game.franchise?.id ?? null;
      const timeBucket = getTimeBucket(userGame.game.hltbMain);

      if (platformId != null && activePlatformIds.has(platformId)) {
        score -= 1000;
      } else {
        score += 50;
        reasons.push("Different platform from what you are currently playing");
      }

      const sharesRecentGenre = genreIds.some((genreId: number) =>
        recentGenreIds.has(genreId),
      );

      if (!sharesRecentGenre) {
        score += 25;
        reasons.push("Different genre from your current/recent games");
      } else {
        score -= 15;
      }

      if (franchiseId == null || !recentFranchiseIds.has(franchiseId)) {
        score += 25;
        reasons.push("Different franchise from your current/recent games");
      } else {
        score -= 20;
      }

      if (userGame.game.hltbMain != null) {
        score += 10;
        reasons.push("Has a known time estimate");
      }

      if (timeBucket !== "Unknown" && !currentTimeBuckets.has(timeBucket)) {
        score += 20;
        reasons.push(`Different length from what you are currently playing: ${timeBucket}`);
      } else if (timeBucket !== "Unknown") {
        score -= 10;
      }

      if (
        playingMostlyShort &&
        (timeBucket === "Long" || timeBucket === "Very Long")
      ) {
        score += 15;
        reasons.push("Longer game to balance your current shorter games");
      }

      if (
        playingMostlyLong &&
        (timeBucket === "Short" || timeBucket === "Medium")
      ) {
        score += 15;
        reasons.push("Shorter game to balance your current longer game");
      }

      if (userGame.game.hltbMain != null && userGame.game.hltbMain <= 20) {
        score += 5;
        reasons.push("Manageable length");
      }

      const baseScore = score;
      const finalScore = Math.round(score + getRandomJitter(score));

      return {
        ...userGame,
        score: finalScore,
        baseScore,
        timeBucket,
        reasons,
      };
    })
    .filter((recommendation: Recommendation) => recommendation.score > 0)
    .sort(
      (a: Recommendation, b: Recommendation) =>
        b.score - a.score || a.game.title.localeCompare(b.game.title),
    )
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Back to Library
        </Link>

        <h1 className="mt-4 text-4xl font-bold">What Should I Play Next?</h1>
        <p className="mt-2 max-w-3xl text-zinc-400">
          Three backlog picks that avoid platforms you are already playing on,
          while aiming for different genres, franchises, and game lengths from
          your current or recently completed games.
        </p>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Currently Playing" value={currentlyPlaying.length} />
        <StatCard label="Recent Games Compared" value={recentlyCompleted.length} />
        <StatCard label="Backlog Candidates" value={backlogGames.length} />
        <StatCard label="Recommendations" value={recommendations.length} />
      </section>

      {currentlyPlaying.length > 0 && (
        <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-xl font-bold">Currently Playing</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {currentlyPlaying.map((userGame: RecommendationUserGame) => (
              <span
                key={userGame.id}
                className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm text-zinc-300"
              >
                {userGame.game.title}
                {userGame.platform ? ` • ${userGame.platform.name}` : ""}
                {` • ${getTimeBucket(userGame.game.hltbMain)}`}
              </span>
            ))}
          </div>
        </section>
      )}

      {recommendations.length === 0 ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h2 className="text-2xl font-bold">No recommendations found</h2>
          <p className="mt-2 text-zinc-400">
            Try adding more backlog games or marking fewer games as currently
            playing.
          </p>
        </section>
      ) : (
        <section className="grid gap-6 md:grid-cols-3">
          {recommendations.map((recommendation: Recommendation, index: number) => {
            const genres = recommendation.game.gameGenres.map(
              (gameGenre: { genre: { name: string } }) => gameGenre.genre.name,
            );

            return (
              <Link
                key={recommendation.id}
                href={`/game/${recommendation.game.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg transition hover:-translate-y-1 hover:border-zinc-500"
              >
                <div className="relative aspect-[3/4] bg-zinc-800">
                  {recommendation.game.coverArtUrl ? (
                    <Image
                      src={recommendation.game.coverArtUrl}
                      alt={`${recommendation.game.title} cover art`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-500">
                      No Cover
                    </div>
                  )}

                  <div className="absolute left-3 top-3 rounded-full bg-zinc-950/90 px-3 py-1 text-sm font-bold">
                    #{index + 1}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h2 className="text-xl font-bold group-hover:text-white">
                    {recommendation.game.title}
                  </h2>

                  <div className="mt-2 space-y-1 text-sm text-zinc-400">
                    <p>{recommendation.platform?.name ?? "Unknown Platform"}</p>
                    <p>{genres.length > 0 ? genres.join(", ") : "Unknown Genre"}</p>
                    <p>{recommendation.game.franchise?.name ?? "No Franchise"}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <InfoBox
                      label="Estimate"
                      value={
                        recommendation.game.hltbMain != null
                          ? `${recommendation.game.hltbMain} hrs`
                          : "N/A"
                      }
                    />
                    <InfoBox label="Length" value={recommendation.timeBucket} />
                    <InfoBox label="Score" value={recommendation.score} />
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold text-zinc-300">
                      Why this pick:
                    </p>

                    <div className="space-y-1">
                      {recommendation.reasons.map((reason: string) => (
                        <p key={reason} className="text-sm text-zinc-400">
                          ✓ {reason}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-zinc-800 p-2">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}