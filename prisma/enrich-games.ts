import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { HowLongToBeatService } from "howlongtobeat";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({ adapter });
const hltb = new HowLongToBeatService();

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!RAWG_API_KEY) throw new Error("RAWG_API_KEY is missing from .env");
if (!TWITCH_CLIENT_ID) throw new Error("TWITCH_CLIENT_ID is missing from .env");
if (!TWITCH_CLIENT_SECRET) {
  throw new Error("TWITCH_CLIENT_SECRET is missing from .env");
}

type RawgSearchResult = {
  id: number;
  name: string;
  slug: string;
  released: string | null;
  background_image: string | null;
  metacritic: number | null;
};

type IgdbGame = {
  id: number;
  name: string;
  cover?: {
    id: number;
    image_id: string;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTitle(title: string) {
  return title
    .replace(/\bFF7\b/i, "Final Fantasy VII")
    .replace(/\bFF15\b/i, "Final Fantasy XV")
    .replace(/\bFF16\b/i, "Final Fantasy XVI")
    .replace(/\bP5:Royal\b/i, "Persona 5 Royal")
    .replace(/\bPersona 5:Royal\b/i, "Persona 5 Royal")
    .replace(/\bShin Megami Tensei 5:Vengeance\b/i, "Shin Megami Tensei V: Vengeance")
    .replace(/\bSMT 5:Vengeance\b/i, "Shin Megami Tensei V: Vengeance")
    .replace(/Claire Obscur/i, "Clair Obscur")
    .replace(/Metaphor Refantazio/i, "Metaphor: ReFantazio")
    .trim();
}

async function getTwitchAccessToken(): Promise<string> {
  const url = new URL("https://id.twitch.tv/oauth2/token");

  url.searchParams.set("client_id", TWITCH_CLIENT_ID!);
  url.searchParams.set("client_secret", TWITCH_CLIENT_SECRET!);
  url.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(url, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to get Twitch token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

function getSearchName({
  title,
  override,
}: {
  title: string;
  override?: string | null;
}) {
  return override?.trim() || normalizeTitle(title);
}

async function getIgdbCoverUrl(
  title: string,
  accessToken: string
): Promise<string | null> {
  const normalized = title.replace(/"/g, '\\"');

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: `
      search "${normalized}";
      fields name,cover.image_id,category,version_parent,parent_game;
      where cover != null;
      limit 10;
    `,
  });

  if (!response.ok) {
    console.warn(`IGDB failed for ${title}: ${response.status}`);
    return null;
  }

  const games = (await response.json()) as IgdbGame[];

  const normalizedLower = title.toLowerCase();

  const best =
    games.find((game) => game.name.toLowerCase() === normalizedLower) ??
    games.find((game) => !looksLikeDlcOrBundle(game.name)) ??
    games[0];

  const imageId = best?.cover?.image_id;

  if (!imageId) return null;

  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

function looksLikeDlcOrBundle(name: string) {
  return /dlc|costume|pack|bundle|expansion|add-on|soundtrack/i.test(name);
}

async function getRawgData(title: string): Promise<RawgSearchResult | null> {
  const search = encodeURIComponent(title);

  const url =
    `https://api.rawg.io/api/games?key=${RAWG_API_KEY}` +
    `&search=${search}` +
    `&page_size=1`;

  const response = await fetch(url);

  if (!response.ok) {
    console.warn(`RAWG failed for ${title}: ${response.status}`);
    return null;
  }

  const data = await response.json();

  return data.results?.[0] ?? null;
}

async function getHltbData(title: string) {
  try {
    const results = await hltb.search(title);
    const first = results[0] ?? null;

    if (!first) {
      console.warn(`No HLTB result for ${title}`);
      return null;
    }

    console.log(`HLTB matched ${title} -> ${(first as any).name ?? (first as any).gameName ?? "Unknown"}`);
    console.log("HLTB raw:", first);

    return first;
  } catch (error) {
    console.warn(`HLTB failed for ${title}`);
    console.warn(error);
    return null;
  }
}

function hltbHours(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value
      .replace("½", ".5")
      .replace(/[^\d.]/g, "")
      .trim();

    const number = Number(normalized);

    return Number.isFinite(number) ? number : null;
  }

  return null;
}

async function main() {
  const accessToken = await getTwitchAccessToken();

  const games = await prisma.game.findMany({
    orderBy: {
      title: "asc",
    },
    include: {
      metadataOverride: true,
    },
  });

  console.log(`Found ${games.length} games.`);

  for (const game of games) {
    const override = game.metadataOverride;

    const igdbSearchName = getSearchName({
      title: game.title,
      override: override?.igdbName,
    });

    const rawgSearchName = getSearchName({
      title: game.title,
      override: override?.rawgName,
    });

    const hltbSearchName = getSearchName({
      title: game.title,
      override: override?.hltbName,
    });

    console.log(`Enriching: ${game.title}`);
    console.log(`  IGDB: ${igdbSearchName}`);
    console.log(`  RAWG: ${rawgSearchName}`);
    console.log(`  HLTB: ${hltbSearchName}`);

    const [rawgData, hltbData, igdbCoverUrl] = await Promise.all([
      getRawgData(rawgSearchName),
      getHltbData(hltbSearchName),
      override?.coverArtUrl
        ? Promise.resolve(override.coverArtUrl)
        : getIgdbCoverUrl(igdbSearchName, accessToken),
    ]);
const rawgId =
  game.rawgId ??
  (rawgData?.id
    ? await getSafeRawgId(rawgData.id, game.id)
    : null);
  const slug = game.slug ?? (rawgData?.slug ? await getSafeSlug(rawgData.slug, game.id) : null);
  const manualMetacritic = override?.manualMetacritic ?? null;
const manualReleaseDate = override?.manualReleaseDate ?? null;

const shouldUpdateCoverArt = !override?.lockCoverArt;
const shouldUpdateMetacritic = !override?.lockMetacritic;
const shouldUpdateHLTB = !override?.lockHLTB;
const shouldUpdateReleaseDate = !override?.lockReleaseDate;

const safeCoverArtUrl =
  override?.coverArtUrl ??
  (shouldUpdateCoverArt
    ? game.coverArtUrl ?? igdbCoverUrl ?? null
    : game.coverArtUrl);

const safeMetacriticScore =
  manualMetacritic ??
  (shouldUpdateMetacritic
    ? game.metacriticScore ?? rawgData?.metacritic ?? null
    : game.metacriticScore);

const safeReleaseDate =
  manualReleaseDate ??
  (shouldUpdateReleaseDate
    ? game.releaseDate ??
      (rawgData?.released ? new Date(rawgData.released) : null)
    : game.releaseDate);

const safeHltbMain =
  shouldUpdateHLTB
    ? game.hltbMain ??
      hltbHours((hltbData as any)?.gameplayMain) ??
      hltbHours((hltbData as any)?.gameplay_main) ??
      null
    : game.hltbMain;

const safeHltbMainExtra =
  shouldUpdateHLTB
    ? game.hltbMainExtra ??
      hltbHours((hltbData as any)?.gameplayMainExtra) ??
      hltbHours((hltbData as any)?.gameplay_main_extra) ??
      null
    : game.hltbMainExtra;

const safeHltbCompletionist =
  shouldUpdateHLTB
    ? game.hltbCompletionist ??
      hltbHours((hltbData as any)?.gameplayCompletionist) ??
      hltbHours((hltbData as any)?.gameplay_completionist) ??
      null
    : game.hltbCompletionist;
    await prisma.game.update({
      where: {
        id: game.id,
      },
      
data: {
  rawgId,
  slug,

  releaseDate: safeReleaseDate,
  metacriticScore: safeMetacriticScore,
  coverArtUrl: safeCoverArtUrl,

  hltbMain: safeHltbMain,
  hltbMainExtra: safeHltbMainExtra,
  hltbCompletionist: safeHltbCompletionist,
},
    });

    await sleep(1000);
  }

  console.log("Enrichment complete.");
}
async function getSafeRawgId(rawgId: number, currentGameId: number) {
  const existing = await prisma.game.findUnique({
    where: {
      rawgId,
    },
  });

  if (existing && existing.id !== currentGameId) {
    console.warn(
      `RAWG ID ${rawgId} already belongs to ${existing.title}. Skipping duplicate.`
    );
    return null;
  }

  return rawgId;
}
async function getSafeSlug(slug: string | null | undefined, currentGameId: number) {
  if (!slug) return null;

  const existing = await prisma.game.findUnique({
    where: {
      slug,
    },
  });

  if (existing && existing.id !== currentGameId) {
    console.warn(
      `Slug "${slug}" already belongs to ${existing.title}. Skipping duplicate.`
    );
    return null;
  }

  return slug;
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