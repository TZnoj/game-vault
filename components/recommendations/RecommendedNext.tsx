"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { RecommendedNextCollection, RecommendedNextItem } from "@/lib/recommendations";

function normalizedGenres(item: RecommendedNextItem) {
  return new Set(item.game.genres.map((genre) => genre.trim().toLowerCase()));
}

function chooseDiverse(items: RecommendedNextItem[], count: number) {
  const pool = [...items].sort(() => Math.random() - 0.5);
  const selected: RecommendedNextItem[] = [];

  while (selected.length < count && pool.length) {
    let bestIndex = 0;
    let bestOverlap = Number.POSITIVE_INFINITY;

    pool.forEach((item, index) => {
      const genres = normalizedGenres(item);
      const overlap = selected.reduce((total, chosen) => {
        const chosenGenres = normalizedGenres(chosen);
        return total + [...genres].filter((genre) => chosenGenres.has(genre)).length;
      }, 0);

      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        bestIndex = index;
      }
    });

    selected.push(pool.splice(bestIndex, 1)[0]);
  }

  return selected;
}

export function RecommendedNext({ collection }: { collection: RecommendedNextCollection }) {
  const [offset, setOffset] = useState(0);
  const [surpriseSelection, setSurpriseSelection] = useState<RecommendedNextItem[] | null>(null);

  const visible = useMemo(() => {
    if (surpriseSelection) return surpriseSelection;
    if (!collection.primary.length) return [];

    const items: RecommendedNextItem[] = [];
    for (let index = 0; index < Math.min(3, collection.primary.length); index += 1) {
      items.push(collection.primary[(offset + index) % collection.primary.length]);
    }
    return items;
  }, [collection.primary, offset, surpriseSelection]);

  function refresh() {
    setSurpriseSelection(null);
    setOffset((current) => {
      if (collection.primary.length <= 3) return 0;
      return (current + 3) % collection.primary.length;
    });
  }

  function surprise() {
    const pool = collection.surprise.length ? collection.surprise : collection.primary;
    setSurpriseSelection(chooseDiverse(pool, Math.min(3, pool.length)));
  }

  if (!visible.length) return null;

  const recentTitles = [
    ...collection.context.currentlyPlaying,
    ...collection.context.recentlyCompleted,
  ];

  return (
    <section className="rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-zinc-900/90 to-fuchsia-500/10 p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Change of Pace</p>
          <h2 className="mt-2 text-3xl font-black">Recommended Next</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
            Three backlog choices that still fit your tastes while deliberately avoiding the genres dominating your current and recent rotation.
          </p>
          {recentTitles.length > 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              Based on {recentTitles.slice(0, 5).join(", ")}
              {recentTitles.length > 5 ? ` and ${recentTitles.length - 5} more` : ""}.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-cyan-400 hover:text-white"
          >
            Refresh Recommendations
          </button>
          <button
            type="button"
            onClick={surprise}
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-cyan-300"
          >
            Surprise Me
          </button>
        </div>
      </div>

      {collection.context.fatiguedGenres.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-zinc-500">Currently avoiding</span>
          {collection.context.fatiguedGenres.slice(0, 5).map((genre) => (
            <span key={genre} className="rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-1 text-zinc-300">
              {genre}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {visible.map((item) => (
          <RecommendedNextCard key={item.game.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function RecommendedNextCard({ item }: { item: RecommendedNextItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/75 shadow-lg shadow-black/20">
      <Link href={`/game/${item.game.id}`} className="block h-full p-4 transition hover:bg-zinc-900/80">
        <div className="grid grid-cols-[86px_1fr] gap-4">
          {item.game.coverArtUrl ? (
            <Image
              src={item.game.coverArtUrl}
              alt={`${item.game.title} cover`}
              width={100}
              height={150}
              className="aspect-[2/3] w-full rounded-lg object-cover"
            />
          ) : (
            <div className="aspect-[2/3] rounded-lg bg-zinc-800" />
          )}
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold leading-5 text-white">{item.game.title}</h3>
              <div className="shrink-0 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-center">
                <div className="text-lg font-black text-cyan-300">{item.match}%</div>
                <div className="text-[9px] uppercase tracking-wider text-cyan-200/70">Fit</div>
              </div>
            </div>
            {item.game.hltbMain != null && (
              <p className="mt-1 text-xs text-zinc-500">About {item.game.hltbMain} hours</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.game.genres.slice(0, 3).map((genre) => (
                <span key={genre} className="rounded-full bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Why now</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-zinc-300">
            {item.differenceReasons.map((reason) => (
              <li key={reason}>✓ {reason}</li>
            ))}
          </ul>
        </div>

        {(item.sourceTitles.length > 0 || item.reasons.length > 0) && (
          <div className="mt-3 text-xs leading-5 text-zinc-500">
            {item.sourceTitles.length > 0 && (
              <p>Still connects to {item.sourceTitles.join(" and ")}.</p>
            )}
            {item.reasons.length > 0 && <p>{item.reasons.join(" · ")}</p>}
          </div>
        )}
      </Link>
    </article>
  );
}
