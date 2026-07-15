import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichSingleGame } from "@/lib/enrichGame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Keep the batch small enough for Vercel's function-duration limits.
// The oldest incomplete games are selected first, so repeated runs eventually
// work through the full library.
const GAMES_PER_RUN = 12;

type BeforeAfterSnapshot = {
  coverArtUrl: string | null;
  metacriticScore: number | null;
  hltbMain: number | null;
  hltbMainExtra: number | null;
  hltbCompletionist: number | null;
  releaseDate: Date | null;
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is not configured in Vercel.");
    return NextResponse.json(
      { error: "Cron is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await prisma.enrichmentRun.create({
    data: {
      source: "vercel-cron",
      startedAt: new Date(),
    },
  });

  let gamesUpdated = 0;
  let gamesFailed = 0;

  try {
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { coverArtUrl: null },
          { metacriticScore: null },
          { hltbMain: null },
          { releaseDate: null },
        ],
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: GAMES_PER_RUN,
      select: {
        id: true,
        title: true,
      },
    });

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

        if (status === "updated") gamesUpdated += 1;

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
    }

    await prisma.enrichmentRun.update({
      where: { id: run.id },
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await prisma.enrichmentRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        gamesUpdated,
        gamesFailed: gamesFailed + 1,
      },
    });

    console.error("Nightly enrichment failed", error);
    return NextResponse.json(
      { ok: false, runId: run.id, error: message },
      { status: 500 },
    );
  }
}

async function getSnapshot(gameId: number): Promise<BeforeAfterSnapshot> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      coverArtUrl: true,
      metacriticScore: true,
      hltbMain: true,
      hltbMainExtra: true,
      hltbCompletionist: true,
      releaseDate: true,
    },
  });

  if (!game) throw new Error(`Game ${gameId} not found`);
  return game;
}

function getChangedFields(
  before: BeforeAfterSnapshot,
  after: BeforeAfterSnapshot,
) {
  const changedFields: string[] = [];

  if (before.coverArtUrl !== after.coverArtUrl)
    changedFields.push("coverArtUrl");
  if (before.metacriticScore !== after.metacriticScore) {
    changedFields.push("metacriticScore");
  }
  if (before.hltbMain !== after.hltbMain) changedFields.push("hltbMain");
  if (before.hltbMainExtra !== after.hltbMainExtra) {
    changedFields.push("hltbMainExtra");
  }
  if (before.hltbCompletionist !== after.hltbCompletionist) {
    changedFields.push("hltbCompletionist");
  }

  const beforeRelease = before.releaseDate?.toISOString() ?? null;
  const afterRelease = after.releaseDate?.toISOString() ?? null;

  if (beforeRelease !== afterRelease) changedFields.push("releaseDate");

  return changedFields;
}
