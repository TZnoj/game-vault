import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const deletedLinks = await prisma.gameGenre.deleteMany({});

  const deletedUnusedGenres = await prisma.genre.deleteMany({
    where: {
      gameGenres: {
        none: {},
      },
    },
  });

  console.log(`Deleted ${deletedLinks.count} game-genre links.`);
  console.log(`Deleted ${deletedUnusedGenres.count} unused genres.`);
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