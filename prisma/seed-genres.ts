import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({ adapter });

const genres = [
  "JRPG",
  "SRPG",
  "Metroidvania",
  "Visual Novel",
  "Survival Horror",
  "Horror",
  "Action RPG",
  "Soulslike",
  "Platformer",
  "Roguelike",
  "Puzzle",
  "Adventure",
  "Strategy",
  "Shooter",
  "Fighting",
  "Racing",
  "Simulation",
  "Monster Collector",
];

async function main() {
  for (const name of genres) {
    await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    console.log(`Added/kept genre: ${name}`);
  }

  console.log("Genre seed complete.");
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