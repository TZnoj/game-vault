import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({ adapter });

const overrides: Record<string, string[]> = {
  "Final Fantasy VII": ["JRPG"],
  "Metaphor Refantazio": ["JRPG"],

  "Persona 5:Royal": ["JRPG"],
  "Legend of Heroes: Trails of Cold Steel": ["JRPG"],
  "SaGa Scarlet Grace Ambition": ["JRPG"],
  "SaGa Emerald Beyond": ["JRPG"],
  "Romancing Saga 2": ["JRPG"],
  "Shin Megami Tensei 5:Vengeance": ["JRPG"],
  "Visions of Mana": ["JRPG"],

  "Final Fantasy XV": ["Action RPG"],
  "Final Fantasy XVI": ["Action RPG"],

  "Fire Emblem: Path of Radiance": ["SRPG"],
  "Tactics Ogre: Reborn": ["SRPG"],
  "Unicorn Overlord": ["SRPG"],
  "The Hundred Line - Last Defence Academy": ["SRPG", "Visual Novel"],
  "13 Sentinels: Aegis Rim": ["Visual Novel", "SRPG"],
  "Digimon Survive": ["Visual Novel", "SRPG"],

  "Rule of Rose": ["Survival Horror"],
  "Eternal Darkness": ["Survival Horror"],

  "Mouthwashing": ["Horror"],
  "Paratopic": ["Horror"],
  "No I'm Not Human": ["Horror"],
  "Look Outside": ["RPG", "Horror"],

  "Sekiro": ["Soulslike"],

  "Bayonetta": ["Action"],
  "Armored Core 6": ["Action"],
  "Stellar Blade": ["Action"],
  "Metal Gear Solid V": ["Action"],
  "Legend of Zelda : Link's awakening": ["Action"],

  "Rise of Ronin": ["Action RPG"],
  "Tales of Arise": ["Action RPG"],
  "Stranger of Paradise": ["Action RPG"],
  "Neo The World Ends With You": ["Action RPG"],

  "Ai Somnium files - nirvanA": ["Visual Novel"],
  "Death Match Love Comedy": ["Visual Novel"],

  "Yakuza Like a Dragon": ["JRPG"],
  "Labyrinth of Galleria": ["JRPG"],
  "Claire Obscur : Expedition 33": ["JRPG"],

  "Ship of Fools": ["Roguelike"],
  "Pokopia": ["Simulation", "Monster Collector"],
  "Pokemon Legends: Z-A": ["Action RPG", "Monster Collector"],
  "Digimon Story Time Stranger": ["JRPG", "Monster Collector"],
  "Digimon World Next Order": ["JRPG", "Monster Collector"],
  "Doki Monsters Quest": ["JRPG", "Monster Collector"],
};

async function main() {
  for (const [title, genres] of Object.entries(overrides)) {
    const game = await prisma.game.findUnique({
      where: { title },
    });

    if (!game) {
      console.warn(`Game not found: ${title}`);
      continue;
    }

    await prisma.genreOverride.upsert({
      where: { gameId: game.id },
      update: {
        genres: JSON.stringify(genres),
      },
      create: {
        gameId: game.id,
        genres: JSON.stringify(genres),
      },
    });

    console.log(`Override set: ${title} -> ${genres.join(", ")}`);
  }

  console.log("Genre overrides imported.");
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