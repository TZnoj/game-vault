"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type Status = "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "REPLAYING" | "ONHOLD";

type TimelineEntry = {
  id: number;
  status: Status;
  dateStarted: string | null;
  dateCompleted: string | null;
  createdAt: string;
  updatedAt: string;
  hoursPlayed: number | null;
  platform: string | null;
  rating: number | null;
  game: {
    id: number;
    title: string;
    coverArtUrl: string | null;
    franchise: string | null;
    genres: string[];
  };
};

type Props = {
  entries: TimelineEntry[];
  genres: string[];
  franchises: string[];
  platforms: string[];
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusLabels: Record<Status, string> = {
  BACKLOG: "Backlog",
  PLAYING: "Playing",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  REPLAYING: "Replaying",
  ONHOLD: "On Hold",
};

function activityDate(entry: TimelineEntry): Date {
  if (entry.status === "COMPLETED" && entry.dateCompleted) return new Date(entry.dateCompleted);
  if (entry.dateStarted) return new Date(entry.dateStarted);
  return new Date(entry.createdAt);
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function TimelineDashboard({ entries, genres, franchises, platforms }: Props) {
  const availableYears = useMemo(() => {
    const years = new Set(entries.map((entry) => activityDate(entry).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }, [entries]);

  const [year, setYear] = useState(availableYears[0] ?? new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [platform, setPlatform] = useState("ALL");
  const [genre, setGenre] = useState("ALL");
  const [franchise, setFranchise] = useState("ALL");
  const [status, setStatus] = useState<Status | "ALL">("COMPLETED");

  const filtered = useMemo(() => entries.filter((entry) => {
    const date = activityDate(entry);
    return (
      date.getFullYear() === year &&
      (platform === "ALL" || entry.platform === platform) &&
      (genre === "ALL" || entry.game.genres.includes(genre)) &&
      (franchise === "ALL" || entry.game.franchise === franchise) &&
      (status === "ALL" || entry.status === status)
    );
  }), [entries, franchise, genre, platform, status, year]);

  const monthGroups = useMemo(() => monthNames.map((name, index) => {
    const games = filtered
      .filter((entry) => activityDate(entry).getMonth() === index)
      .sort((a, b) => activityDate(b).getTime() - activityDate(a).getTime());
    return { name, index, games };
  }), [filtered]);

  const maxMonthCount = Math.max(1, ...monthGroups.map((item) => item.games.length));
  const selectedMonth = month ?? monthGroups.find((item) => item.games.length > 0)?.index ?? 0;
  const selected = monthGroups[selectedMonth];
  const totalHours = filtered.reduce((sum, entry) => sum + (entry.hoursPlayed ?? 0), 0);

  function clearFilters() {
    setPlatform("ALL");
    setGenre("ALL");
    setFranchise("ALL");
    setStatus("COMPLETED");
    setMonth(null);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Gaming history</p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Timeline</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Explore your library month by month. Completed games use their completion date; other statuses use their start date when available.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect label="Year" value={String(year)} onChange={(value) => { setYear(Number(value)); setMonth(null); }} options={availableYears.map(String)} />
            <FilterSelect label="Platform" value={platform} onChange={(value) => { setPlatform(value); setMonth(null); }} options={platforms} allLabel="All Platforms" />
            <FilterSelect label="Genre" value={genre} onChange={(value) => { setGenre(value); setMonth(null); }} options={genres} allLabel="All Genres" />
            <FilterSelect label="Franchise" value={franchise} onChange={(value) => { setFranchise(value); setMonth(null); }} options={franchises} allLabel="All Franchises" />
            <label className="text-sm text-zinc-400">
              Status
              <select className="input mt-2 w-full" value={status} onChange={(event) => { setStatus(event.target.value as Status | "ALL"); setMonth(null); }}>
                <option value="ALL">All Statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <button onClick={clearFilters} className="mt-4 text-sm text-zinc-400 hover:text-white">Clear filters</button>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-7">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-bold">{year}</h2>
              <p className="mt-1 text-sm text-zinc-400">Click a month to view its games.</p>
            </div>
            <div className="flex gap-6 text-right">
              <Metric label="Games" value={String(filtered.length)} />
              <Metric label="Hours" value={totalHours.toFixed(totalHours % 1 === 0 ? 0 : 1)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12">
            {monthGroups.map((item) => {
              const strength = item.games.length / maxMonthCount;
              const active = selectedMonth === item.index;
              return (
                <button
                  key={item.name}
                  onClick={() => setMonth(item.index)}
                  className={`group rounded-xl border p-3 text-left transition ${active ? "border-white bg-zinc-800" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"}`}
                >
                  <span className="block text-xs text-zinc-500">{item.name.slice(0, 3)}</span>
                  <span className="mt-2 block text-2xl font-bold">{item.games.length}</span>
                  <span className="mt-3 block h-12 overflow-hidden rounded-md bg-zinc-900">
                    <span
                      className="block w-full rounded-md bg-zinc-200 transition-all"
                      style={{ height: `${Math.max(item.games.length ? 18 : 0, strength * 100)}%`, marginTop: `${100 - Math.max(item.games.length ? 18 : 0, strength * 100)}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold">{selected.name}</h2>
              <p className="mt-1 text-zinc-400">{selected.games.length} {selected.games.length === 1 ? "game" : "games"}</p>
            </div>
          </div>

          {selected.games.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center text-zinc-500">No games match this month and filter combination.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selected.games.map((entry) => (
                <Link key={entry.id} href={`/game/${entry.game.id}`} className="group flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-600 hover:bg-zinc-900">
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                    {entry.game.coverArtUrl ? (
                      <Image src={entry.game.coverArtUrl} alt="" fill sizes="80px" className="object-cover transition group-hover:scale-105" />
                    ) : <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-600">No cover</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold leading-snug group-hover:text-zinc-200">{entry.game.title}</h3>
                      {entry.rating != null && <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-bold">{entry.rating}/10</span>}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{formatDate(activityDate(entry))}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{statusLabels[entry.status]}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                      {entry.platform && <span className="rounded-full border border-zinc-700 px-2 py-1">{entry.platform}</span>}
                      {entry.hoursPlayed != null && <span className="rounded-full border border-zinc-700 px-2 py-1">{entry.hoursPlayed}h</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FilterSelect({ label, value, options, onChange, allLabel }: { label: string; value: string; options: string[]; onChange: (value: string) => void; allLabel?: string }) {
  return (
    <label className="text-sm text-zinc-400">
      {label}
      <select className="input mt-2 w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        {allLabel && <option value="ALL">{allLabel}</option>}
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-2xl font-bold">{value}</div><div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div></div>;
}
