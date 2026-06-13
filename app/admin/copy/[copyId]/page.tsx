import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type PageProps = {
  params: Promise<{
    copyId: string;
  }>;
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  console.log("ADMIN SESSION:", session);

  if (session?.user?.email !== "tylerznoj1995@gmail.com") {
    throw new Error("Unauthorized");
  }
}

function parseNullableNumber(value: FormDataEntryValue | null) {
  if (!value) return null;

  const text = String(value).trim();
  if (text === "") return null;

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function parseNullableDate(value: FormDataEntryValue | null) {
  if (!value) return null;

  const text = String(value).trim();
  if (text === "") return null;

  return new Date(text);
}

async function updateCopy(formData: FormData) {
  "use server";

  await requireAdmin();

  const gameId = Number(formData.get("gameId"));
  const copyId = Number(formData.get("copyId"));
  const platformIdRaw = String(formData.get("platformId") ?? "NONE");
  const status = String(formData.get("status") ?? "BACKLOG") as
  | "BACKLOG"
  | "PLAYING"
  | "COMPLETED"
  | "DROPPED"
  | "REPLAYING"
  | "ONHOLD";

  if (!Number.isInteger(gameId) || !Number.isInteger(copyId)) {
    throw new Error("Invalid IDs");
  }

  const dateCompleted = parseNullableDate(formData.get("dateCompleted"));

  await prisma.userGame.update({
    where: {
      id: copyId,
    },
    data: {
      status,
      platformId:
        platformIdRaw === "NONE" || platformIdRaw === ""
          ? null
          : Number(platformIdRaw),
      hoursPlayed: parseNullableNumber(formData.get("hoursPlayed")),
      dateStarted: parseNullableDate(formData.get("dateStarted")),
      dateCompleted,
    },
  });

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

  const existingReview = await prisma.review.findFirst({
    where: {
      userGameId: copyId,
    },
    orderBy: {
      reviewDate: "desc",
    },
  });

  if (existingReview && hasReview) {
    await prisma.review.update({
      where: {
        id: existingReview.id,
      },
      data: {
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

  if (!existingReview && hasReview) {
    await prisma.review.create({
      data: {
        userGameId: copyId,
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

  if (existingReview && !hasReview) {
    await prisma.review.delete({
      where: {
        id: existingReview.id,
      },
    });
  }

  redirect(`/admin/game/${gameId}`);
}

async function deleteCopy(formData: FormData) {
  "use server";

  await requireAdmin();

  const gameId = Number(formData.get("gameId"));
  const copyId = Number(formData.get("copyId"));

  if (!Number.isInteger(gameId) || !Number.isInteger(copyId)) {
    throw new Error("Invalid IDs");
  }

const copyCount = await prisma.userGame.count({
  where: {
    gameId,
  },
});

if (copyCount <= 1) {
  redirect(`/admin/game/${gameId}?error=last-copy`);
}

await prisma.review.deleteMany({
  where: {
    userGameId: copyId,
  },
});

await prisma.userGame.delete({
  where: {
    id: copyId,
  },
});

redirect(`/admin/game/${gameId}`);
}

export default async function EditCopyPage({ params }: PageProps) {
const { copyId } = await params;

const userGameId = Number(copyId);

  if (!Number.isInteger(userGameId)) {
  notFound();
}

  const userGame = await prisma.userGame.findUnique({
    where: {
      id: userGameId,
    },
include: {
  game: true,
  platform: true,
  reviews: {
    orderBy: {
      reviewDate: "desc",
    },
  },
},
  });
console.log("FOUND COPY", {
  userGameId,
  found: !!userGame,
  userGameGameId: userGame?.gameId,
});
  if (!userGame) {
  notFound();
}
const gameId = userGame.gameId;
    const review = userGame.reviews[0];

  const platforms: { id: number; name: string }[] =
  await prisma.platform.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href={`/admin/game/${gameId}`}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:border-zinc-400"
          >
            ← Back to Game
          </Link>
        </div>

        <h1 className="text-4xl font-bold">Edit Copy</h1>
        <p className="mt-2 text-zinc-400">{userGame.game.title}</p>

        <form action={updateCopy} className="mt-8 space-y-6">
          <input type="hidden" name="gameId" value={gameId} />
          <input type="hidden" name="copyId" value={userGame.id} />

          <Field label="Platform">
            <select
              name="platformId"
              defaultValue={userGame.platformId ?? "NONE"}
              className="input"
            >
              <option value="NONE">Unknown Platform</option>
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              name="status"
              defaultValue={userGame.status}
              className="input"
            >
              <option value="BACKLOG">Backlog</option>
              <option value="PLAYING">Playing</option>
              <option value="COMPLETED">Completed</option>
              <option value="ONHOLD">On Hold</option>
              <option value="DROPPED">Dropped</option>
              <option value="REPLAYING">Replaying</option>
            </select>
          </Field>

          <Field label="Hours Played">
            <input
              name="hoursPlayed"
              type="number"
              step="0.5"
              defaultValue={userGame.hoursPlayed ?? ""}
              className="input"
            />
          </Field>

          <Field label="Date Started">
            <input
              name="dateStarted"
              type="date"
              defaultValue={formatDateInput(userGame.dateStarted)}
              className="input"
            />
          </Field>

          <Field label="Date Completed">
            <input
              name="dateCompleted"
              type="date"
              defaultValue={formatDateInput(userGame.dateCompleted)}
              className="input"
            />
          </Field>

                        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 text-xl font-bold">Review</h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Overall">
                <RatingInput
                  name="overallRating"
                  defaultValue={review?.overallRating}
                />
              </Field>

              <Field label="Gameplay">
                <RatingInput
                  name="gameplayRating"
                  defaultValue={review?.gameplayRating}
                />
              </Field>

              <Field label="Story">
                <RatingInput
                  name="storyRating"
                  defaultValue={review?.storyRating}
                />
              </Field>

              <Field label="Art">
                <RatingInput
                  name="artRating"
                  defaultValue={review?.artRating}
                />
              </Field>

              <Field label="Music">
                <RatingInput
                  name="musicRating"
                  defaultValue={review?.musicRating}
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                name="notes"
                rows={6}
                defaultValue={review?.notes ?? ""}
                className="input mt-4 min-h-[180px] w-full resize-y"
              />
            </Field>
          </section>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg border border-zinc-700 bg-zinc-100 px-5 py-3 font-semibold text-zinc-950 hover:bg-white"
            >
              Save Copy
            </button>

            <Link
              href={`/admin/game/${gameId}`}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-semibold hover:border-zinc-400"
            >
              Cancel
            </Link>
          </div>
        </form>

        <section className="mt-10 rounded-xl border border-red-900/60 bg-red-950/20 p-5">
          <h2 className="text-xl font-bold text-red-300">Danger Zone</h2>
          <p className="mt-2 text-sm text-red-200/70">
            This deletes only this copy and its review. The main game will stay in your library.
          </p>

          <form action={deleteCopy} className="mt-4">
            <input type="hidden" name="gameId" value={gameId} />
            <input type="hidden" name="copyId" value={userGame.id} />

            <button
              type="submit"
              className="rounded-lg border border-red-700 bg-red-900 px-5 py-3 font-semibold text-red-100 hover:bg-red-800"
            >
              Delete Copy
            </button>
          </form>
        </section>
      </div>
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

function formatDateInput(date: Date | string | null | undefined) {
  if (!date) return "";

  return new Date(date).toISOString().slice(0, 10);
}

function RatingInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: number | null;
}) {
  return (
    <input
      name={name}
      type="number"
      step="0.5"
      min="0"
      max="10"
      defaultValue={defaultValue ?? ""}
      className="input"
    />
  );
}