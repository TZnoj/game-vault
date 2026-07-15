"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Link from "next/link";
import { RatingBadge } from "@/components/RatingBadge";
import { StatusBadge } from "@/components/StatusBadge";

type GameStatus =
  | "BACKLOG"
  | "PLAYING"
  | "COMPLETED"
  | "DROPPED"
  | "REPLAYING"
  | "ONHOLD";

type GameLibraryItem = {
  id: number;
  status: GameStatus;
  hoursPlayed: number | null;
  dateStarted: Date | null;
  dateCompleted: Date | null;
  createdAt: Date;
  platform: { name: string } | null;
  game: {
    id: number;
    title: string;
    coverArtUrl: string | null;
    hltbMain: number | null;
    releaseDate: Date | null;
    developer?: string | null;
    publisher?: string | null;
    metacriticScore: number | null;
    isEndless: boolean;
    franchise: {
      id: number;
      name: string;
    } | null;
    gameGenres?: {
      genre: {
        name: string;
      };
    }[];
  };
  reviews: {
    overallRating: number | null;
    gameplayRating: number | null;
    storyRating: number | null;
    artRating: number | null;
    musicRating: number | null;
    notes: string | null;
  }[];
};

type SortOption =
  | "dateCompleted"
  | "rating"
  | "title"
  | "hoursPlayed"
  | "platform"
  | "genre"
  | "franchise";

type SortDirection = "asc" | "desc";

