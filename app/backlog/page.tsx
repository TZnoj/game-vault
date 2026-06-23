import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const UNFINISHED_STATUSES = [
  "BACKLOG",
  "PLAYING",
  "ONHOLD",
  "REPLAYING",
] as const;

type BacklogUserGame = {
  id: number;
  status: string;
  hoursPlayed: number | null;
  platform: {
    name: string;
  } | null;
  game: {
    id: number;
    title: string;
    coverArtUrl: string | null;
    hltbMain: number | null;
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

const backlogCopies = (await prisma.userGame.findMany({
  where: {
    status: {
      in: [...UNFINISHED_STATUSES],
    },
    game: {
      isEndless: false,
      userGames: {
        none: {
          status: "COMPLETED",
        },
      },
    },
  },
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
})) as BacklogUserGame[];

const backlogGames = dedupeBacklogCopies(backlogCopies);

export default async function BacklogPage() {
  const backlogGames = (await prisma.userGame.findMany({
  where: {
    status: {
      in: [...UNFINISHED_STATUSES],
    },
    game: {
      isEndless: false,
      userGames: {
        none: {
          status: "COMPLETED",
        },
      },
    },
  },
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
  })) as BacklogUserGame[];

  const estimatedHoursRemaining = backlogGames.reduce(
  (sum: number, userGame: BacklogUserGame) =>
      sum + (userGame.game.hltbMain ?? userGame.hoursPlayed ?? 0),
    0,
  );

  const gamesWithEstimate = backlogGames.filter(
    (userGame: BacklogUserGame) =>
      userGame.game.hltbMain != null || userGame.hoursPlayed != null,
  );

  const averageEstimate =
    gamesWithEstimate.length > 0
      ? estimatedHoursRemaining / gamesWithEstimate.length
      : null;

  const longestGames = [...backlogGames]
    .sort((a: BacklogUserGame, b: BacklogUserGame) => getEstimatedHours(b) - getEstimatedHours(a))
    .slice(0, 10);

  const shortestGames = [...backlogGames]
    .filter((userGame: BacklogUserGame) => getEstimatedHours(userGame) > 0)
    .sort((a: BacklogUserGame, b: BacklogUserGame) => getEstimatedHours(a) - getEstimatedHours(b))
    .slice(0, 10);

  const platformCounts = new Map<string, { count: number; hours: number }>();
  const genreCounts = new Map<string, { count: number; hours: number }>();

  for (const userGame of backlogGames) {
    const hours = getEstimatedHours(userGame);
    const platform = userGame.platform?.name ?? "Unknown Platform";

    const currentPlatform = platformCounts.get(platform) ?? {
      count: 0,
      hours: 0,
    };

    currentPlatform.count += 1;
    currentPlatform.hours += hours;
    platformCounts.set(platform, currentPlatform);

    const genres = userGame.game.gameGenres.map(
  (gameGenre: { genre: { name: string } }) => gameGenre.genre.name,
);

    if (genres.length === 0) {
      const current = genreCounts.get("Unknown Genre") ?? {
        count: 0,
        hours: 0,
      };

      current.count += 1;
      current.hours += hours;
      genreCounts.set("Unknown Genre", current);
    }

    for (const genre of genres) {
      const current = genreCounts.get(genre) ?? {
        count: 0,
        hours: 0,
      };

      current.count += 1;
      current.hours += hours;
      genreCounts.set(genre, current);
    }
  }

  const backlogByPlatform = [...platformCounts.entries()].sort(
    (a, b) => b[1].hours - a[1].hours,
  );

  const backlogByGenre = [...genreCounts.entries()].sort(
    (a, b) => b[1].hours - a[1].hours,
  );

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Backlog</h1>
        <p className="mt-2 text-zinc-400">
          Unfinished games and estimated time remaining.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Backlog Size" value={backlogGames.length} />
        <StatCard
          label="Estimated Hours Remaining"
          value={estimatedHoursRemaining.toFixed(1)}
        />
        <StatCard
          label="Average Estimate"
          value={
            averageEstimate != null
              ? `${averageEstimate.toFixed(1)} hrs`
              : "N/A"
          }
        />
        <StatCard
          label="Games Missing Estimate"
          value={
            backlogGames.filter(
              (userGame: BacklogUserGame) =>
                userGame.game.hltbMain == null && userGame.hoursPlayed == null,
            ).length
          }
        />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Panel title="Longest Backlog Games">
          <div className="space-y-3">
            {longestGames.map((userGame: BacklogUserGame) => (
              <BacklogRow key={userGame.id} userGame={userGame} />
            ))}
          </div>
        </Panel>

        <Panel title="Shortest Backlog Games">
          <div className="space-y-3">
            {shortestGames.map((userGame: BacklogUserGame) => (
              <BacklogRow key={userGame.id} userGame={userGame} />
            ))}
          </div>
        </Panel>

        <Panel title="Backlog By Platform">
          <div className="space-y-3">
            {backlogByPlatform.map(([platform, stats]) => (
              <SummaryRow
                key={platform}
                label={platform}
                value={`${stats.count} games • ${stats.hours.toFixed(1)} hrs`}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Backlog By Genre">
          <div className="space-y-3">
            {backlogByGenre.map(([genre, stats]) => (
              <SummaryRow
                key={genre}
                label={genre}
                value={`${stats.count} games • ${stats.hours.toFixed(1)} hrs`}
              />
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">All Backlog Games</h2>

        <div className="mt-4 grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {backlogGames.map((userGame: BacklogUserGame) => (
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
                  <p>{userGame.platform?.name ?? "Unknown Platform"}</p>
                  <p>{userGame.status}</p>
                </div>

                <div className="mt-2 min-h-[1rem] text-xs text-zinc-500">
                  {userGame.game.franchise?.name ?? ""}
                </div>

                <div className="mt-auto pt-3">
                  <InfoBox
                    label="Estimate"
                    value={
                      getEstimatedHours(userGame) > 0
                        ? `${getEstimatedHours(userGame).toFixed(1)} hrs`
                        : "N/A"
                    }
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function getEstimatedHours(userGame: {
  hoursPlayed: number | null;
  game: {
    hltbMain: number | null;
  };
}) {
  return userGame.game.hltbMain ?? userGame.hoursPlayed ?? 0;
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

function BacklogRow({
  userGame,
}: {
  userGame: BacklogUserGame;
}) {
  return (
    <Link
      href={`/game/${userGame.game.id}`}
      className="flex items-center justify-between gap-6 border-b border-zinc-800 py-2 last:border-0 hover:text-white"
    >
      <span className="min-w-0 text-zinc-300">{userGame.game.title}</span>
      <span className="whitespace-nowrap font-semibold">
        {getEstimatedHours(userGame) > 0
          ? `${getEstimatedHours(userGame).toFixed(1)} hrs`
          : "N/A"}
      </span>
    </Link>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-zinc-800 py-2 last:border-0">
      <span className="text-zinc-300">{label}</span>
      <span className="whitespace-nowrap font-semibold">{value}</span>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-2 text-xs">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function dedupeBacklogCopies(userGames: BacklogUserGame[]) {
  const byGameId = new Map<number, BacklogUserGame>();

  for (const userGame of userGames) {
    const existing = byGameId.get(userGame.game.id);

    if (!existing) {
      byGameId.set(userGame.game.id, userGame);
      continue;
    }

    const existingHours = getEstimatedHours(existing);
    const currentHours = getEstimatedHours(userGame);

    if (currentHours > 0 && (existingHours === 0 || currentHours < existingHours)) {
      byGameId.set(userGame.game.id, userGame);
    }
  }

  return [...byGameId.values()];
}