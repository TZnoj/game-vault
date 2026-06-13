import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function MissingInfoPage() {
  const games = await prisma.game.findMany({
    orderBy: {
      title: "asc",
    },
    include: {
      franchise: true,
      gameGenres: {
        include: {
          genre: true,
        },
      },
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
    },
  });

  const rows = games
    .map((game) => {
      const userGame = game.userGames[0];
      const review = userGame?.reviews[0];

      const missing: string[] = [];

      if (!game.coverArtUrl) missing.push("Cover");
      if (game.hltbMain == null) missing.push("HLTB");
      if (game.metacriticScore == null) missing.push("Metacritic");
      if (!userGame?.platform) missing.push("Platform");
      if (game.gameGenres.length === 0) missing.push("Genre");
      if (!game.franchise) missing.push("Franchise");
      if (game.isEndless) {
  missing.push("Endless");
}

      if (
  !game.isEndless &&
  userGame?.status === "COMPLETED"
) {
        if (!review) {
          missing.push("Review");
        } else {
          if (review.overallRating == null) missing.push("Overall");
          if (review.gameplayRating == null) missing.push("Gameplay");
          if (review.storyRating == null) missing.push("Story");
          if (review.artRating == null) missing.push("Art");
          if (review.musicRating == null) missing.push("Music");
          if (!review.notes) missing.push("Notes");
        }

        if (!userGame.dateCompleted) missing.push("Date Completed");
        if (userGame.hoursPlayed == null) missing.push("Your Hours");
      }

      return {
        game,
        userGame,
        review,
        missing,
      };
    })
    .filter((row) => row.missing.length > 0);

  const missingCover = rows.filter((row) =>
    row.missing.includes("Cover")
  ).length;

  const missingHltb = rows.filter((row) =>
    row.missing.includes("HLTB")
  ).length;

  const missingPlatform = rows.filter((row) =>
    row.missing.includes("Platform")
  ).length;

  const missingGenre = rows.filter((row) =>
    row.missing.includes("Genre")
  ).length;

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Missing Info</h1>
            <p className="mt-2 text-zinc-400">
              Games with incomplete metadata, ratings, or tracking fields.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:border-zinc-400"
          >
            Admin
          </Link>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Games Needing Work" value={rows.length} />
          <StatCard label="Missing Covers" value={missingCover} />
          <StatCard label="Missing HLTB" value={missingHltb} />
          <StatCard label="Missing Platforms" value={missingPlatform} />
          <StatCard label="Missing Genres" value={missingGenre} />
        </section>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="grid grid-cols-[64px_1fr_1.4fr_100px] gap-4 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span>Cover</span>
            <span>Game</span>
            <span>Missing</span>
            <span>Edit</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {rows.map((row) => (
              <Link
                key={row.game.id}
                href={`/admin/game/${row.game.id}`}
                className="grid grid-cols-[64px_1fr_1.4fr_100px] items-center gap-4 px-4 py-3 hover:bg-zinc-800"
              >
                <div className="relative h-20 w-14 overflow-hidden rounded bg-zinc-800">
                  {row.game.coverArtUrl ? (
                    <Image
                      src={row.game.coverArtUrl}
                      alt={`${row.game.title} cover art`}
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
                  <h2 className="truncate font-semibold">{row.game.title}</h2>
                  <p className="mt-1 truncate text-sm text-zinc-400">
                    {row.userGame?.platform?.name ?? "Unknown Platform"} •{" "}
                    {row.game.franchise?.name ?? "No Franchise"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {row.missing.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <span className="text-sm text-zinc-400">Edit →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}