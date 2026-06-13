import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is missing from .env");
}

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const platforms = [
    { name: "SNES", manufacturer: "Nintendo", generation: 4 },
    { name: "Game Boy", manufacturer: "Nintendo", generation: 4 },
    { name: "Nintendo 64", manufacturer: "Nintendo", generation: 5 },
    { name: "GameCube", manufacturer: "Nintendo", generation: 6 },
    { name: "Game Boy Advance", manufacturer: "Nintendo", generation: 6 },
    { name: "Wii", manufacturer: "Nintendo", generation: 7 },
    { name: "Nintendo DS", manufacturer: "Nintendo", generation: 7 },
    { name: "Wii U", manufacturer: "Nintendo", generation: 8 },
    { name: "Nintendo 3DS", manufacturer: "Nintendo", generation: 8 },
    { name: "Switch", manufacturer: "Nintendo", generation: 8 },
    { name: "Switch 2", manufacturer: "Nintendo", generation: 9 },
    { name: "PS1", manufacturer: "Sony", generation: 5 },
    { name: "PS2", manufacturer: "Sony", generation: 6 },
    { name: "PS3", manufacturer: "Sony", generation: 7 },
    { name: "PS4", manufacturer: "Sony", generation: 8 },
    { name: "PS5", manufacturer: "Sony", generation: 9 },
    { name: "Xbox", manufacturer: "Microsoft", generation: 6 },
    { name: "Xbox 360", manufacturer: "Microsoft", generation: 7 },
    { name: "Xbox One", manufacturer: "Microsoft", generation: 8 },
    { name: "Xbox Series X/S", manufacturer: "Microsoft", generation: 9 },
    { name: "Steam", manufacturer: "Valve", generation: null },
    { name: "PC", manufacturer: "PC", generation: null },
  ];

  for (const platform of platforms) {
    await prisma.platform.upsert({
      where: { name: platform.name },
      update: platform,
      create: platform,
    });
  }

  const genres = [
    "Action",
    "Adventure",
    "JRPG",
    "RPG",
    "Strategy",
    "Strategy RPG",
    "Platformer",
    "Metroidvania",
    "Visual Novel",
    "Puzzle",
    "Fighting",
    "Racing",
    "Shooter",
    "Horror",
    "Survival Horror",
    "Simulation",
    "Sports",
  ];

  for (const name of genres) {
    await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
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