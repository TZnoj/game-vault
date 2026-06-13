import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({ adapter });

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!;

type IgdbGame = {
  id: number;
  name: string;
  genres?: { id: number; name: string }[];
  platforms?: { id: number; name: string }[];
};

const IGDB_PLATFORM_MAP: Record<string, string> = {
  "PlayStation": "PS1",
  "PlayStation 2": "PS2",
  "PlayStation 3": "PS3",
  "PlayStation 4": "PS4",
  "PlayStation 5": "PS5",
  "Nintendo Switch": "Switch",
  "Nintendo Switch 2": "Switch 2",
  "Nintendo GameCube": "GameCube",
  "Wii": "Wii",
  "Wii U": "Wii U",
  "Super Nintendo Entertainment System": "SNES",
  "PC (Microsoft Windows)": "PC",
  "Steam": "Steam",
  "Xbox": "Xbox",
  "Xbox 360": "Xbox 360",
  "Xbox One": "Xbox One",
  "Xbox Series X|S": "Xbox Series X/S",
};

const TITLE_OVERRIDES: Record<string, string> = {
  FF7: "Final Fantasy VII",
  FF15: "Final Fantasy XV",
  FF16: "Final Fantasy XVI",
  "P5:Royal": "Persona 5 Royal",
  "SMT 5:Vengeance": "Shin Megami Tensei V: Vengeance",
  "Claire Obscur : Expedition 33": "Clair Obscur: Expedition 33",
  "The Hundred Line - Last Defence Academy":
    "The Hundred Line: Last Defense Academy",
  "Digimon Story Time Stranger": "Digimon Story: Time Stranger",
};

function normalizeTitle(title: string) {
  return TITLE_OVERRIDES[title] ?? title;
}

async function getTwitchAccessToken() {
  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", TWITCH_CLIENT_ID);
  url.searchParams.set("client_secret", TWITCH_CLIENT_SECRET);
  url.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    throw new Error(`Failed to get Twitch token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

async function getIgdbGame(title: string, accessToken: string) {
  const normalized = normalizeTitle(title).replace(/"/g, '\\"');

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: `
      search "${normalized}";
      fields name,genres.name,platforms.name,category,version_parent,parent_game;
      limit 10;
    `,
  });

  if (!response.ok) {
    console.warn(`IGDB failed for ${title}: ${response.status}`);
    return null;
  }

  const results = (await response.json()) as IgdbGame[];

  if (!results.length) {
    return null;
  }

  const normalizedLower = normalized.toLowerCase();

  const nonDlcResults = results.filter((game) => {
    const name = game.name.toLowerCase();

    const looksLikeDlc =
      name.includes("dlc") ||
      name.includes("costume") ||
      name.includes("pack") ||
      name.includes("bundle") ||
      name.includes("expansion") ||
      name.includes("add-on") ||
      name.includes("soundtrack");

    return !looksLikeDlc;
  });

  return (
    nonDlcResults.find(
      (game) => game.name.toLowerCase() === normalizedLower
    ) ??
    nonDlcResults[0] ??
    results[0]
  );
}

async function main() {
  const accessToken = await getTwitchAccessToken();

  const userGames = await prisma.userGame.findMany({
    include: {
      game: {
        include: {
          gameGenres: true,
        },
      },
      platform: true,
    },
    orderBy: {
      game: {
        title: "asc",
      },
    },
  });

  for (const userGame of userGames) {
    const title = userGame.game.title;
    console.log(`Updating: ${title}`);

    const igdbGame = await getIgdbGame(title, accessToken);

    if (!igdbGame) {
      console.warn(`No IGDB match for ${title}`);
      continue;
    }
        console.log(
    `  IGDB match: ${igdbGame.name}`
    );

    console.log(
    `  Genres: ${igdbGame.genres?.map((g) => g.name).join(", ") || "none"}`
    );

    console.log(
    `  Platforms: ${igdbGame.platforms?.map((p) => p.name).join(", ") || "none"}`
    );

    if (igdbGame.genres?.length) {
      for (const igdbGenre of igdbGame.genres) {
        const genre = await prisma.genre.upsert({
          where: { name: igdbGenre.name },
          update: {},
          create: { name: igdbGenre.name },
        });

        await prisma.gameGenre.upsert({
          where: {
            gameId_genreId: {
              gameId: userGame.gameId,
              genreId: genre.id,
            },
          },
          update: {},
          create: {
            gameId: userGame.gameId,
            genreId: genre.id,
          },
        });
      }
    }


    const mappedPlatforms =
      igdbGame.platforms
        ?.map((platform) => IGDB_PLATFORM_MAP[platform.name])
        .filter((name): name is string => Boolean(name)) ?? [];

    const uniqueMappedPlatforms = [...new Set(mappedPlatforms)];

    if (!userGame.platformId && uniqueMappedPlatforms.length === 1) {
      const platform = await prisma.platform.upsert({
        where: { name: uniqueMappedPlatforms[0] },
        update: {},
        create: {
          name: uniqueMappedPlatforms[0],
        },
      });

      await prisma.userGame.update({
        where: { id: userGame.id },
        data: {
          platformId: platform.id,
        },
      });

      console.log(`  Set platform: ${platform.name}`);
    }

    if (uniqueMappedPlatforms.length !== 1) {
      console.log(
        `  Platform skipped: ${uniqueMappedPlatforms.length} possible platforms`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  console.log("Genre/platform update complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });