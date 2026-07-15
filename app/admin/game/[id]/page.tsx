import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { revalidateGameData } from "@/lib/revalidateGameData";
import { AdminEditForm } from "@/components/admin/AdminEditForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

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


type IgdbCoverChoice = {
  name: string;
  imageId: string;
  url: string;
};

type PlatformOption = {
  id: number;
  name: string;
};

type GenreOption = {
  id: number;
  name: string;
};

type FranchiseOption = {
  id: number;
  name: string;
};

type GameGenreOption = {
  genreId: number;
};

type UserGameCopy = {
  id: number;
  gameId: number;
  status: string;
  hoursPlayed: number | null;
  platform: {
    name: string;
  } | null;
};

async function getTwitchAccessToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.access_token as string;
}

async function getIgdbCoverChoices(title: string): Promise<IgdbCoverChoice[]> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const accessToken = await getTwitchAccessToken();

  if (!clientId || !accessToken) return [];

  const safeTitle = title.replace(/"/g, '\\"');

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: `
      search "${safeTitle}";
      fields name,cover.image_id;
      where cover != null;
      limit 12;
    `,
    cache: "no-store",
  });

  if (!response.ok) return [];

  const results = (await response.json()) as {
    name: string;
    cover?: {
      image_id?: string;
    };
  }[];

  return results
    .filter((game) => game.cover?.image_id)
    .map((game) => ({
      name: game.name,
      imageId: game.cover!.image_id!,
      url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover!.image_id}.jpg`,
    }));
}

async function updateGame(formData: FormData) {
  "use server";

  await requireAdmin();

  const franchiseIdRaw = String(formData.get("franchiseId") ?? "NONE");
  const newFranchiseName = String(
    formData.get("newFranchiseName") ?? "",
  ).trim();

  const gameId = Number(formData.get("gameId"));
  const igdbName = String(formData.get("igdbName") ?? "").trim();
  const rawgName = String(formData.get("rawgName") ?? "").trim();
  const hltbName = String(formData.get("hltbName") ?? "").trim();
  const manualReleaseDate = parseNullableDate(formData.get("manualReleaseDate"));
const lockReleaseDate = formData.get("lockReleaseDate") === "on";
const manualMetacritic = parseNullableNumber(formData.get("manualMetacritic"));
const lockCoverArt = formData.get("lockCoverArt") === "on";
const lockMetacritic = formData.get("lockMetacritic") === "on";
const lockHLTB = formData.get("lockHLTB") === "on";
  const overrideCoverArtUrl = String(
    formData.get("overrideCoverArtUrl") ?? "",
  ).trim();
  const isEndless = formData.get("isEndless") === "on";
  await prisma.metadataOverride.upsert({
    where: {
      gameId,
    },
    update: {
      igdbName: igdbName || null,
      rawgName: rawgName || null,
      hltbName: hltbName || null,
      coverArtUrl: overrideCoverArtUrl || null,
      manualReleaseDate,
      lockReleaseDate,
      manualMetacritic,
lockCoverArt,
lockMetacritic,
lockHLTB,
    },
    create: {
      gameId,
      igdbName: igdbName || null,
      rawgName: rawgName || null,
      hltbName: hltbName || null,
      coverArtUrl: overrideCoverArtUrl || null,
      manualReleaseDate,
      lockReleaseDate,
      manualMetacritic,
lockCoverArt,
lockMetacritic,
lockHLTB,
    },
  });

  if (!Number.isInteger(gameId)) {
    throw new Error("Invalid game ID");
  }

  const title = String(formData.get("title") ?? "").trim();
  const manualCoverArtUrl = String(formData.get("coverArtUrl") ?? "").trim();
  const selectedCoverArtUrl = String(
    formData.get("selectedCoverArtUrl") ?? "",
  ).trim();

  const coverArtUrl = selectedCoverArtUrl || manualCoverArtUrl;

  const genreIds = formData
    .getAll("genreIds")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  let franchiseId: number | null = null;

  if (newFranchiseName) {
    const franchise = await prisma.franchise.upsert({
      where: {
        name: newFranchiseName,
      },
      update: {},
      create: {
        name: newFranchiseName,
      },
    });

    franchiseId = franchise.id;
  } else if (franchiseIdRaw !== "NONE" && franchiseIdRaw !== "") {
    franchiseId = Number(franchiseIdRaw);
  }

  const game = await prisma.game.update({
    where: {
      id: gameId,
    },
    data: {
      title,
      franchiseId,
      isEndless,
      coverArtUrl: coverArtUrl || null,
      metacriticScore: parseNullableNumber(formData.get("metacriticScore")),
      hltbMain: parseNullableNumber(formData.get("hltbMain")),
      hltbMainExtra: parseNullableNumber(formData.get("hltbMainExtra")),
      hltbCompletionist: parseNullableNumber(formData.get("hltbCompletionist")),
    },
    include: {
      userGames: {
        include: {
          reviews: true,
        },
      },
    },
  });

  await prisma.gameGenre.deleteMany({
  where: {
    gameId,
  },
});

for (const genreId of genreIds) {
  await prisma.gameGenre.create({
    data: {
      gameId,
      genreId,
    },
  });
}
  revalidateGameData();


  redirect(`/game/${gameId}`);
}

async function addCopy(formData: FormData) {
  "use server";

  await requireAdmin();

  const gameId = Number(formData.get("gameId"));

  if (!Number.isInteger(gameId)) {
    throw new Error("Invalid game ID");
  }

  await prisma.userGame.create({
    data: {
      gameId,
      status: "BACKLOG",
      platformId: null,
    },
  });

  revalidateGameData();
  redirect(`/admin/game/${gameId}`);
}

async function deleteGame(formData: FormData) {
  "use server";

  const gameId = Number(formData.get("gameId"));

  if (!Number.isInteger(gameId)) {
    throw new Error("Invalid game ID");
  }

  const game = await prisma.game.findUnique({
    where: {
      id: gameId,
    },
    include: {
      userGames: {
        include: {
          reviews: true,
        },
      },
    },
  });

  if (!game) {
    redirect("/admin");
  }

  const userGameIds = game.userGames.map(
  (userGame: { id: number }) => userGame.id,
);

  await prisma.review.deleteMany({
    where: {
      userGameId: {
        in: userGameIds,
      },
    },
  });

  await prisma.userGame.deleteMany({
    where: {
      gameId,
    },
  });

  await prisma.gameGenre.deleteMany({
    where: {
      gameId,
    },
  });

  await prisma.metadataOverride.deleteMany({
    where: {
      gameId,
    },
  });

  await prisma.genreOverride.deleteMany({
    where: {
      gameId,
    },
  });

  await prisma.game.delete({
    where: {
      id: gameId,
    },
  });
  revalidateGameData();

  redirect("/admin");
}

export default async function EditGamePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const gameId = Number(id);

  if (!Number.isInteger(gameId)) {
    notFound();
  }

  const game = await prisma.game.findUnique({
    where: {
      id: gameId,
    },
    include: {
      metadataOverride: true,
      franchise: true,
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
      gameGenres: true,
    },
  });

  if (!game) {
    notFound();
  }

const platforms: PlatformOption[] = await prisma.platform.findMany({
  orderBy: {
    name: "asc",
  },
  select: {
    id: true,
    name: true,
  },
});

const genres: GenreOption[] = await prisma.genre.findMany({
  orderBy: {
    name: "asc",
  },
  select: {
    id: true,
    name: true,
  },
});

const franchises: FranchiseOption[] = await prisma.franchise.findMany({
  orderBy: {
    name: "asc",
  },
  select: {
    id: true,
    name: true,
  },
});

  const [previousGame, nextGame] = await Promise.all([
    prisma.game.findFirst({
      where: { title: { lt: game.title } },
      orderBy: { title: "desc" },
      select: { id: true, title: true },
    }),
    prisma.game.findFirst({
      where: { title: { gt: game.title } },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const coverChoices = await getIgdbCoverChoices(game.title);

  const selectedGenreIds = new Set(
  game.gameGenres.map((gameGenre: GameGenreOption) => gameGenre.genreId),
);

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:border-zinc-400"
          >
            ← Admin
          </Link>

          <Link
            href={`/game/${game.id}`}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:border-zinc-400"
          >
            View Game
          </Link>
        </div>

        <h1 className="text-4xl font-bold">Edit Game</h1>
        <p className="mt-2 text-zinc-400">{game.title}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {previousGame ? (
            <Link
              href={`/admin/game/${previousGame.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600"
              title={previousGame.title}
            >
              <span className="text-xs text-zinc-500">← Previous game</span>
              <span className="mt-1 block truncate font-semibold">{previousGame.title}</span>
            </Link>
          ) : (
            <div className="rounded-xl border border-zinc-900 p-4 text-zinc-600">No previous game</div>
          )}
          {nextGame ? (
            <Link
              href={`/admin/game/${nextGame.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-right hover:border-zinc-600"
              title={nextGame.title}
            >
              <span className="text-xs text-zinc-500">Next game →</span>
              <span className="mt-1 block truncate font-semibold">{nextGame.title}</span>
            </Link>
          ) : (
            <div className="rounded-xl border border-zinc-900 p-4 text-right text-zinc-600">No next game</div>
          )}
        </div>
        {error === "last-copy" && (
  <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
    You cannot delete the final copy from this game. Delete the game itself from the Danger Zone instead.
  </div>
)}

        <AdminEditForm
          action={updateGame}
          cancelHref={`/game/${game.id}`}
          submitLabel="Save Changes"
          className="mt-8 space-y-8"
        >
          <input type="hidden" name="gameId" value={game.id} />

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 text-xl font-bold">Game Metadata</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Franchise">
                <select
                  name="franchiseId"
                  defaultValue={game.franchiseId ?? "NONE"}
                  className="input"
                >
                  <option value="NONE">No Franchise</option>
                  {franchises.map((franchise) => (
                    <option key={franchise.id} value={franchise.id}>
                      {franchise.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Or Create New Franchise">
                <input
                  name="newFranchiseName"
                  placeholder="Example: Final Fantasy"
                  className="input"
                />
              </Field>
            </div>
            <div className="space-y-4">
              <Field label="Title">
                <input
                  name="title"
                  required
                  defaultValue={game.title}
                  className="input"
                />
              </Field>
              <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
  <input
    type="checkbox"
    name="isEndless"
    defaultChecked={game.isEndless}
  />
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
                  defaultValue={game.coverArtUrl ?? ""}
                  className="input"
                />
              </Field>

              {coverChoices.length > 0 && (
                <Field label="Choose Cover Art">
                  <div className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:grid-cols-3 lg:grid-cols-6">
                    {coverChoices.map((cover) => (
                      <label
                        key={cover.url}
                        className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-2 hover:border-zinc-500"
                      >
                        <input
                          type="radio"
                          name="selectedCoverArtUrl"
                          value={cover.url}
                          defaultChecked={cover.url === game.coverArtUrl}
                          className="mb-2"
                        />

                        <div className="relative mb-2 aspect-3/4 w-full overflow-hidden rounded-lg">
                          <Image
                            src={cover.url}
                            alt={cover.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>

                        <p className="line-clamp-2 text-xs text-zinc-300">
                          {cover.name}
                        </p>
                      </label>
                    ))}
                  </div>
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Metacritic">
                  <input
                    name="metacriticScore"
                    type="number"
                    defaultValue={game.metacriticScore ?? ""}
                    className="input"
                  />
                </Field>

                <Field label="HLTB Main">
                  <input
                    name="hltbMain"
                    type="number"
                    step="0.5"
                    defaultValue={game.hltbMain ?? ""}
                    className="input"
                  />
                </Field>

                <Field label="HLTB Main Extra">
                  <input
                    name="hltbMainExtra"
                    type="number"
                    step="0.5"
                    defaultValue={game.hltbMainExtra ?? ""}
                    className="input"
                  />
                </Field>

                <Field label="HLTB Completionist">
                  <input
                    name="hltbCompletionist"
                    type="number"
                    step="0.5"
                    defaultValue={game.hltbCompletionist ?? ""}
                    className="input"
                  />
                </Field>
              </div>
            </div>
          </section>


                  <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
  <div className="mb-4 flex items-center justify-between gap-4">
    <div>
      <h2 className="text-xl font-bold">Owned Copies</h2>
      <p className="mt-1 text-sm text-zinc-400">
        All copies of this game in your collection.
      </p>
    </div>

    <button
  formAction={addCopy}
  type="submit"
  className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
>
  + Add Copy
</button>
  </div>

  <div className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
    {game.userGames.map((copy: UserGameCopy) => (
      <div
        key={copy.id}
        className="grid gap-4 px-4 py-3 sm:grid-cols-[1fr_140px_140px_80px]"
      >
        <div>
          <p className="font-semibold">
            {copy.platform?.name ?? "Unknown Platform"}
          </p>
          <p className="text-sm text-zinc-500">Copy #{copy.id}</p>
        </div>

        <div>
          <p className="text-xs text-zinc-500">Status</p>
          <p className="text-sm font-semibold">{copy.status}</p>
        </div>

        <div>
          <p className="text-xs text-zinc-500">Hours</p>
          <p className="text-sm font-semibold">
            {copy.hoursPlayed != null ? `${copy.hoursPlayed} hrs` : "N/A"}
          </p>
        </div>

        <div className="flex items-center justify-end">
          <Link
  href={`/admin/copy/${copy.id}`}
  className="text-sm text-zinc-300 hover:text-white hover:underline"
>
  Edit
</Link>
        </div>
      </div>
    ))}
  </div>
</section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 text-xl font-bold">Genres</h2>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {genres.map((genre) => (
                <label
                  key={genre.id}
                  className="flex items-center gap-2 text-sm text-zinc-300"
                >
                  <input
                    type="checkbox"
                    name="genreIds"
                    value={genre.id}
                    defaultChecked={selectedGenreIds.has(genre.id)}
                  />
                  {genre.name}
                </label>
              ))}
            </div>
          </section>
          
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 text-xl font-bold">Metadata Overrides</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="IGDB Search Name">
                <input
                  name="igdbName"
                  defaultValue={game.metadataOverride?.igdbName ?? ""}
                  className="input"
                />
              </Field>

              <Field label="RAWG Search Name">
                <input
                  name="rawgName"
                  defaultValue={game.metadataOverride?.rawgName ?? ""}
                  className="input"
                />
              </Field>

              <Field label="HLTB Search Name">
                <input
                  name="hltbName"
                  defaultValue={game.metadataOverride?.hltbName ?? ""}
                  className="input"
                />
              </Field>

              <Field label="Manual Cover Art URL">
                <input
                  name="overrideCoverArtUrl"
                  defaultValue={game.metadataOverride?.coverArtUrl ?? ""}
                  className="input"
                />
              </Field>
              <Field label="Manual Release Date">
  <input
    name="manualReleaseDate"
    type="date"
    defaultValue={formatDateInput(game.metadataOverride?.manualReleaseDate)}
    className="input"
  />
</Field>

<Field label="Manual Metacritic">
  <input
    name="manualMetacritic"
    type="number"
    min="0"
    max="100"
    defaultValue={game.metadataOverride?.manualMetacritic ?? ""}
    className="input"
  />
</Field>

<label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
  <input
    type="checkbox"
    name="lockReleaseDate"
    defaultChecked={game.metadataOverride?.lockReleaseDate ?? false}
  />
  <span>
    Lock Release Date
    <span className="block text-xs text-zinc-500">
      Prevent enrichment scripts from overwriting this date.
    </span>
  </span>
</label>
<label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
  <input
    type="checkbox"
    name="lockCoverArt"
    defaultChecked={game.metadataOverride?.lockCoverArt ?? false}
  />
  <span>Lock Cover Art</span>
</label>

<label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
  <input
    type="checkbox"
    name="lockMetacritic"
    defaultChecked={game.metadataOverride?.lockMetacritic ?? false}
  />
  <span>Lock Metacritic</span>
</label>

<label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
  <input
    type="checkbox"
    name="lockHLTB"
    defaultChecked={game.metadataOverride?.lockHLTB ?? false}
  />
  <span>Lock HLTB</span>
</label>
            </div>
          </section>
          <p className="text-xs text-zinc-500">
            Ctrl+S saves from anywhere on this page. Escape cancels and returns to the game page.
          </p>
        </AdminEditForm>

        <section className="mt-10 rounded-xl border border-red-900/60 bg-red-950/20 p-5">
        
  <h2 className="text-xl font-bold text-red-300">Danger Zone</h2>
  <p className="mt-2 text-sm text-red-200/70">
    This permanently deletes the game, your playthrough, reviews, genres, and metadata overrides.
  </p>

  <form action={deleteGame} className="mt-4">
  <input type="hidden" name="gameId" value={game.id} />

  <button
    type="submit"
    className="rounded-lg border border-red-700 bg-red-900 px-5 py-3 font-semibold text-red-100 hover:bg-red-800"
  >
    Delete Game
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

function formatDateInput(date: Date | string | null | undefined) {
  if (!date) return "";

  return new Date(date).toISOString().slice(0, 10);
}
