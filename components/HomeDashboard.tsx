"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

 type RecentGame = {
  id: number;
  title: string;
  coverArtUrl: string | null;
  activity: string;
  updatedAt: string;
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open homepage dashboard"
        aria-expanded={isOpen}
        className="fixed right-0 top-28 z-40 flex items-center gap-2 rounded-l-xl border border-r-0 border-zinc-700 bg-zinc-900 px-3 py-3 text-sm font-semibold text-zinc-200 shadow-xl transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
      >
        <span aria-hidden="true">◀</span>
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      {isOpen ? (
        <button
          type="button"
          aria-label="Close homepage dashboard"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/65 backdrop-blur-[1px]"
        />
      ) : null}

      <aside
        aria-label="Homepage activity and statistics"
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-50 flex h-dvh w-full max-w-xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Game Vault
            </p>
            <h2 className="mt-1 text-xl font-bold">Dashboard</h2>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close dashboard"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            Close ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Activity
                </p>
                <h3 className="mt-1 text-lg font-bold">Recently Updated</h3>
              </div>
              <p className="text-xs text-zinc-500">Latest 10</p>
            </div>

            {recentGames.length > 0 ? (
              <div className="space-y-2">
                {recentGames.map((game) => (
                  <Link
                    key={game.id}
                    href={`/game/${game.id}`}
                    onClick={() => setIsOpen(false)}
                    className="group flex min-w-0 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 transition hover:border-zinc-600 hover:bg-zinc-900"
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

                    <div className="min-w-0 flex-1 py-0.5">
                      <h4 className="truncate font-semibold group-hover:text-white">
                        {game.title}
                      </h4>
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
              <div className="rounded-xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-500">
                No game activity is available yet.
              </div>
            )}
          </section>

          <section className="mt-8 border-t border-zinc-800 pt-8">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Overview
              </p>
              <h3 className="mt-1 text-lg font-bold">Homepage Statistics</h3>
            </div>

            <div className="space-y-4">
              {groups.map((group) => (
                <details
                  key={group.title}
                  open
                  className="group rounded-2xl border border-zinc-800 bg-zinc-900/60"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold marker:hidden">
                    <span>{group.title}</span>
                    <span className="text-zinc-500 transition group-open:rotate-90">›</span>
                  </summary>

                  <div className="grid gap-2 border-t border-zinc-800 p-3 sm:grid-cols-2">
                    {group.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-zinc-800/80 bg-zinc-950/75 p-3"
                      >
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          {stat.label}
                        </p>
                        <p className="mt-1 break-words text-lg font-bold">
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
                </details>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const difference = Date.now() - date.getTime();
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