export function GameLibrary({
  userGames,
  initialGenre = "ALL",
  initialRating = "ALL",
  initialFranchise = "ALL",
  showSummaryStats = true,
}: {
  userGames: GameLibraryItem[];
  initialGenre?: string;
  initialRating?: string;
  initialFranchise?: string;
  showSummaryStats?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<GameStatus[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialGenre !== "ALL" ? [initialGenre] : [],
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedFranchises, setSelectedFranchises] = useState<string[]>(
    initialFranchise !== "ALL" ? [initialFranchise] : [],
  );
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [minimumHours, setMinimumHours] = useState("");
  const [maximumHours, setMaximumHours] = useState("");
  const [minimumRating, setMinimumRating] = useState(
    initialRating !== "ALL" ? initialRating : "",
  );
  const [maximumRating, setMaximumRating] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("dateCompleted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const allGenres = useMemo(
    () => [...new Set(userGames.flatMap((item) => getGenres(item)))].sort(),
    [userGames],
  );
  const allPlatforms = useMemo(
    () =>
      [
        ...new Set(
          userGames
            .map((item) => item.platform?.name)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [userGames],
  );
  const allFranchises = useMemo(
    () =>
      [
        ...new Set(
          userGames
            .map((item) => item.game.franchise?.name)
            .filter(
              (value): value is string =>
                Boolean(value) && value.toLowerCase() !== "standalone",
            ),
        ),
      ].sort(),
    [userGames],
  );
  const allYears = useMemo(() => {
    const years = new Set<number>();
    for (const item of userGames) {
      for (const value of [
        item.dateCompleted,
        item.dateStarted,
        item.game.releaseDate,
        item.createdAt,
      ]) {
        if (value) years.add(new Date(value).getUTCFullYear());
      }
    }
    return [...years].sort((a, b) => b - a);
  }, [userGames]);

  const filteredGames = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const minHours = minimumHours === "" ? null : Number(minimumHours);
    const maxHours = maximumHours === "" ? null : Number(maximumHours);
    const minRating = minimumRating === "" ? null : Number(minimumRating);
    const maxRating = maximumRating === "" ? null : Number(maximumRating);
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return userGames
      .filter((item) => {
        const latestReview = item.reviews[0];
        const genres = getGenres(item);
        const statusLabel = formatStatus(item.status);
        const years = [
          item.dateCompleted,
          item.dateStarted,
          item.game.releaseDate,
          item.createdAt,
        ]
          .filter(Boolean)
          .map((value) => new Date(value as Date).getUTCFullYear());
        const searchable = [
          item.game.title,
          ...genres,
          item.platform?.name,
          item.game.franchise?.name,
          item.game.developer,
          item.game.publisher,
          latestReview?.notes,
          item.status,
          statusLabel,
          ...years.map(String),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (normalizedSearch && !searchable.includes(normalizedSearch))
          return false;
        if (selectedStatuses.length && !selectedStatuses.includes(item.status))
          return false;
        if (
          selectedGenres.length &&
          !selectedGenres.some((genre) => genres.includes(genre))
        )
          return false;
        if (
          selectedPlatforms.length &&
          (!item.platform || !selectedPlatforms.includes(item.platform.name))
        )
          return false;
        if (
          selectedFranchises.length &&
          (!item.game.franchise ||
            !selectedFranchises.includes(item.game.franchise.name))
        )
          return false;
        if (
          selectedYears.length &&
          !selectedYears.some((year) => years.includes(year))
        )
          return false;
        if (
          minHours != null &&
          (item.hoursPlayed == null || item.hoursPlayed < minHours)
        )
          return false;
        if (
          maxHours != null &&
          (item.hoursPlayed == null || item.hoursPlayed > maxHours)
        )
          return false;
        const rating = latestReview?.overallRating;
        if (minRating != null && (rating == null || rating < minRating))
          return false;
        if (maxRating != null && (rating == null || rating > maxRating))
          return false;
        return true;
      })
      .sort((a, b) => {
        let result = 0;
        if (sortBy === "title")
          result = a.game.title.localeCompare(b.game.title);
        if (sortBy === "rating")
          result =
            (a.reviews[0]?.overallRating ?? -1) -
            (b.reviews[0]?.overallRating ?? -1);
        if (sortBy === "hoursPlayed")
          result = (a.hoursPlayed ?? 0) - (b.hoursPlayed ?? 0);
        if (sortBy === "dateCompleted")
          result =
            (a.dateCompleted ? new Date(a.dateCompleted).getTime() : 0) -
            (b.dateCompleted ? new Date(b.dateCompleted).getTime() : 0);
        if (sortBy === "platform")
          result = (a.platform?.name ?? "zzz").localeCompare(
            b.platform?.name ?? "zzz",
          );
        if (sortBy === "genre")
          result = getPrimaryGenre(a).localeCompare(getPrimaryGenre(b));
        if (sortBy === "franchise")
          result = (a.game.franchise?.name ?? "zzz").localeCompare(
            b.game.franchise?.name ?? "zzz",
          );
        return result * directionMultiplier;
      });
  }, [
    userGames,
    search,
    selectedStatuses,
    selectedGenres,
    selectedPlatforms,
    selectedFranchises,
    selectedYears,
    minimumHours,
    maximumHours,
    minimumRating,
    maximumRating,
    sortBy,
    sortDirection,
  ]);

  const completedGames = filteredGames.filter(
    (item) => item.status === "COMPLETED" && !item.game.isEndless,
  );
  const totalHours = completedGames.reduce(
    (sum, item) => sum + (item.hoursPlayed ?? 0),
    0,
  );
  const ratings = filteredGames
    .map((item) => item.reviews[0]?.overallRating)
    .filter((rating): rating is number => rating != null);
  const averageRating = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : null;
  const activeFilters =
    selectedStatuses.length +
    selectedGenres.length +
    selectedPlatforms.length +
    selectedFranchises.length +
    selectedYears.length +
    (minimumHours ? 1 : 0) +
    (maximumHours ? 1 : 0) +
    (minimumRating ? 1 : 0) +
    (maximumRating ? 1 : 0);

  function clearFilters() {
    setSearch("");
    setSelectedStatuses([]);
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSelectedFranchises([]);
    setSelectedYears([]);
    setMinimumHours("");
    setMaximumHours("");
    setMinimumRating("");
    setMaximumRating("");
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-6">
        <p className="text-zinc-400">
          {filteredGames.length} of {userGames.length} games shown
        </p>
      </div>

      {showSummaryStats && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Shown Games" value={filteredGames.length} />
          <StatCard label="Completed" value={completedGames.length} />
          <StatCard label="Hours Played" value={totalHours.toFixed(1)} />
          <StatCard
            label="Average Rating"
            value={averageRating != null ? averageRating.toFixed(1) : "N/A"}
          />
        </section>
      )}

      <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, genre, platform, franchise, notes, review, status or year..."
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
          />
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 font-semibold hover:border-zinc-500"
          >
            Advanced Filters{activeFilters ? ` (${activeFilters})` : ""}{" "}
            {showAdvanced ? "▲" : "▼"}
          </button>
          {(search || activeFilters > 0) && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-red-900/70 bg-red-950/30 px-5 py-3 text-red-200 hover:border-red-700"
            >
              Clear
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="mt-5 grid gap-5 border-t border-zinc-800 pt-5 md:grid-cols-2 xl:grid-cols-3">
            <MultiSelect
              title="Completion Status"
              options={STATUS_OPTIONS}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
            />
            <MultiSelect
              title="Platforms"
              options={allPlatforms.map((value) => ({ value, label: value }))}
              selected={selectedPlatforms}
              onChange={setSelectedPlatforms}
            />
            <MultiSelect
              title="Genres"
              options={allGenres.map((value) => ({ value, label: value }))}
              selected={selectedGenres}
              onChange={setSelectedGenres}
            />
            <MultiSelect
              title="Franchises"
              options={allFranchises.map((value) => ({ value, label: value }))}
              selected={selectedFranchises}
              onChange={setSelectedFranchises}
            />
            <MultiSelect
              title="Years"
              options={allYears.map((value) => ({
                value,
                label: String(value),
              }))}
              selected={selectedYears}
              onChange={setSelectedYears}
            />
            <div className="space-y-4">
              <RangeFilter
                title="Hours Played"
                minimum={minimumHours}
                maximum={maximumHours}
                setMinimum={setMinimumHours}
                setMaximum={setMaximumHours}
                step="0.5"
              />
              <RangeFilter
                title="Overall Rating"
                minimum={minimumRating}
                maximum={maximumRating}
                setMinimum={setMinimumRating}
                setMaximum={setMaximumRating}
                step="0.5"
                max="10"
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t border-zinc-800 pt-5 sm:flex-row">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
          >
            <option value="dateCompleted">Sort by Date Completed</option>
            <option value="rating">Sort by Rating</option>
            <option value="title">Sort by Title</option>
            <option value="hoursPlayed">Sort by Hours</option>
            <option value="platform">Sort by Platform</option>
            <option value="franchise">Sort by Franchise</option>
            <option value="genre">Sort by Genre</option>
          </select>
          <button
            type="button"
            onClick={() =>
              setSortDirection((value) => (value === "asc" ? "desc" : "asc"))
            }
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 hover:border-zinc-500"
          >
            {sortDirection === "asc" ? "Ascending ↑" : "Descending ↓"}
          </button>
        </div>
      </section>

      {filteredGames.length ? (
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filteredGames.map((item) => (
            <GameCard key={item.id} userGame={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-12 text-center text-zinc-400">
          <p className="text-xl font-semibold text-white">
            No games match those filters
          </p>
          <p className="mt-2">
            Try removing a filter or searching for a broader term.
          </p>
        </div>
      )}
    </main>
  );
}

const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: "COMPLETED", label: "Completed" },
  { value: "PLAYING", label: "Playing" },
  { value: "REPLAYING", label: "Replaying" },
  { value: "BACKLOG", label: "Backlog" },
  { value: "ONHOLD", label: "On Hold" },
  { value: "DROPPED", label: "Dropped" },
];

function MultiSelect<T extends string | number>({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (values: T[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-zinc-200">
        {title}
      </legend>
      <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-2">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={String(option.value)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-900"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked
                      ? selected.filter((value) => value !== option.value)
                      : [...selected, option.value],
                  )
                }
                className="accent-white"
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function RangeFilter({
  title,
  minimum,
  maximum,
  setMinimum,
  setMaximum,
  step,
  max,
}: {
  title: string;
  minimum: string;
  maximum: string;
  setMinimum: (value: string) => void;
  setMaximum: (value: string) => void;
  step: string;
  max?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-zinc-200">
        {title}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          max={max}
          step={step}
          value={minimum}
          onChange={(event) => setMinimum(event.target.value)}
          placeholder="Minimum"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
        <input
          type="number"
          min="0"
          max={max}
          step={step}
          value={maximum}
          onChange={(event) => setMaximum(event.target.value)}
          placeholder="Maximum"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
      </div>
    </fieldset>
  );
}

function formatStatus(status: GameStatus) {
  return status === "ONHOLD"
    ? "On Hold"
    : status.charAt(0) + status.slice(1).toLowerCase();
}

function GameCard({ userGame }: { userGame: GameLibraryItem }) {
  const [showDetailedRatings, setShowDetailedRatings] = useState(false);

  const latestReview = userGame.reviews[0];
  const genres = getGenres(userGame);

  const isCompleted = userGame.status === "COMPLETED";
  const canShowDetailedRatings = isCompleted && latestReview;

  return (
    <article
      onClick={() => {
        if (canShowDetailedRatings) {
          setShowDetailedRatings((current) => !current);
        }
      }}
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-700/70 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-zinc-500 hover:shadow-2xl ${
        canShowDetailedRatings ? "cursor-pointer" : ""
      }`}
    >
      <Link href={`/game/${userGame.game.id}`}>
        <div className="relative aspect-[3/4] bg-zinc-800">
          {userGame.game.coverArtUrl ? (
            <Image
              src={userGame.game.coverArtUrl}
              alt={`${userGame.game.title} cover art`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500">
              No Cover
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/game/${userGame.game.id}`}>
          <h2 className="line-clamp-2 min-h-[2.75rem] text-base font-bold leading-snug hover:text-zinc-300">
            {userGame.game.title}
          </h2>
        </Link>

        <div className="mt-1 flex min-h-[1.25rem] items-center gap-2 text-xs text-zinc-400">
          <span>{userGame.platform?.name ?? "Unknown Platform"}</span>
          <span className="text-zinc-600">•</span>
          <span>{userGame.status}</span>
        </div>

        <div className="mt-3 flex min-h-[2.25rem] flex-wrap content-start gap-1.5">
          {genres.length > 0 ? (
            genres.slice(0, 4).map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200"
              >
                {genre}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-500">
              Unknown Genre
            </span>
          )}
        </div>

        <div className="mt-2 min-h-[1.25rem]">
          {userGame.game.franchise ? (
            <a
              href={`/?franchise=${encodeURIComponent(
                userGame.game.franchise.name,
              )}`}
              className="inline-block text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
            >
              {userGame.game.franchise.name}
            </a>
          ) : (
            <span className="block text-xs text-transparent">No Franchise</span>
          )}
        </div>

        <div className="my-3 h-px bg-zinc-800" />

        <Link href={`/game/${userGame.game.id}`} className="mt-auto block">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {showDetailedRatings && latestReview ? (
              <>
                <InfoBox
                  label="Gameplay"
                  value={formatRating(latestReview.gameplayRating)}
                />
                <InfoBox
                  label="Story"
                  value={formatRating(latestReview.storyRating)}
                />
                <InfoBox
                  label="Art"
                  value={formatRating(latestReview.artRating)}
                />
                <InfoBox
                  label="Music"
                  value={formatRating(latestReview.musicRating)}
                />
              </>
            ) : (
              <>
                <InfoBox
                  label="Your Time"
                  value={formatHours(userGame.hoursPlayed)}
                />
                <InfoBox
                  label="HLTB"
                  value={formatHours(userGame.game.hltbMain)}
                />
                <div className="rounded-lg bg-zinc-800/80 p-2.5">
                  <p className="text-zinc-500">Rating</p>
                  <div className="mt-1">
                    <RatingBadge rating={latestReview?.overallRating} compact />
                  </div>
                </div>
                <InfoBox
                  label="Metacritic Rating"
                  value={userGame.game.metacriticScore ?? "N/A"}
                />
              </>
            )}
          </div>
        </Link>

        <div className="min-h-[1rem] pt-2">
          {canShowDetailedRatings ? (
            <p className="text-xs text-zinc-500">
              Click card to{" "}
              {showDetailedRatings ? "show stats" : "show rating breakdown"}
            </p>
          ) : (
            <span className="block text-xs text-transparent">No toggle</span>
          )}
        </div>

        <div className="min-h-[2.75rem] pt-2">
          {latestReview?.notes ? (
            <p className="line-clamp-2 text-xs italic leading-relaxed text-zinc-400">
              {latestReview.notes}
            </p>
          ) : (
            <span className="block text-xs text-transparent">No notes</span>
          )}
        </div>
      </div>
    </article>
  );
}

function getGenres(userGame: GameLibraryItem) {
  return (
    userGame.game.gameGenres?.map((gameGenre) => gameGenre.genre.name).sort() ??
    []
  );
}

function getPrimaryGenre(userGame: GameLibraryItem) {
  return getGenres(userGame)[0] ?? "Unknown Genre";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-2">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function formatRating(rating: number | null | undefined) {
  return rating != null ? `${rating}/10` : "N/A";
}

function formatHours(hours: number | null) {
  return hours != null ? `${hours} hrs` : "N/A";
}
