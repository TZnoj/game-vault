import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({ adapter });

const standaloneFranchise = "Standalone";

const rules: { franchise: string; patterns: RegExp[] }[] = [
  { franchise: ".hack", patterns: [/^\.hack/i] },

  {
    franchise: "Final Fantasy",
    patterns: [
      /final fantasy/i,
      /crisis core/i,
      /stranger of paradise/i,
    ],
  },

  {
    franchise: "Pokemon",
    patterns: [
      /pokemon/i,
      /pokémon/i,
      /pokopia/i,
      /pokk[eé]n/i,
    ],
  },

  {
    franchise: "The Legend of Zelda",
    patterns: [
      /zelda/i,
      /link's awakening/i,
      /wind waker/i,
      /twilight princess/i,
      /four swords/i,
    ],
  },

  {
    franchise: "SaGa",
    patterns: [
      /saga/i,
      /romancing saga/i,
    ],
  },

  {
    franchise: "Digimon",
    patterns: [/digimon/i],
  },

  {
    franchise: "Shin Megami Tensei",
    patterns: [
      /shin megami tensei/i,
      /smt/i,
      /soul hackers/i,
      /devil survivor/i,
    ],
  },

  {
    franchise: "Persona",
    patterns: [/persona/i],
  },

  {
    franchise: "Fire Emblem",
    patterns: [/fire emblem/i],
  },

  {
    franchise: "Yakuza / Like a Dragon",
    patterns: [/yakuza/i, /like a dragon/i],
  },

  {
    franchise: "Mario",
    patterns: [
      /mario kart/i,
      /mario party/i,
      /paper mario/i,
      /super paper mario/i,
    ],
  },

  {
    franchise: "Kirby",
    patterns: [/kirby/i],
  },

  {
    franchise: "Metroid",
    patterns: [/metroid/i],
  },

  {
    franchise: "Resident Evil",
    patterns: [/resident evil/i],
  },

  {
    franchise: "Sonic",
    patterns: [/sonic/i],
  },

  {
    franchise: "Super Smash Bros.",
    patterns: [/super smash bros/i],
  },

  {
    franchise: "Labyrinth",
    patterns: [/labyrinth of galleria/i, /labyrinth of refrain/i],
  },

  {
    franchise: "Tales",
    patterns: [/tales of/i],
  },

  {
    franchise: "Mana",
    patterns: [/visions of mana/i],
  },

  {
    franchise: "Dragon Quest",
    patterns: [/dragon quest/i],
  },

  {
    franchise: "Metal Gear",
    patterns: [/metal gear/i, /^mgs/i],
  },

  {
    franchise: "NieR",
    patterns: [/nier/i],
  },

  {
    franchise: "Dark Souls",
    patterns: [/dark souls/i],
  },

  {
    franchise: "Yu-Gi-Oh!",
    patterns: [/yu-gi-oh/i],
  },

  {
    franchise: "LEGO Star Wars",
    patterns: [/lego star wars/i],
  },
];

function getFranchiseName(title: string) {
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(title))) {
      return rule.franchise;
    }
  }

  return standaloneFranchise;
}

async function main() {
  const games = await prisma.game.findMany({
    orderBy: {
      title: "asc",
    },
    include: {
      franchise: true,
    },
  });

  const franchiseCache = new Map<string, number>();

  async function getOrCreateFranchiseId(name: string) {
    const cached = franchiseCache.get(name);
    if (cached) return cached;

    const franchise = await prisma.franchise.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
      },
    });

    franchiseCache.set(name, franchise.id);
    return franchise.id;
  }

  const results: { title: string; from: string; to: string }[] = [];

  for (const game of games) {
    const franchiseName = getFranchiseName(game.title);
    const franchiseId = await getOrCreateFranchiseId(franchiseName);

    await prisma.game.update({
      where: {
        id: game.id,
      },
      data: {
        franchise: {
          connect: {
            id: franchiseId,
          },
        },
      },
    });

    const updated = await prisma.game.findUnique({
      where: {
        id: game.id,
      },
      include: {
        franchise: true,
      },
    });

    results.push({
      title: game.title,
      from: game.franchise?.name ?? "None",
      to: updated?.franchise?.name ?? "None",
    });
  }

  console.table(results);
  console.log(`Assigned franchises for ${results.length} games.`);
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