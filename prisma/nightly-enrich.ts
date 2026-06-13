import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { enrichSingleGame } from "@/lib/enrichGame";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const games = await prisma.game.findMany({
    orderBy: {
      title: "asc",
    },
    select: {
      id: true,
      title: true,
    },
  });

  console.log(`Nightly enrichment starting for ${games.length} games.`);

  for (const game of games) {
    console.log(`Enriching: ${game.title}`);

    try {
      await enrichSingleGame(game.id);
    } catch (error) {
      console.warn(`Failed to enrich ${game.title}`);
      console.warn(error);
    }

    await sleep(1000);
  }

  console.log("Nightly enrichment complete.");
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