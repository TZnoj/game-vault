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
  themes?: { id: number; name: string }[];
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
      fields name,genres.name,themes.name,category;
      limit 10;
    `,
  });

  if (!response.ok) {
    console.warn(`IGDB failed for ${title}: ${response.status}`);
    return null;
  }

  const results = (await response.json()) as IgdbGame[];

  const normalizedLower = normalized.toLowerCase();

  return (
    results.find((game) => game.name.toLowerCase() === normalizedLower) ??
    results.find((game) => !looksLikeDlcOrBundle(game.name)) ??
    results[0] ??
    null
  );
}

function looksLikeDlcOrBundle(name: string) {
  return /dlc|costume|pack|bundle|expansion|add-on|soundtrack/i.test(name);
}

function includesAny(values: string[], targets: string[]) {
  return values.some((value) =>
    targets.some((target) => value.includes(target))
  );
}

function getPersonalGenres(igdbGame: IgdbGame): string[] {
  const genreNames =
    igdbGame.genres?.map((genre) => genre.name.toLowerCase()) ?? [];

  const themeNames =
    igdbGame.themes?.map((theme) => theme.name.toLowerCase()) ?? [];

  const allNames = [...genreNames, ...themeNames];

  const personalGenres = new Set<string>();

  /**
   * Superseding rules first.
   */

  if (
    includesAny(allNames, ["survival"]) &&
    includesAny(themeNames, ["horror"])
  ) {
    personalGenres.add("Survival Horror");
  } else if (includesAny(themeNames, ["horror"])) {
    personalGenres.add("Horror");
  }

  if (
    includesAny(genreNames, ["tactical", "strategy"]) &&
    includesAny(genreNames, ["role-playing", "rpg"])
  ) {
    personalGenres.add("SRPG");
  } else if (includesAny(genreNames, ["tactical", "strategy"])) {
    personalGenres.add("Strategy");
  }

  /**
   * Other useful mappings.
   */

  if (includesAny(genreNames, ["role-playing", "rpg"])) {
    personalGenres.add("RPG");
  }

  if (includesAny(genreNames, ["turn-based strategy"])) {
    personalGenres.add("Turn-Based Strategy");
  }

  if (includesAny(genreNames, ["adventure"])) {
    personalGenres.add("Adventure");
  }

  if (includesAny(genreNames, ["visual novel"])) {
    personalGenres.add("Visual Novel");
  }

  if (includesAny(genreNames, ["platform"])) {
    personalGenres.add("Platformer");
  }

  if (includesAny(genreNames, ["puzzle"])) {
    personalGenres.add("Puzzle");
  }

  if (includesAny(genreNames, ["fighting"])) {
    personalGenres.add("Fighting");
  }

  if (includesAny(genreNames, ["shooter"])) {
    personalGenres.add("Shooter");
  }

  if (includesAny(genreNames, ["racing"])) {
    personalGenres.add("Racing");
  }

  if (includesAny(genreNames, ["simulator", "simulation"])) {
    personalGenres.add("Simulation");
  }

  /**
   * If SRPG exists, remove generic Strategy.
   * If Survival Horror exists, remove generic Horror.
   */

  if (personalGenres.has("SRPG")) {
    personalGenres.delete("RPG");
    personalGenres.delete("Strategy");
    personalGenres.delete("Adventure");
  }

  if (personalGenres.has("JRPG")) {
    personalGenres.delete("RPG");
    personalGenres.delete("Adventure");
  }

  if (personalGenres.has("Action RPG")) {
    personalGenres.delete("RPG");
    personalGenres.delete("Action");
    personalGenres.delete("Adventure");
  }

  if (personalGenres.has("Soulslike")) {
    personalGenres.delete("Action RPG");
    personalGenres.delete("RPG");
    personalGenres.delete("Action");
    personalGenres.delete("Adventure");
  }

  if (personalGenres.has("Metroidvania")) {
    personalGenres.delete("Platformer");
    personalGenres.delete("Adventure");
  }

  if (personalGenres.has("Survival Horror")) {
    personalGenres.delete("Horror");
    personalGenres.delete("Adventure");
  }

  if (personalGenres.has("Roguelike")) {
    personalGenres.delete("Adventure");
  }

  if (personalGenres.has("Action")) {
    personalGenres.delete("Adventure");
  }

  /**
   * Adventure should only exist if it is the ONLY genre.
   */

  if (
    personalGenres.has("Adventure") &&
    personalGenres.size > 1
  ) {
    personalGenres.delete("Adventure");
  }
  
  return [...personalGenres];
}

async function setGameGenres(gameId: number, genreNames: string[]) {
  await prisma.gameGenre.deleteMany({
    where: {
      gameId,
    },
  });

  for (const name of genreNames) {
    const genre = await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    await prisma.gameGenre.upsert({
      where: {
        gameId_genreId: {
          gameId,
          genreId: genre.id,
        },
      },
      update: {},
      create: {
        gameId,
        genreId: genre.id,
      },
    });
  }
}

async function main() {
  const accessToken = await getTwitchAccessToken();

  const games = await prisma.game.findMany({
    orderBy: {
      title: "asc",
    },
  });

  for (const game of games) {
    console.log(`Updating: ${game.title}`);

    const igdbGame = await getIgdbGame(game.title, accessToken);

    if (!igdbGame) {
      console.warn(`  No IGDB match.`);
      continue;
    }

    const genreNames = igdbGame.genres?.map((genre) => genre.name) ?? [];
    const themeNames = igdbGame.themes?.map((theme) => theme.name) ?? [];
    const personalGenres = getPersonalGenres(igdbGame);

    console.log(`  IGDB match: ${igdbGame.name}`);
    console.log(`  IGDB genres: ${genreNames.join(", ") || "none"}`);
    console.log(`  IGDB themes: ${themeNames.join(", ") || "none"}`);
    console.log(`  Your genres: ${personalGenres.join(", ") || "none"}`);

    await setGameGenres(game.id, personalGenres);

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  console.log("Genre update complete.");
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