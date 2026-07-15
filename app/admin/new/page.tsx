import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { enrichSingleGame } from "@/lib/enrichGame";
import { revalidateGameData } from "@/lib/revalidateGameData";
import { AdminEditForm } from "@/components/admin/AdminEditForm";
import { InlineRatingInput } from "@/components/admin/InlineRatingInput";
import { QuickStatusButtons } from "@/components/admin/QuickStatusButtons";

type PlatformOption = {
  id: number;
  name: string;
};

type GenreOption = {
  id: number;
  name: string;
};

function parseNullableNumber(value: FormDataEntryValue | null) {
  if (!value) return null;

  const text = String(value).trim();
  if (text === "") return null;

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

async function createGame(formData: FormData) {
  "use server";

  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    throw new Error("Title is required");
  }

  const coverArtUrl = String(formData.get("coverArtUrl") ?? "").trim();
  const isEndless = formData.get("isEndless") === "on";
  const status = String(formData.get("status") ?? "BACKLOG") as
    | "BACKLOG"
    | "PLAYING"
    | "COMPLETED"
    | "DROPPED"
    | "REPLAYING"
    | "ONHOLD";
  const platformIdRaw = String(formData.get("platformId") ?? "");
  const platformId =
    platformIdRaw === "NONE" || platformIdRaw === ""
      ? null
      : Number(platformIdRaw);

  if (platformId !== null && !Number.isInteger(platformId)) {
    throw new Error("Invalid platform ID");
  }

  const genreIds = [
    ...new Set(
      formData
        .getAll("genreIds")
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value)),
    ),
  ];
  const dateCompletedText = String(formData.get("dateCompleted") ?? "").trim();
  const dateCompleted = dateCompletedText ? new Date(dateCompletedText) : null;
  const overallRating = parseNullableNumber(formData.get("overallRating"));
  const gameplayRating = parseNullableNumber(formData.get("gameplayRating"));
  const storyRating = parseNullableNumber(formData.get("storyRating"));
  const artRating = parseNullableNumber(formData.get("artRating"));
  const musicRating = parseNullableNumber(formData.get("musicRating"));
  const notes = String(formData.get("notes") ?? "").trim();
  const hasReview =
    overallRating != null ||
    gameplayRating != null ||
    storyRating != null ||
    artRating != null ||
    musicRating != null ||
    notes !== "";

  const gameId = await prisma.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        title,
        isEndless,
        coverArtUrl: coverArtUrl || null,
        metacriticScore: parseNullableNumber(formData.get("metacriticScore")),
        hltbMain: parseNullableNumber(formData.get("hltbMain")),
        hltbMainExtra: parseNullableNumber(formData.get("hltbMainExtra")),
        hltbCompletionist: parseNullableNumber(
          formData.get("hltbCompletionist"),
        ),
      },
    });

    const userGame = await tx.userGame.create({
      data: {
        gameId: game.id,
        status,
        platformId,
        hoursPlayed: parseNullableNumber(formData.get("hoursPlayed")),
        dateCompleted,
      },
    });

    if (hasReview) {
      await tx.review.create({
        data: {
          userGameId: userGame.id,
          overallRating,
          gameplayRating,
          storyRating,
          artRating,
          musicRating,
          notes: notes || null,
          reviewDate: dateCompleted,
        },
      });
    }

    if (genreIds.length > 0) {
      await tx.gameGenre.createMany({
        data: genreIds.map((genreId) => ({
          gameId: game.id,
          genreId,
        })),
        skipDuplicates: true,
      });
    }

    return game.id;
  });

  // External enrichment is intentionally outside the database transaction.
  // A slow third-party API should never hold database locks open.
  await enrichSingleGame(gameId);

  revalidateGameData();
  redirect(`/game/${gameId}`);
}

export default async function NewGamePage() {
  const platforms: PlatformOption[] = await prisma.platform.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  const genres: GenreOption[] = await prisma.genre.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/admin"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:border-zinc-400"
        >
          ← Admin
        </Link>

        <Link
          href="/"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:border-zinc-400"
        >
          Library
        </Link>
      </div>

      <h1 className="text-4xl font-bold">Add Game</h1>
      <p className="mt-2 text-zinc-400">
        Add a new game directly to your collection.
      </p>

      <AdminEditForm
        action={createGame}
        cancelHref="/admin"
        submitLabel="Add Game"
        className="mt-8 max-w-5xl space-y-6"
      >
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Game Metadata</h2>

          <div className="space-y-4">
            <Field label="Title">
              <input
                name="title"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
              />
            </Field>

            <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
              <input type="checkbox" name="isEndless" />
              <span>
                Party / Endless Game
                <span className="block text-xs text-zinc-500">
                  Exclude from backlog and completion-required stats.
                </span>
              </span>
            </label>

            <Field label="Cover Art URL">
              <input
                name="coverArtUrl"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Metacritic">
                <input
                  name="metacriticScore"
                  type="number"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
                />
              </Field>

              <Field label="HLTB Main">
                <input
                  name="hltbMain"
                  type="number"
                  step="0.5"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
                />
              </Field>

              <Field label="HLTB Main Extra">
                <input
                  name="hltbMainExtra"
                  type="number"
                  step="0.5"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
                />
              </Field>

              <Field label="HLTB Completionist">
                <input
                  name="hltbCompletionist"
                  type="number"
                  step="0.5"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-xl font-bold">First Copy</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Quick Status">
              <QuickStatusButtons defaultValue="BACKLOG" />
            </Field>

            <Field label="Platform">
              <select
                name="platformId"
                defaultValue="NONE"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
              >
                <option value="NONE">Unknown Platform</option>
                {platforms.map((platform: PlatformOption) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Your Hours">
              <input
                name="hoursPlayed"
                type="number"
                step="0.5"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
              />
            </Field>

            <Field label="Date Completed">
              <input
                name="dateCompleted"
                type="date"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Review</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Overall">
              <InlineRatingInput name="overallRating" />
            </Field>

            <Field label="Gameplay">
              <InlineRatingInput name="gameplayRating" />
            </Field>

            <Field label="Story">
              <InlineRatingInput name="storyRating" />
            </Field>

            <Field label="Art">
              <InlineRatingInput name="artRating" />
            </Field>

            <Field label="Music">
              <InlineRatingInput name="musicRating" />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Notes">
              <textarea
                name="notes"
                rows={5}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-zinc-400"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-xl font-bold">Genres</h2>

          <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {genres.map((genre: GenreOption) => (
              <label
                key={genre.id}
                className="flex items-center gap-2 text-sm text-zinc-300"
              >
                <input type="checkbox" name="genreIds" value={genre.id} />
                {genre.name}
              </label>
            ))}
          </div>
        </section>
      </AdminEditForm>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-sm font-medium text-zinc-400">{label}</p>
      {children}
    </label>
  );
}
