import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{
    genre?: string;
    franchise?: string;
    platform?: string;
    rating?: string;
  }>;
};

type TimelineUserGame = {
  id: number;
  hoursPlayed: number | null;
  dateCompleted: Date | null;
  platform: {
    name: string;
  } | null;
  reviews: {
    overallRating: number | null;
  }[];
  game: {
    id: number;
    title: string;
    coverArtUrl: string | null;
    franchise: {
      name: string;
    } | null;
    gameGenres: {
      genre: {
        name: string;
      };
    }[];
  };
};

type SelectOption = {
  id: number;
  name: string;
};

export default async function TimelinePage({ searchParams }: PageProps) {
  const { genre, franchise, platform, rating } = await searchParams;
  const completedGames = await prisma.userGame.findMany({
    where: {
      status: "COMPLETED",
      dateCompleted: {
        not: null,
      },
      platform:
        platform && platform !== "ALL"
          ? {
              name: platform,
            }
          : undefined,
      game: {
        franchise:
          franchise && franchise !== "ALL"
            ? {
                name: franchise,
              }
            : undefined,
        gameGenres:
          genre && genre !== "ALL"
            ? {
                some: {
                  genre: {
                    name: genre,
                  },
                },
              }
            : undefined,
      },
    },
    include: {
      platform: true,
      reviews: {
        orderBy: {
          reviewDate: "desc",
        },
      },
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
      dateCompleted: "desc",
    },
  });

  const filteredGames =
    rating && rating !== "ALL"
      ? completedGames.filter((userGame) => {
          const overallRating = userGame.reviews[0]?.overallRating;

          return (
            overallRating != null &&
            Math.floor(overallRating) === Number(rating)
          );
        })
      : completedGames;
  const grouped = new Map<string, Map<string, typeof filteredGames>>();

  for (const userGame of filteredGames) {
    if (!userGame.dateCompleted) continue;

    const date = new Date(userGame.dateCompleted);
    const year = String(date.getFullYear());
    const month = date.toLocaleDateString("en-CA", {
      month: "long",
    });

    if (!grouped.has(year)) {
      grouped.set(year, new Map());
    }

    const months = grouped.get(year)!;

    if (!months.has(month)) {
      months.set(month, []);
    }

    months.get(month)!.push(userGame);
  }

  const years = [...grouped.entries()];

  const allGenres = await prisma.genre.findMany({
    orderBy: {
      name: "asc",
    },
  });

  const allFranchises = await prisma.franchise.findMany({
    orderBy: {
      name: "asc",
    },
  });

  const allPlatforms = await prisma.platform.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-8 py-8 text-white">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mt-4 text-4xl font-bold">Timeline</h1>
          <p className="mt-2 text-zinc-400">
            Games you completed, grouped by year and month.
          </p>
          <form className="mt-6 grid w-full gap-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <select
              name="genre"
              defaultValue={genre ?? "ALL"}
              className="input"
            >
              <option value="ALL">All Genres</option>
              {allGenres.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              name="franchise"
              defaultValue={franchise ?? "ALL"}
              className="input"
            >
              <option value="ALL">All Franchises</option>
              {allFranchises.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              name="platform"
              defaultValue={platform ?? "ALL"}
              className="input"
            >
              <option value="ALL">All Platforms</option>
              {allPlatforms.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              name="rating"
              defaultValue={rating ?? "ALL"}
              className="input"
            >
              <option value="ALL">All Ratings</option>
              <option value="10">10/10</option>
              <option value="9">9/10</option>
              <option value="8">8/10</option>
              <option value="7">7/10</option>
              <option value="6">6/10</option>
              <option value="5">5/10</option>
              <option value="4">4/10</option>
              <option value="3">3/10</option>
              <option value="2">2/10</option>
              <option value="1">1/10</option>
            </select>

            <button
              type="submit"
              className="rounded-lg border border-zinc-700 bg-zinc-100 px-5 py-3 font-semibold text-zinc-950 hover:bg-white"
            >
              Apply Filters
            </button>
          </form>
          <Link
            href="/timeline"
            className="mt-3 inline-flex text-sm text-zinc-400 hover:text-white"
          >
            Clear filters
          </Link>
        </div>
      </div>

      <div className="w-full space-y-14">
  {years.map(([year, months]) => {
    const yearGames = [...months.values()].flat();

    const totalHours = yearGames.reduce(
      (sum, userGame) => sum + (userGame.hoursPlayed ?? 0),
      0
    );

    const ratings = yearGames
      .map((userGame) => userGame.reviews[0]?.overallRating)
      .filter((rating): rating is number => rating != null);

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null;

    return (
      <section key={year}>
        <div className="mb-6 border-y border-zinc-800 py-5">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-bold">{year}</h2>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                {yearGames.length} games
              </span>
            </div>

            <div className="grid gap-4 text-sm text-zinc-300 sm:grid-cols-3">
              <YearStat label="Total Hours" value={`${totalHours.toFixed(1)} hrs`} />
              <YearStat
                label="Average Rating"
                value={averageRating != null ? `${averageRating.toFixed(1)}/10` : "N/A"}
              />
              <YearStat label="Games Completed" value={yearGames.length} />
            </div>
          </div>
        </div>

        <div className="relative border-l-2 border-zinc-600 pl-8">
          {[...months.entries()].map(([month, games]) => (
            <section key={month} className="relative mb-10 grid gap-4 lg:grid-cols-[160px_1fr]">
              <div className="relative">
                <span className="absolute -left-[43px] top-1 h-5 w-5 rounded-full border-4 border-zinc-950 bg-zinc-200 ring-2 ring-zinc-500" />

                <h3 className="text-xl font-bold text-zinc-100">{month}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {games.length} completed
                </p>
              </div>

              <div className="space-y-3">
                {games.map((userGame) => {
                  const review = userGame.reviews[0];
                  const genres = userGame.game.gameGenres.map(
                    (gameGenre) => gameGenre.genre.name
                  );
                  const completedDate = new Date(userGame.dateCompleted!);

                  return (
                    <Link
                      key={userGame.id}
                      href={`/game/${userGame.game.id}`}
                      className="group grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 hover:border-zinc-600 hover:bg-zinc-900 sm:grid-cols-[96px_72px_1fr_auto]"
                    >
                      <div className="relative h-[96px] w-[96px] overflow-hidden rounded-md bg-zinc-800">
                        {userGame.game.coverArtUrl ? (
                          <Image
                            src={userGame.game.coverArtUrl}
                            alt={`${userGame.game.title} cover art`}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-zinc-500">
                            No Cover
                          </div>
                        )}
                      </div>

                      <div className="flex h-[96px] items-center justify-center rounded-md bg-zinc-950/40 text-center">
                        <div>
                          <p className="text-xs font-semibold uppercase text-zinc-400">
                            {completedDate.toLocaleDateString("en-CA", {
                              month: "short",
                            })}
                          </p>
                          <p className="text-2xl font-bold text-zinc-100">
                            {completedDate.getDate()}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0 self-center">
                        <h4 className="text-lg font-bold leading-snug text-zinc-100 group-hover:text-white">
                          {userGame.game.title}
                        </h4>

                        <p className="mt-1 text-sm text-zinc-400">
                          {userGame.platform?.name ?? "Unknown Platform"} •{" "}
                          {genres.length > 0 ? genres[0] : "Unknown Genre"} •{" "}
                          {userGame.hoursPlayed != null
                            ? `${userGame.hoursPlayed} hrs`
                            : "N/A hrs"}
                        </p>

                        <p className="mt-2 text-sm text-sky-400">
                          {userGame.game.franchise?.name ?? ""}
                        </p>
                      </div>

                      <div className="flex items-center justify-end">
                        <RatingBadge rating={review?.overallRating ?? null} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    );
  })}
</div>
    </main>
  );
}

function formatDate(date: Date | string | null) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}
function YearStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="font-bold text-zinc-100">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function RatingBadge({ rating }: { rating: number | null }) {
  const ratingStyle = getRatingStyle(rating);

  return (
    <span
      className={`inline-flex min-w-[96px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${ratingStyle.className}`}
    >
      <span>{ratingStyle.icon}</span>
      <span>{rating != null ? `${rating}/10` : "N/A"}</span>
    </span>
  );
}

function getRatingStyle(rating: number | null) {
  if (rating === 10) {
    return {
      icon: "◇",
      className: "border-sky-400/50 bg-sky-400/10 text-sky-300",
    };
  }

  if (rating === 9) {
    return {
      icon: "★",
      className: "border-yellow-400/50 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (rating === 8) {
    return {
      icon: "☆",
      className: "border-zinc-300/50 bg-zinc-300/10 text-zinc-200",
    };
  }

  if (rating === 7) {
    return {
      icon: "☆",
      className: "border-orange-400/50 bg-orange-400/10 text-orange-300",
    };
  }

  return {
    icon: "☆",
    className: "border-zinc-700 bg-zinc-800 text-zinc-400",
  };
}