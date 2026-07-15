"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Entry = {
  id: number;
  slug: string | null;
  title: string;
  coverArtUrl: string | null;
  releaseDate: string | null;
  overallRating: number;
  storyRating: number | null;
  musicRating: number | null;
  gameplayRating: number | null;
  artRating: number | null;
  hours: number | null;
  genres: string[];
  platforms: string[];
  franchise: string | null;
};

type Category = {
  label: string;
  description: string;
  entries: Entry[];
  score: (entry: Entry) => number | null;
};

const RPG_TERMS = ["rpg", "jrpg", "srpg", "role-playing", "role playing"];
const ACTION_TERMS = ["action", "soulslike", "hack and slash", "shooter"];
const HORROR_TERMS = ["horror", "survival horror"];

function hasTerm(values: string[], terms: string[]) {
  return values.some((value) => {
    const normalized = value.toLowerCase();
    return terms.some((term) => normalized.includes(term));
  });
}

function platformMatches(entry: Entry, aliases: string[]) {
  return entry.platforms.some((platform) => {
    const normalized = platform.toLowerCase();
    return aliases.some((alias) => normalized === alias || normalized.includes(alias));
  });
}

function hrefFor(entry: Entry) {
  return `/game/${entry.slug ?? entry.id}`;
}

function sortOverall(entries: Entry[]) {
  return [...entries].sort((a, b) => {
    if (b.overallRating !== a.overallRating) return b.overallRating - a.overallRating;
    const subA = [a.storyRating, a.gameplayRating, a.musicRating, a.artRating].filter(
      (value): value is number => value != null,
    );
    const subB = [b.storyRating, b.gameplayRating, b.musicRating, b.artRating].filter(
      (value): value is number => value != null,
    );
    const avgA = subA.length ? subA.reduce((sum, value) => sum + value, 0) / subA.length : 0;
    const avgB = subB.length ? subB.reduce((sum, value) => sum + value, 0) / subB.length : 0;
    if (avgB !== avgA) return avgB - avgA;
    if ((b.hours ?? 0) !== (a.hours ?? 0)) return (b.hours ?? 0) - (a.hours ?? 0);
    return a.title.localeCompare(b.title);
  });
}

