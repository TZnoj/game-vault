import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type AdminReview = {
  overallRating: number | null;
};

type AdminUserGame = {
  status: string;
  platform: {
    name: string;
  } | null;
  reviews: AdminReview[];
};

type AdminGameGenre = {
  genre: {
    name: string;
  };
};

type AdminGame = {
  id: number;
  title: string;
  coverArtUrl: string | null;
  hltbMain: number | null;
  userGames: AdminUserGame[];
  gameGenres: AdminGameGenre[];
};

export default async function AdminPage() {
  const games = await prisma.game.findMany({
    orderBy: { title: "asc" },
    include: {
      userGames: {
        include: {
          platform: true,
          reviews: {
            orderBy: {
              reviewDate: "desc",
            },
          },
        },
      },
      gameGenres: {
        include: {
          genre: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="mt-4 text-4xl font-bold">Admin</h1>
            <p className="mt-2 text-zinc-400">
              Add games and clean up metadata.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/admin/collection-health"
              className="rounded-lg border border-emerald-700/60 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-200 hover:border-emerald-500 hover:bg-emerald-500/15"
            >
              Collection Health
            </Link>
            <Link
              href="/admin/missing-info"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 font-semibold text-white hover:border-zinc-400"
            >
              Missing Info
            </Link>
            <Link
              href="/admin/enrichment"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 font-semibold text-white hover:border-zinc-400"
            >
              Enrichment Logs
            </Link>
            <Link
              href="/admin/new"
              className="rounded-lg border border-zinc-700 bg-zinc-100 px-4 py-2 font-semibold text-zinc-950 hover:bg-white"
            >
              + Add Game
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-sm text-zinc-400">
            {games.length} games in database. Click any row to edit title, cover
            art, platform, genres, ratings, and notes.
          </p>
        </div>

        <Link
          href="/admin/collection-health"
          className="mb-6 block rounded-2xl border border-emerald-900/70 bg-emerald-950/20 p-5 transition hover:border-emerald-700 hover:bg-emerald-950/30"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                Database quality
              </p>
              <h2 className="mt-1 text-xl font-black text-white">Collection Health</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Review missing metadata, unreviewed completions, date problems,
                possible duplicates, and recommendation issues.
              </p>
            </div>
            <span className="shrink-0 rounded-xl border border-emerald-800 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200">
              Open dashboard →
            </span>
          </div>
        </Link>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="grid grid-cols-[64px_1fr_140px_120px_90px] gap-4 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span>Cover</span>
            <span>Game</span>
            <span>Platform</span>
            <span>Status</span>
            <span>Edit</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {(games as AdminGame[]).map((game: AdminGame) => {
              const userGame = game.userGames[0];
              const review = userGame?.reviews[0];
              const genres = game.gameGenres.map(
  (gameGenre: AdminGameGenre) => gameGenre.genre.name,
);

              return (
                <Link
                  key={game.id}
                  href={`/admin/game/${game.id}`}
                  className="grid grid-cols-[64px_1fr_140px_120px_90px] items-center gap-4 px-4 py-3 hover:bg-zinc-800"
                >
                  <div className="relative h-20 w-14 overflow-hidden rounded bg-zinc-800">
                    {game.coverArtUrl ? (
                      <Image
                        src={game.coverArtUrl}
                        alt={`${game.title} cover art`}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-zinc-500">
                        No Cover
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{game.title}</h2>
                    <p className="mt-1 truncate text-sm text-zinc-400">
                      {genres.length > 0 ? genres.join(", ") : "Unknown Genre"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Rating:{" "}
                      {review?.overallRating != null
                        ? `${review.overallRating}/10`
                        : "N/A"}{" "}
                      • HLTB:{" "}
                      {game.hltbMain != null ? `${game.hltbMain} hrs` : "N/A"}
                    </p>
                  </div>

                  <span className="text-sm text-zinc-300">
                    {userGame?.platform?.name ?? "Unknown"}
                  </span>

                  <span className="text-sm text-zinc-300">
                    {userGame?.status ?? "N/A"}
                  </span>

                  <span className="text-sm text-zinc-400">Edit →</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
