import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichSingleGame } from "@/lib/enrichGame";

type BeforeAfterSnapshot = {
  coverArtUrl: string | null;
  metacriticScore: number | null;
  hltbMain: number | null;
  hltbMainExtra: number | null;
  hltbCompletionist: number | null;
  releaseDate: Date | null;
};



export async function GET(request: Request) {
console.log("CRON AUTH:", request.headers.get("authorization"));
  const authHeader = request.headers.get("authorization");

if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 },
  );
}

  const run = await prisma.enrichmentRun.create({
    data: {
      source: "vercel-cron",
      startedAt: new Date(),
    },
  });

  const games = await prisma.game.findMany({
    where: {
      OR: [
        { coverArtUrl: null },
        { metacriticScore: null },
        { hltbMain: null },
        { releaseDate: null },
      ],
    },
    orderBy: {
      updatedAt: "asc",
    },
    select: {
      id: true,
      title: true,
    },
  });

  let gamesUpdated = 0;
  let gamesFailed = 0;

  const results: {
    id: number;
    title: string;
    status: "checked" | "updated" | "failed";
    changedFields: string[];
    error?: string;
  }[] = [];

  for (const game of games) {
    try {
      const before = await getSnapshot(game.id);

      await enrichSingleGame(game.id);

      const after = await getSnapshot(game.id);

      const changedFields = getChangedFields(before, after);
      const status = changedFields.length > 0 ? "updated" : "checked";

      if (status === "updated") {
        gamesUpdated += 1;
      }

      await prisma.enrichmentLog.create({
        data: {
          runId: run.id,
          gameId: game.id,
          gameTitle: game.title,
          status,
          changedFields,
        },
      });

      results.push({
        id: game.id,
        title: game.title,
        status,
        changedFields,
      });
    } catch (error) {
      gamesFailed += 1;

      const message =
        error instanceof Error ? error.message : "Unknown error";

      await prisma.enrichmentLog.create({
        data: {
          runId: run.id,
          gameId: game.id,
          gameTitle: game.title,
          status: "failed",
          changedFields: [],
          error: message,
        },
      });

      results.push({
        id: game.id,
        title: game.title,
        status: "failed",
        changedFields: [],
        error: message,
      });
    }

    await sleep(1000);
  }

  await prisma.enrichmentRun.update({
    where: {
      id: run.id,
    },
    data: {
      finishedAt: new Date(),
      gamesChecked: games.length,
      gamesUpdated,
      gamesFailed,
    },
  });

  return NextResponse.json({
    ok: true,
    runId: run.id,
    checked: games.length,
    updated: gamesUpdated,
    failed: gamesFailed,
    results,
  });
}

async function getSnapshot(gameId: number): Promise<BeforeAfterSnapshot> {
  const game = await prisma.game.findUnique({
    where: {
      id: gameId,
    },
    select: {
      coverArtUrl: true,
      metacriticScore: true,
      hltbMain: true,
      hltbMainExtra: true,
      hltbCompletionist: true,
      releaseDate: true,
    },
  });

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  return game;
}

function getChangedFields(
  before: BeforeAfterSnapshot,
  after: BeforeAfterSnapshot,
) {
  const changedFields: string[] = [];

  if (before.coverArtUrl !== after.coverArtUrl) {
    changedFields.push("coverArtUrl");
  }

  if (before.metacriticScore !== after.metacriticScore) {
    changedFields.push("metacriticScore");
  }

  if (before.hltbMain !== after.hltbMain) {
    changedFields.push("hltbMain");
  }

  if (before.hltbMainExtra !== after.hltbMainExtra) {
    changedFields.push("hltbMainExtra");
  }

  if (before.hltbCompletionist !== after.hltbCompletionist) {
    changedFields.push("hltbCompletionist");
  }

  const beforeRelease = before.releaseDate?.toISOString() ?? null;
  const afterRelease = after.releaseDate?.toISOString() ?? null;

  if (beforeRelease !== afterRelease) {
    changedFields.push("releaseDate");
  }

  return changedFields;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}