function topBy(entries: Entry[], getter: (entry: Entry) => number | null, limit = 5) {
  return [...entries]
    .filter((entry) => getter(entry) != null)
    .sort((a, b) => {
      const difference = (getter(b) ?? -1) - (getter(a) ?? -1);
      return difference || b.overallRating - a.overallRating || a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

export function HallOfFameDashboard({ entries }: { entries: Entry[] }) {
  const [rankingLimit, setRankingLimit] = useState<10 | 50 | 100>(10);
  const ranked = useMemo(() => sortOverall(entries), [entries]);

  const masterpieceTiers = [
    { title: "Perfect Scores", subtitle: "10/10", entries: ranked.filter((entry) => entry.overallRating === 10) },
    { title: "Near Masterpieces", subtitle: "9/10", entries: ranked.filter((entry) => entry.overallRating === 9) },
    { title: "Hall of Excellence", subtitle: "8/10", entries: ranked.filter((entry) => entry.overallRating === 8) },
  ];

  const categories: Category[] = [
    {
      label: "Top RPG",
      description: "Highest-rated RPGs, JRPGs, SRPGs, and action RPGs.",
      entries: topBy(entries.filter((entry) => hasTerm(entry.genres, RPG_TERMS)), (entry) => entry.overallRating),
      score: (entry) => entry.overallRating,
    },
    {
      label: "Top Action",
      description: "Highest-rated action-focused games.",
      entries: topBy(entries.filter((entry) => hasTerm(entry.genres, ACTION_TERMS)), (entry) => entry.overallRating),
      score: (entry) => entry.overallRating,
    },
    {
      label: "Top Horror",
      description: "Highest-rated horror and survival-horror games.",
      entries: topBy(entries.filter((entry) => hasTerm(entry.genres, HORROR_TERMS)), (entry) => entry.overallRating),
      score: (entry) => entry.overallRating,
    },
    {
      label: "Top PS2",
      description: "Highest-rated PlayStation 2 games.",
      entries: topBy(entries.filter((entry) => platformMatches(entry, ["playstation 2", "ps2"])), (entry) => entry.overallRating),
      score: (entry) => entry.overallRating,
    },
    {
      label: "Top PS5",
      description: "Highest-rated PlayStation 5 games.",
      entries: topBy(entries.filter((entry) => platformMatches(entry, ["playstation 5", "ps5"])), (entry) => entry.overallRating),
      score: (entry) => entry.overallRating,
    },
    {
      label: "Top Switch",
      description: "Highest-rated Nintendo Switch games.",
      entries: topBy(entries.filter((entry) => platformMatches(entry, ["nintendo switch", "switch"])), (entry) => entry.overallRating),
      score: (entry) => entry.overallRating,
    },
    {
      label: "Top Story",
      description: "Games with your highest story ratings.",
      entries: topBy(entries, (entry) => entry.storyRating),
      score: (entry) => entry.storyRating,
    },
    {
      label: "Top Music",
      description: "Games with your highest music ratings.",
      entries: topBy(entries, (entry) => entry.musicRating),
      score: (entry) => entry.musicRating,
    },
    {
      label: "Top Gameplay",
      description: "Games with your highest gameplay ratings.",
      entries: topBy(entries, (entry) => entry.gameplayRating),
      score: (entry) => entry.gameplayRating,
    },
    {
      label: "Top Art",
      description: "Games with your highest art ratings.",
      entries: topBy(entries, (entry) => entry.artRating),
      score: (entry) => entry.artRating,
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <header className="overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950 p-7 shadow-2xl shadow-black/30 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">Game Vault</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Hall of Fame</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 sm:text-lg">
            An automatically generated celebration of your highest-rated games, category leaders, and definitive personal rankings.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm">
            <StatPill value={entries.length} label="Rated games" />
            <StatPill value={ranked.filter((entry) => entry.overallRating >= 9).length} label="9+ games" />
            <StatPill value={ranked.filter((entry) => entry.overallRating === 10).length} label="Perfect scores" />
          </div>
        </header>

        <section className="space-y-5">
          <SectionHeading eyebrow="Masterpieces" title="Your highest honours" description="Each game appears in one non-overlapping rating tier." />
          <div className="space-y-6">
            {masterpieceTiers.map((tier) => (
              <div key={tier.title} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold">{tier.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{tier.subtitle}</p>
                  </div>
                  <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm text-zinc-300">{tier.entries.length} games</span>
                </div>
                {tier.entries.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {tier.entries.map((entry) => <GamePoster key={entry.id} entry={entry} />)}
                  </div>
                ) : (
                  <EmptyState text="No games in this tier yet." />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeading eyebrow="Categories" title="The best of your collection" description="Category leaders use the relevant subrating when available, otherwise your overall score." />
          <div className="grid gap-5 lg:grid-cols-2">
            {categories.map((category) => (
              <article key={category.label} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
                <h3 className="text-xl font-bold">{category.label}</h3>
                <p className="mt-1 text-sm text-zinc-400">{category.description}</p>
                <div className="mt-5 space-y-3">
                  {category.entries.length ? category.entries.map((entry, index) => (
                    <Link key={entry.id} href={hrefFor(entry)} className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 transition hover:border-amber-400/50 hover:bg-zinc-900">
                      <span className="w-7 shrink-0 text-center text-lg font-black text-zinc-600 group-hover:text-amber-300">{index + 1}</span>
                      <Cover entry={entry} small />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-zinc-100">{entry.title}</p>
                        <p className="mt-1 truncate text-xs text-zinc-500">{entry.genres.slice(0, 2).join(" • ") || entry.franchise || "Rated game"}</p>
                      </div>
                      <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-bold text-amber-200">{category.score(entry)?.toFixed(1)}</span>
                    </Link>
                  )) : <EmptyState text="No eligible games in this category." />}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Rankings" title={`Your Top ${rankingLimit}`} description="Ordered by overall rating, then subrating average, hours, and title." />
            <div className="flex rounded-xl border border-zinc-800 bg-zinc-900 p-1">
              {([10, 50, 100] as const).map((limit) => (
                <button key={limit} type="button" onClick={() => setRankingLimit(limit)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${rankingLimit === limit ? "bg-amber-400 text-zinc-950" : "text-zinc-400 hover:text-white"}`}>
                  Top {limit}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60">
            {ranked.slice(0, rankingLimit).map((entry, index) => (
              <Link key={entry.id} href={hrefFor(entry)} className="group grid grid-cols-[3rem_3.2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-800 p-4 transition last:border-b-0 hover:bg-zinc-800/60 sm:grid-cols-[4rem_3.5rem_minmax(0,1fr)_8rem_7rem] sm:gap-5">
                <span className={`text-center text-xl font-black ${index < 3 ? "text-amber-300" : "text-zinc-600"}`}>#{index + 1}</span>
                <Cover entry={entry} small />
                <div className="min-w-0">
                  <p className="truncate font-bold text-zinc-100 group-hover:text-amber-200">{entry.title}</p>
                  <p className="mt-1 truncate text-xs text-zinc-500">{entry.genres.slice(0, 3).join(" • ") || "Uncategorized"}</p>
                </div>
                <div className="hidden text-right text-sm text-zinc-400 sm:block">{entry.hours != null ? `${entry.hours.toFixed(1)}h` : "—"}</div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-lg font-black text-amber-200">{entry.overallRating.toFixed(1)}</div>
              </Link>
            ))}
            {!ranked.length && <div className="p-8"><EmptyState text="Add overall ratings to generate your rankings." /></div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">{eyebrow}</p><h2 className="mt-2 text-3xl font-black tracking-tight">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p></div>;
}

function StatPill({ value, label }: { value: number; label: string }) {
  return <div className="rounded-2xl border border-zinc-700/80 bg-zinc-950/65 px-4 py-3"><span className="text-xl font-black text-amber-200">{value}</span><span className="ml-2 text-zinc-400">{label}</span></div>;
}

function Cover({ entry, small = false }: { entry: Entry; small?: boolean }) {
  return entry.coverArtUrl ? <img src={entry.coverArtUrl} alt="" className={`${small ? "h-14 w-10" : "aspect-[2/3] w-full"} shrink-0 rounded-lg object-cover bg-zinc-800`} /> : <div className={`${small ? "h-14 w-10" : "aspect-[2/3] w-full"} flex shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-600`}>No art</div>;
}

function GamePoster({ entry }: { entry: Entry }) {
  return <Link href={hrefFor(entry)} className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-xl hover:shadow-black/30"><Cover entry={entry} /><div className="p-3"><p className="line-clamp-2 min-h-10 text-sm font-semibold group-hover:text-amber-200">{entry.title}</p><div className="mt-3 flex items-center justify-between"><span className="text-xs text-zinc-500">{entry.releaseDate ? new Date(entry.releaseDate).getUTCFullYear() : "—"}</span><span className="rounded-lg bg-amber-500/10 px-2 py-1 text-sm font-black text-amber-200">{entry.overallRating.toFixed(1)}</span></div></div></Link>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">{text}</div>;
}
