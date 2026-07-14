import Image from "next/image";
import Link from "next/link";

type RecentGame = {
  id: number;
  title: string;
  coverArtUrl: string | null;
  activity: string;
  updatedAt: Date;
};

type StatValue = string | number;

type StatGroup = {
  title: string;
  stats: { label: string; value: StatValue; detail?: string }[];
};

export function HomeDashboard({
  recentGames,
  groups,
}: {
  recentGames: RecentGame[];
  groups: StatGroup[];
}) {
  return (
    <div className="px-8 pt-8">
      <section className="mb-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Activity
            </p>
            <h2 className="mt-1 text-2xl font-bold">Recently Updated</h2>
          </div>
          <p className="text-sm text-zinc-500">Latest 10 updates</p>
        </div>

        {recentGames.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {recentGames.map((game) => (
              <Link
                key={game.id}
                href={`/game/${game.id}`}
                className="group flex min-w-0 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 transition hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-900"
              >
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                  {game.coverArtUrl ? (
                    <Image
                      src={game.coverArtUrl}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] text-zinc-600">
                      No art
                    </div>
                  )}
                </div>

                <div className="min-w-0 py-0.5">
                  <h3 className="truncate font-semibold group-hover:text-zinc-200">
                    {game.title}
                  </h3>
                  <p className="mt-1 truncate text-sm text-zinc-400">
                    {game.activity}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {formatRelativeTime(game.updatedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
            No game activity is available yet.
          </div>
        )}
      </section>

      <section className="mb-2">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Overview
          </p>
          <h2 className="mt-1 text-2xl font-bold">Homepage Statistics</h2>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
            >
              <h3 className="mb-4 text-lg font-semibold">{group.title}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 break-words text-xl font-bold">
                      {stat.value}
                    </p>
                    {stat.detail ? (
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {stat.detail}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatRelativeTime(date: Date) {
  const difference = Date.now() - new Date(date).getTime();
  const minutes = Math.max(0, Math.floor(difference / 60_000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}
