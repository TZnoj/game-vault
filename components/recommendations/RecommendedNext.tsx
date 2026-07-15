"use client";

import { useMemo, useState } from "react";
import type { RecommendedNextData, RecommendationResult } from "@/lib/recommendations";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";

function genreSet(result: RecommendationResult) {
  return new Set(result.game.gameGenres.map((entry) => entry.genre.name.trim().toLowerCase()));
}

function franchiseKey(result: RecommendationResult) {
  const name = result.game.franchise?.name?.trim().toLowerCase();
  return !name || name === "standalone" ? null : name;
}

function diversify(pool: RecommendationResult[], count = 3) {
  const selected: RecommendationResult[] = [];
  const remaining = [...pool];

  while (selected.length < count && remaining.length) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const candidateGenres = genreSet(candidate);
      let diversityPenalty = 0;

      for (const chosen of selected) {
        const chosenGenres = genreSet(chosen);
        const sharedGenres = [...candidateGenres].filter((genre) => chosenGenres.has(genre)).length;
        diversityPenalty += sharedGenres * 14;

        const candidateFranchise = franchiseKey(candidate);
        if (candidateFranchise && candidateFranchise === franchiseKey(chosen)) {
          diversityPenalty += 18;
        }
      }

      const adjusted = candidate.match - diversityPenalty;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIndex = index;
      }
    });

    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected;
}

function rotate<T>(items: T[], offset: number) {
  if (!items.length) return items;
  const normalized = offset % items.length;
  return [...items.slice(normalized), ...items.slice(0, normalized)];
}

function randomize<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function RecommendedNext({ data }: { data: RecommendedNextData }) {
  const [refreshPage, setRefreshPage] = useState(0);
  const [surpriseSeed, setSurpriseSeed] = useState(0);
  const [mode, setMode] = useState<"ranked" | "surprise" | "lowest">("ranked");

  const visible = useMemo(() => {
    if (mode === "surprise") {
      return diversify(randomize(data.surprisePool).slice(0, 18));
    }

    if (mode === "lowest") {
      return data.lowestMatchPool.slice(0, 3);
    }

    return diversify(rotate(data.rankedPool, refreshPage * 3).slice(0, 15));
  }, [data.lowestMatchPool, data.rankedPool, data.surprisePool, mode, refreshPage, surpriseSeed]);

  if (!data.recentSources.length) {
    return (
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-400">Recommended Next</p>
        <h2 className="mt-2 text-2xl font-black">Play something different next</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Add a completion date to completed games—or mark a game as Playing—to create change-of-pace recommendations.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-zinc-900/75 to-fuchsia-500/10 p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Recommended Next</p>
          <h2 className="mt-2 text-3xl font-black">A change of pace</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
            Three backlog games chosen to fit your tastes while avoiding genres already represented by what you are playing and your last three completed games.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.recentSources.map((source) => (
              <span key={`${source.kind}-${source.id}`} className="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-300">
                {source.kind === "PLAYING" ? "Playing" : "Recently completed"}: {source.title}
              </span>
            ))}
          </div>
          {data.recentGenres.length > 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              Softly avoiding recent genres: {data.recentGenres.join(", ")}.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("ranked");
              setRefreshPage((value) => value + 1);
            }}
            className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400 hover:bg-cyan-500/10"
            title="Shows another set from the strongest-scoring change-of-pace recommendations."
          >
            Refresh recommendations
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("surprise");
              setSurpriseSeed((value) => value + 1);
            }}
            className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20"
            title="Picks from a wider pool of suitable backlog games, including less obvious matches."
          >
            Surprise me
          </button>
          <button
            type="button"
            onClick={() => setMode("lowest")}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
            title="Shows the three eligible backlog games with the lowest match percentages against your current and recently completed games."
          >
            Lowest match
          </button>
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="mt-7 grid gap-4 xl:grid-cols-3">
          {visible.map((recommendation) => (
            <RecommendationCard key={`${mode}-${surpriseSeed}-${refreshPage}-${recommendation.game.id}`} recommendation={recommendation} />
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">
          No eligible backlog recommendations were found after excluding completed, playing, replaying, and duplicate titles.
        </div>
      )}

      <div className="mt-5 grid gap-3 text-xs text-zinc-400 sm:grid-cols-3">
        <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <strong className="text-zinc-200">Refresh</strong> cycles through other high-scoring recommendations from the strongest candidate pool.
        </p>
        <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <strong className="text-zinc-200">Surprise Me</strong> samples from a wider pool to surface good but less obvious backlog choices.
        </p>
        <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <strong className="text-zinc-200">Lowest Match</strong> shows the three eligible backlog games least similar to your current and recently completed games.
        </p>
      </div>
    </section>
  );
}
