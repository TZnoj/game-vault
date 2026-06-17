import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const genresToAdd = [
  "Turn-Based RPG",
  "Dungeon Crawler",
  "Monster Taming",
  "3D Platformer",
  "2D Platformer",
  "Hack and Slash",
  "Beat Em Up",
  "First Person Shooter",
  "Third Person Shooter",
  "Stealth",
  "Rhythm",
  "Sports",
  "Party Game",
  "Mini Games",
  "Real Time Strategy",
  "Card Game",
  "Open World",
  "Sandbox",
  "Arcade",
  "Narrative",
  "Fantasy",
  "Dark Fantasy",
  "Sci Fi",
  "Cyberpunk",
  "Post Apocalyptic",
  "Western",
  "Modern",
  "Historical",
  "Medieval",
  "Mythology",
  "Supernatural",
  "Mystery",
  "Detective",
  "Crime",
  "Military",
  "Mecha",
  "Anime",
  "Comedy",
  "Psychological",
  "Surreal",
  "Romance",
  "School",
  "Space",
  "Pirates",
  "Ninja",
  "Samurai",
  "Superhero",
  "Dystopian",
  "Urban Fantasy",
  "Gothic",
  "Lovecraftian",
  "Story Heavy",
  "Choice Based",
  "Multiple Endings",
  "Exploration",
  "Boss Rush",
  "Difficult",
  "Cozy",
  "Grindy",
  "Linear",
  "Nonlinear",
  "Permadeath",
  "Procedural",
  "Single Player",
  "Collectathon",
  "Crafting",
  "Base Building",
];

async function main() {
  for (const name of genresToAdd) {
    const existing = await prisma.genre.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      console.log(`Skipped existing genre: ${name}`);
      continue;
    }

    await prisma.genre.create({
      data: {
        name,
      },
    });

    console.log(`Added genre: ${name}`);
  }

  console.log("Done adding genres.");
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