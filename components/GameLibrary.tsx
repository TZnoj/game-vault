"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { GameStatus } from "@prisma/client";
import Link from "next/link";
import { RatingBadge } from "@/components/RatingBadge";
import { StatusBadge } from "@/components/StatusBadge";


type GameLibraryItem = {
  id: number;
  status: GameStatus;
  hoursPlayed: number | null;
  dateCompleted: Date | null;
  platform: { name: string } | null;
  game: {
    id: number;
    title: string;
    coverArtUrl: string | null;
    hltbMain: number | null;
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
}: {
  userGames: GameLibraryItem[];
  initialGenre?: string;
  initialRating?: string;
  initialFranchise?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | GameStatus>("ALL");
  const [genreFilter, setGenreFilter] = useState(initialGenre);
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("dateCompleted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [ratingFilter, setRatingFilter] = useState(initialRating);
  const [franchiseFilter, setFranchiseFilter] = useState(initialFranchise);

  const allGenres = useMemo(() => {
    const genres = new Set<string>();

    for (const userGame of userGames) {
      for (const gameGenre of userGame.game.gameGenres ?? []) {
        genres.add(gameGenre.genre.name);
      }
    }

    return [...genres].sort();
  }, [userGames]);

  const allPlatforms = useMemo(() => {
    const platforms = new Set<string>();

    for (const userGame of userGames) {
      if (userGame.platform?.name) {
        platforms.add(userGame.platform.name);
      }
    }

    return [...platforms].sort();
  }, [userGames]);

  const allFranchises = useMemo(() => {
    const franchises = new Set<string>();

    for (const userGame of userGames) {
      if (userGame.game.franchise?.name) {
        franchises.add(userGame.game.franchise.name);
      }
    }

    return [...franchises].sort();
  }, [userGames]);

  const filteredGames = useMemo(() => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return userGames
      .filter((userGame) => {
        const normalizedSearch = search.toLowerCase();

        const matchesSearch =
          userGame.game.title.toLowerCase().includes(normalizedSearch) ||
          userGame.game.franchise?.name
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesStatus = status === "ALL" || userGame.status === status;

        const gameGenres = getGenres(userGame);

        const matchesFranchise =
          franchiseFilter === "ALL" ||
          userGame.game.franchise?.name === franchiseFilter;

        const matchesGenre =
          genreFilter === "ALL" || gameGenres.includes(genreFilter);

        const matchesPlatform =
          platformFilter === "ALL" ||
          userGame.platform?.name === platformFilter;

        const latestRating = userGame.reviews[0]?.overallRating;

        const matchesRating =
          ratingFilter === "ALL" ||
          (latestRating != null &&
            Math.floor(latestRating) === Number(ratingFilter));

        return (
          matchesSearch &&
          matchesStatus &&
          matchesGenre &&
          matchesPlatform &&
          matchesRating &&
          matchesFranchise
        );
      })
      .sort((a, b) => {
        let result = 0;

        if (sortBy === "title") {
          result = a.game.title.localeCompare(b.game.title);
        }

        if (sortBy === "rating") {
          const aRating = a.reviews[0]?.overallRating ?? -1;
          const bRating = b.reviews[0]?.overallRating ?? -1;
          result = aRating - bRating;
        }

        if (sortBy === "hoursPlayed") {
          result = (a.hoursPlayed ?? 0) - (b.hoursPlayed ?? 0);
        }

        if (sortBy === "dateCompleted") {
          const aDate = a.dateCompleted
            ? new Date(a.dateCompleted).getTime()
            : 0;
          const bDate = b.dateCompleted
            ? new Date(b.dateCompleted).getTime()
            : 0;
          result = aDate - bDate;
        }

        if (sortBy === "platform") {
          result = (a.platform?.name ?? "zzz").localeCompare(
            b.platform?.name ?? "zzz",
          );
        }

        if (sortBy === "genre") {
          result = getPrimaryGenre(a).localeCompare(getPrimaryGenre(b));
        }

        if (sortBy === "franchise") {
          result = (a.game.franchise?.name ?? "zzz").localeCompare(
            b.game.franchise?.name ?? "zzz",
          );
        }

        return result * directionMultiplier;
      });
  }, [
    userGames,
    search,
    status,
    genreFilter,
    platformFilter,
    ratingFilter,
    franchiseFilter,
    sortBy,
    sortDirection,
  ]);

  const completionEligibleGames = filteredGames.filter(
  (userGame) => !userGame.game.isEndless,
);

const completedGames = completionEligibleGames.filter(
  (game) => game.status === "COMPLETED",
);

  const totalHours = completedGames.reduce(
    (sum, game) => sum + (game.hoursPlayed ?? 0),
    0,
  );

  const ratings = filteredGames
    .map((game) => game.reviews[0]?.overallRating)
    .filter((rating): rating is number => rating != null);

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null;

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Game Vault</h1>
        <p className="mt-2 text-zinc-400">
          {filteredGames.length} of {userGames.length} games shown
        </p>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Shown Games" value={filteredGames.length} />
        <StatCard label="Completed" value={completedGames.length} />
        <StatCard label="Hours Played" value={totalHours.toFixed(1)} />
        <StatCard
          label="Average Rating"
          value={averageRating != null ? averageRating.toFixed(1) : "N/A"}
        />
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-3 xl:grid-cols-8">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search games..."
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-400"
        />

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "ALL" | GameStatus)
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-400"
        >
          <option value="ALL">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PLAYING">Playing</option>
          <option value="ONHOLD">On Hold</option>
          <option value="BACKLOG">Backlog</option>
          <option value="DROPPED">Dropped</option>
          <option value="REPLAYING">Replaying</option>
        </select>

        <select
          value={ratingFilter}
          onChange={(event) => setRatingFilter(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-400"
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

        <select
          value={genreFilter}
          onChange={(event) => setGenreFilter(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-400"
        >
          <option value="ALL">All Genres</option>
          {allGenres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>

        <select
          value={franchiseFilter}
          onChange={(event) => setFranchiseFilter(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-400"
        >
          <option value="ALL">All Franchises</option>
          {allFranchises.map((franchise) => (
            <option key={franchise} value={franchise}>
              {franchise}
            </option>
          ))}
        </select>

        <select
          value={platformFilter}
          onChange={(event) => setPlatformFilter(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-400"
        >
          <option value="ALL">All Platforms</option>
          {allPlatforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-zinc-400"
        >
          <option value="dateCompleted">Sort by Date Completed</option>
          <option value="rating">Sort by Rating</option>
          <option value="title">Sort by Title</option>
          <option value="hoursPlayed">Sort by Hours Played</option>
          <option value="platform">Sort by Platform</option>
          <option value="franchise">Sort by Franchise</option>
          <option value="genre">Sort by Genre</option>
        </select>

        <button
          onClick={() =>
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white hover:border-zinc-400"
        >
          {sortDirection === "asc" ? "Ascending ↑" : "Descending ↓"}
        </button>
      </section>

      <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {filteredGames.map((userGame) => (
          <GameCard key={userGame.id} userGame={userGame} />
        ))}
      </div>
    </main>
  );
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
                userGame.game.franchise.name
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
