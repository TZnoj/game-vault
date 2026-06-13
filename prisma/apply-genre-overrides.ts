import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({ adapter });

async function setGameGenres(gameId: number, genreNames: string[]) {
  await prisma.gameGenre.deleteMany({
    where: { gameId },
  });

  for (const name of genreNames) {
    const genre = await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    await prisma.gameGenre.create({
      data: {
        gameId,
        genreId: genre.id,
      },
    });
  }
}

async function main() {
  const overrides = await prisma.genreOverride.findMany({
    include: {
      game: true,
    },
  });

  for (const override of overrides) {
    const genres = JSON.parse(override.genres) as string[];

    await setGameGenres(override.gameId, genres);

    console.log(`${override.game.title} -> ${genres.join(", ")}`);
  }

  console.log("Genre overrides applied.");
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