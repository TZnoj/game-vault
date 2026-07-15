"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: number;
  gameId: number;
  title: string;
  dateCompleted: string;
  hoursPlayed: number | null;
  hltbMain: number | null;
  overallRating: number | null;
  platform: { id: number; name: string } | null;
  genres: { id: number; name: string }[];
};

type WeightedRatingDetail = {
  entry: Entry & { overallRating: number };
  time: number;
  timeSource: "Recorded hours" | "HLTB Main" | "1-hour fallback";
  weight: number;
  weightShare: number;
  weightedPoints: number;
  impact: number;
};

type YearStats = {
  year: number;
  entries: Entry[];
  games: number;
  hours: number;
  averageRating: number | null;
  weightedRating: number | null;
  weightedDetails: WeightedRatingDetail[];
  averageHours: number | null;
  genres: Map<string, number>;
  platforms: Map<string, number>;
};

function utcParts(value: string) {
  const date = new Date(value);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDecimal(value: number | null, digits = 1) {
  return value == null ? "N/A" : value.toFixed(digits);
}

function squareRootWeightedData(entries: Entry[]) {
  const ratedEntries = entries.filter(
    (entry): entry is Entry & { overallRating: number } =>
      entry.overallRating != null,
  );

  if (ratedEntries.length === 0) {
    return { rating: null, details: [] as WeightedRatingDetail[] };
  }

  const base = ratedEntries.map((entry) => {
    const hasRecordedHours = entry.hoursPlayed != null && entry.hoursPlayed > 0;
    const hasHltb = entry.hltbMain != null && entry.hltbMain > 0;
    const time = hasRecordedHours
      ? entry.hoursPlayed!
      : hasHltb
        ? entry.hltbMain!
        : 1;
    const timeSource: WeightedRatingDetail["timeSource"] = hasRecordedHours
      ? "Recorded hours"
      : hasHltb
        ? "HLTB Main"
        : "1-hour fallback";

    return { entry, time, timeSource, weight: Math.sqrt(time) };
  });

  const totalWeight = base.reduce((sum, item) => sum + item.weight, 0);
  const weightedTotal = base.reduce(
    (sum, item) => sum + item.entry.overallRating * item.weight,
    0,
  );
  const rating = totalWeight > 0 ? weightedTotal / totalWeight : null;

  const details: WeightedRatingDetail[] = base.map((item) => {
    const remainingWeight = totalWeight - item.weight;
    const withoutGame =
      remainingWeight > 0
        ? (weightedTotal - item.entry.overallRating * item.weight) /
          remainingWeight
        : rating;

    return {
      ...item,
      weightShare: totalWeight > 0 ? item.weight / totalWeight : 0,
      weightedPoints:
        totalWeight > 0
          ? (item.entry.overallRating * item.weight) / totalWeight
          : 0,
      impact:
        rating != null && withoutGame != null ? rating - withoutGame : 0,
    };
  });

  details.sort(
    (a, b) =>
      Math.abs(b.impact) - Math.abs(a.impact) ||
      b.weightShare - a.weightShare ||
      a.entry.title.localeCompare(b.entry.title),
  );

  return { rating, details };
}

function buildStats(year: number, entries: Entry[]): YearStats {
  const yearEntries = entries.filter(
    (entry) => utcParts(entry.dateCompleted).year === year,
  );
  const ratings = yearEntries
    .map((entry) => entry.overallRating)
    .filter((value): value is number => value != null);
  const hours = yearEntries
    .map((entry) => entry.hoursPlayed)
    .filter((value): value is number => value != null && value >= 0);
  const genres = new Map<string, number>();
  const platforms = new Map<string, number>();

  for (const entry of yearEntries) {
    for (const genre of entry.genres) {
      genres.set(genre.name, (genres.get(genre.name) ?? 0) + 1);
    }
    if (entry.platform) {
      platforms.set(
        entry.platform.name,
        (platforms.get(entry.platform.name) ?? 0) + 1,
      );
    }
  }

  const weighted = squareRootWeightedData(yearEntries);

  return {
    year,
    entries: yearEntries,
    games: yearEntries.length,
    hours: hours.reduce((sum, value) => sum + value, 0),
    averageRating: average(ratings),
    weightedRating: weighted.rating,
    weightedDetails: weighted.details,
    averageHours: average(hours),
    genres,
    platforms,
  };
}

function topRows(map: Map<string, number>, limit = 6) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function trendWord(change: number) {
  return change > 0 ? "increased" : change < 0 ? "decreased" : "held steady";
}

export function YearComparisonDashboard({ entries }: { entries: Entry[] }) {
  const availableYears = useMemo(
    () =>
      [...new Set(entries.map((entry) => utcParts(entry.dateCompleted).year))].sort(
        (a, b) => a - b,
      ),
    [entries],
  );

  const defaultYears = availableYears.slice(-4);
  const [selectedYears, setSelectedYears] = useState<number[]>(defaultYears);
  const [weightedBreakdownYear, setWeightedBreakdownYear] = useState<number | null>(null);

  const allStats = useMemo(
    () => availableYears.map((year) => buildStats(year, entries)),
    [availableYears, entries],
  );
  useEffect(() => {
    if (weightedBreakdownYear == null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setWeightedBreakdownYear(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [weightedBreakdownYear]);

  const weightedBreakdown =
    weightedBreakdownYear == null
      ? null
      : allStats.find((stats) => stats.year === weightedBreakdownYear) ?? null;

  const visibleStats = allStats.filter((stats) =>
    selectedYears.includes(stats.year),
  );

  const maxGames = Math.max(1, ...visibleStats.map((stats) => stats.games));
  const maxHours = Math.max(1, ...visibleStats.map((stats) => stats.hours));
  const maxRating = Math.max(
    1,
    ...visibleStats.flatMap((stats) => [
      stats.averageRating ?? 0,
      stats.weightedRating ?? 0,
    ]),
  );

  const latestYear = availableYears.at(-1) ?? new Date().getFullYear();
  const previousYear = availableYears.at(-2) ?? latestYear - 1;
  const latestIsCurrentYear = latestYear === new Date().getFullYear();

  // Personal trends must use the same annual aggregates displayed in the
  // year summary cards. This keeps values such as average rating consistent
  // everywhere on the page.
  const latestTrend =
    allStats.find((stats) => stats.year === latestYear) ??
    buildStats(latestYear, entries);
  const previousTrend =
    allStats.find((stats) => stats.year === previousYear) ??
    buildStats(previousYear, entries);

  const trends = useMemo(() => {
    if (availableYears.length < 2) return ["Add completions from another year to unlock personal trends."];

    const prefix = latestIsCurrentYear ? `So far in ${latestYear}` : `In ${latestYear}`;
    const comparison = `${previousYear}`;
    const items: string[] = [];

    const gameDelta = latestTrend.games - previousTrend.games;
    if (gameDelta === 0) {
      items.push(`${prefix}, you completed the same number of games as ${comparison}.`);
    } else {
      items.push(
        `${prefix}, you completed ${Math.abs(gameDelta)} ${gameDelta > 0 ? "more" : "fewer"} game${Math.abs(gameDelta) === 1 ? "" : "s"} than ${comparison}.`,
      );
    }

    const hourDelta = latestTrend.hours - previousTrend.hours;
    items.push(
      `Total hours ${trendWord(hourDelta)} by ${Math.abs(hourDelta).toFixed(1)} compared with ${comparison}.`,
    );

    if (
      latestTrend.averageRating != null &&
      previousTrend.averageRating != null
    ) {
      const delta = latestTrend.averageRating - previousTrend.averageRating;
      items.push(
        `Your average rating ${trendWord(delta)} from ${previousTrend.averageRating.toFixed(1)} to ${latestTrend.averageRating.toFixed(1)}.`,
      );
    }

    if (
      latestTrend.weightedRating != null &&
      previousTrend.weightedRating != null
    ) {
      const delta = latestTrend.weightedRating - previousTrend.weightedRating;
      items.push(
        `Your time-weighted rating ${trendWord(delta)} from ${previousTrend.weightedRating.toFixed(1)} to ${latestTrend.weightedRating.toFixed(1)}.`,
      );
    }

    if (latestTrend.averageHours != null && previousTrend.averageHours != null) {
      const delta = latestTrend.averageHours - previousTrend.averageHours;
      items.push(
        `Average game length ${trendWord(delta)} from ${previousTrend.averageHours.toFixed(1)} to ${latestTrend.averageHours.toFixed(1)} hours.`,
      );
    }

    const genreNames = new Set([
      ...latestTrend.genres.keys(),
      ...previousTrend.genres.keys(),
    ]);
    const genreShift = [...genreNames]
      .map((name) => ({
        name,
        delta:
          (latestTrend.genres.get(name) ?? 0) -
          (previousTrend.genres.get(name) ?? 0),
      }))
      .sort((a, b) => b.delta - a.delta || a.name.localeCompare(b.name))[0];
    if (genreShift && genreShift.delta > 0) {
      items.push(
        `You're playing more ${genreShift.name}: ${genreShift.delta} additional completion${genreShift.delta === 1 ? "" : "s"}.`,
      );
    }

    const latestPlatform = topRows(latestTrend.platforms, 1)[0];
    const previousPlatform = topRows(previousTrend.platforms, 1)[0];
    if (latestPlatform && latestPlatform[0] !== previousPlatform?.[0]) {
      items.push(
        `${latestPlatform[0]} became your most-used platform, replacing ${previousPlatform?.[0] ?? "the previous leader"}.`,
      );
    }

    return items.slice(0, 6);
  }, [availableYears.length, latestIsCurrentYear, latestTrend, latestYear, previousTrend, previousYear]);

  function toggleYear(year: number) {
    setSelectedYears((current) => {
      if (current.includes(year)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== year);
      }
      return [...current, year].sort((a, b) => a - b);
    });
  }

  const genreNames = useMemo(() => {
    const combined = new Map<string, number>();
    for (const stats of visibleStats) {
      for (const [name, count] of stats.genres) {
        combined.set(name, (combined.get(name) ?? 0) + count);
      }
    }
    return topRows(combined, 8).map(([name]) => name);
  }, [visibleStats]);

  const platformNames = useMemo(() => {
    const combined = new Map<string, number>();
    for (const stats of visibleStats) {
      for (const [name, count] of stats.platforms) {
        combined.set(name, (combined.get(name) ?? 0) + count);
      }
    }
    return topRows(combined, 8).map(([name]) => name);
  }, [visibleStats]);

  if (availableYears.length === 0) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 text-white">
        <h1 className="text-4xl font-black">Year Comparison</h1>
        <p className="mt-4 text-zinc-400">
          Complete games with completion dates to begin comparing years.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-400">
            Gaming history
          </p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">Year Comparison</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Compare completions, time, ratings, genres, and platforms across your gaming years.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300">
          {entries.length} dated completions across {availableYears.length} year{availableYears.length === 1 ? "" : "s"}
        </div>
      </div>

      <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Years to compare</h2>
            <p className="mt-1 text-sm text-zinc-500">Select one or several years. At least one must remain selected.</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedYears(availableYears)}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-violet-500 hover:text-white"
          >
            Select all
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {availableYears.map((year) => {
            const active = selectedYears.includes(year);
            return (
              <button
                type="button"
                key={year}
                onClick={() => toggleYear(year)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "border-violet-400 bg-violet-500/20 text-violet-200"
                    : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleStats.map((stats) => (
          <article key={stats.year} className="rounded-3xl border border-zinc-800 bg-zinc-900/75 p-6 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-3xl font-black">{stats.year}</h2>
              {stats.year === new Date().getFullYear() && (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">In progress</span>
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Metric label="Games" value={stats.games.toString()} />
              <Metric label="Hours" value={stats.hours.toFixed(1)} />
              <Metric label="Avg. rating" value={formatDecimal(stats.averageRating)} suffix="/10" />
              <Metric label="Avg. length" value={formatDecimal(stats.averageHours)} suffix="h" />
            </div>
            <button
              type="button"
              onClick={() => setWeightedBreakdownYear(stats.year)}
              className="group mt-5 w-full rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-left transition hover:border-violet-400 hover:bg-violet-500/15 focus:outline-none focus:ring-2 focus:ring-violet-400"
              aria-label={`See how each game affects the ${stats.year} time-weighted rating`}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Time-weighted rating</p>
                <p className="mt-1 text-3xl font-black text-white">
                  {formatDecimal(stats.weightedRating)}
                  <span className="ml-1 text-sm text-violet-300">/10</span>
                </p>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Ratings are weighted by the square root of playtime. Click the card to inspect every game’s contribution.
              </p>
            </button>
            <div className="mt-5 border-t border-zinc-800 pt-4 text-sm text-zinc-400">
              <p><span className="text-zinc-200">Top genre:</span> {topRows(stats.genres, 1)[0]?.[0] ?? "N/A"}</p>
              <p className="mt-2"><span className="text-zinc-200">Top platform:</span> {topRows(stats.platforms, 1)[0]?.[0] ?? "N/A"}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <BarChart title="Games completed" stats={visibleStats} getValue={(stats) => stats.games} max={maxGames} format={(value) => value.toFixed(0)} />
        <BarChart title="Hours played" stats={visibleStats} getValue={(stats) => stats.hours} max={maxHours} format={(value) => value.toFixed(1)} />
        <BarChart title="Average rating" stats={visibleStats} getValue={(stats) => stats.averageRating ?? 0} max={Math.max(10, maxRating)} format={(value) => value ? `${value.toFixed(1)}/10` : "N/A"} />
        <BarChart title="Time-weighted rating" stats={visibleStats} getValue={(stats) => stats.weightedRating ?? 0} max={Math.max(10, maxRating)} format={(value) => value ? `${value.toFixed(1)}/10` : "N/A"} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <DistributionChart title="Genre distribution" names={genreNames} stats={visibleStats} getMap={(stats) => stats.genres} />
        <DistributionChart title="Platforms" names={platformNames} stats={visibleStats} getMap={(stats) => stats.platforms} />
      </section>

      <section className="mt-8 rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-zinc-950 to-zinc-950 p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">Personal trends</p>
            <h2 className="mt-2 text-2xl font-black">{previousYear} → {latestYear}</h2>
          </div>
          {latestIsCurrentYear && (
            <p className="text-sm text-zinc-400">Current-year trends compare the same calendar period.</p>
          )}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {trends.map((trend) => (
            <div key={trend} className="rounded-2xl border border-zinc-800 bg-black/20 p-4 text-sm leading-6 text-zinc-200">
              {trend}
            </div>
          ))}
        </div>
      </section>

      {weightedBreakdown && (
        <WeightedRatingModal
          stats={weightedBreakdown}
          onClose={() => setWeightedBreakdownYear(null)}
        />
      )}

    </main>
  );
}

function WeightedRatingModal({
  stats,
  onClose,
}: {
  stats: YearStats;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weighted-rating-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5 sm:p-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
              {stats.year} calculation
            </p>
            <h2 id="weighted-rating-title" className="mt-2 text-2xl font-black sm:text-3xl">
              Time-weighted rating: {formatDecimal(stats.weightedRating)}/10
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Weight equals √time. “Impact” is how much this game changes the final yearly score compared with calculating the year without it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-300 hover:border-violet-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-145px)] overflow-y-auto p-4 sm:p-7">
          {stats.weightedDetails.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-zinc-400">
              No rated games are available for this year.
            </p>
          ) : (
            <>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <ModalMetric label="Rated games" value={stats.weightedDetails.length.toString()} />
                <ModalMetric
                  label="Total √time weight"
                  value={stats.weightedDetails.reduce((sum, item) => sum + item.weight, 0).toFixed(2)}
                />
                <ModalMetric
                  label="Largest influence"
                  value={stats.weightedDetails[0]?.entry.title ?? "N/A"}
                  compact
                />
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Game</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3">Time used</th>
                      <th className="px-4 py-3">√time weight</th>
                      <th className="px-4 py-3">Weight share</th>
                      <th className="px-4 py-3">Score contribution</th>
                      <th className="px-4 py-3">Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {stats.weightedDetails.map((detail) => (
                      <tr key={detail.entry.id} className="bg-zinc-950/60 hover:bg-zinc-900/70">
                        <td className="px-4 py-4">
                          <Link
                            href={`/game/${detail.entry.gameId}`}
                            className="font-semibold text-white hover:text-violet-300"
                          >
                            {detail.entry.title}
                          </Link>
                          <p className="mt-1 text-xs text-zinc-500">{detail.timeSource}</p>
                        </td>
                        <td className="px-4 py-4 font-bold">{detail.entry.overallRating.toFixed(1)}/10</td>
                        <td className="px-4 py-4">{detail.time.toFixed(1)}h</td>
                        <td className="px-4 py-4">{detail.weight.toFixed(2)}</td>
                        <td className="px-4 py-4">{(detail.weightShare * 100).toFixed(1)}%</td>
                        <td className="px-4 py-4">{detail.weightedPoints.toFixed(2)} pts</td>
                        <td className="px-4 py-4">
                          <ImpactPill impact={detail.impact} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {stats.weightedDetails.map((detail) => (
                  <article key={detail.entry.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/game/${detail.entry.gameId}`} className="font-bold text-white hover:text-violet-300">
                          {detail.entry.title}
                        </Link>
                        <p className="mt-1 text-xs text-zinc-500">{detail.timeSource}</p>
                      </div>
                      <ImpactPill impact={detail.impact} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <SmallDetail label="Rating" value={`${detail.entry.overallRating.toFixed(1)}/10`} />
                      <SmallDetail label="Time" value={`${detail.time.toFixed(1)}h`} />
                      <SmallDetail label="√time weight" value={detail.weight.toFixed(2)} />
                      <SmallDetail label="Weight share" value={`${(detail.weightShare * 100).toFixed(1)}%`} />
                      <SmallDetail label="Score contribution" value={`${detail.weightedPoints.toFixed(2)} pts`} />
                    </div>
                  </article>
                ))}
              </div>

              <p className="mt-5 text-xs leading-5 text-zinc-500">
                Score contribution values add up to the final weighted rating. Impact values do not add together; each is a separate leave-one-out comparison.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ImpactPill({ impact }: { impact: number }) {
  const rounded = Math.abs(impact) < 0.005 ? 0 : impact;
  const positive = rounded > 0;
  const negative = rounded < 0;

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
        positive
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : negative
            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
            : "border-zinc-700 bg-zinc-800 text-zinc-300"
      }`}
      title="Change in the yearly weighted rating caused by including this game"
    >
      {positive ? "+" : ""}{rounded.toFixed(2)}
    </span>
  );
}

function ModalMetric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-2 font-black text-white ${compact ? "text-base" : "text-2xl"}`}>{value}</p>
    </div>
  );
}

function SmallDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-200">{value}</p>
    </div>
  );
}

function Metric({ label, value, suffix = "" }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}<span className="ml-1 text-sm text-zinc-500">{suffix}</span></p>
    </div>
  );
}

function BarChart({
  title,
  stats,
  getValue,
  max,
  format,
}: {
  title: string;
  stats: YearStats[];
  getValue: (stats: YearStats) => number;
  max: number;
  format: (value: number) => string;
}) {
  return (
    <article className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-6 flex h-64 items-end gap-3 border-b border-zinc-700 px-2">
        {stats.map((year) => {
          const value = getValue(year);
          const height = value > 0 ? Math.max(4, (value / max) * 100) : 0;
          return (
            <div key={year.year} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-bold text-zinc-300">{format(value)}</span>
              <div className="w-full max-w-20 rounded-t-xl bg-violet-500/80 transition-all" style={{ height: `${height}%` }} />
              <span className="pb-2 text-xs font-semibold text-zinc-500">{year.year}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function DistributionChart({
  title,
  names,
  stats,
  getMap,
}: {
  title: string;
  names: string[];
  stats: YearStats[];
  getMap: (stats: YearStats) => Map<string, number>;
}) {
  const max = Math.max(
    1,
    ...names.flatMap((name) => stats.map((year) => getMap(year).get(name) ?? 0)),
  );

  return (
    <article className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          {stats.map((year, index) => (
            <span key={year.year}>{index > 0 ? "• " : ""}{year.year}</span>
          ))}
        </div>
      </div>
      <div className="mt-6 space-y-5">
        {names.map((name) => (
          <div key={name}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-zinc-200">{name}</span>
              <span className="text-xs text-zinc-500">{stats.map((year) => getMap(year).get(name) ?? 0).join(" / ")}</span>
            </div>
            <div className="space-y-1.5">
              {stats.map((year, index) => {
                const count = getMap(year).get(name) ?? 0;
                return (
                  <div key={year.year} className="flex items-center gap-2">
                    <span className="w-10 text-[10px] text-zinc-600">{year.year}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={index % 2 === 0 ? "h-full rounded-full bg-violet-500" : "h-full rounded-full bg-fuchsia-500"}
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 text-right text-xs text-zinc-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {names.length === 0 && <p className="text-sm text-zinc-500">No data for the selected years.</p>}
      </div>
    </article>
  );
}
