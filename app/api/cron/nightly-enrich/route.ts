import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichSingleGame } from "@/lib/enrichGame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GAMES_PER_RUN = 12;
const SUCCESS_COOLDOWN_DAYS = 30;
const FAILED_COOLDOWN_HOURS = 24;

export async function GET(request: Request) {
  const startedAt = new Date();
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[nightly-enrich] CRON_SECRET is not configured");
    return NextResponse.json(
      { ok: false, error: "Cron is not configured" },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    console.warn("[nightly-enrich] Rejected unauthorized request");
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const run = await prisma.enrichmentRun.create({
    data: {
      source: "vercel-cron",
      startedAt,
    },
  });

  console.log(
    `[nightly-enrich] Run #${run.id} started at ${startedAt.toISOString()}`,
  );

  let gamesUpdated = 0;
  let gamesFailed = 0;
  let gamesChecked = 0;

  try {
    const now = new Date();
    const successfulCheckCutoff = new Date(
      now.getTime() - SUCCESS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
    );
    const failedCheckCutoff = new Date(
      now.getTime() - FAILED_COOLDOWN_HOURS * 60 * 60 * 1000,
    );

    // Rotate through the complete library, not only games missing metadata.
    // Never-checked games are selected first. Afterwards, completed checks
    // wait 30 days and failures can retry after 24 hours.
    const candidates = await prisma.game.findMany({
      select: {
        id: true,
        title: true,
        coverArtUrl: true,
        metacriticScore: true,
        hltbMain: true,
        releaseDate: true,
        enrichmentLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const eligible = candidates.filter((game) => {
      const latestLog = game.enrichmentLogs[0];
      if (!latestLog) return true;

      if (latestLog.status === "failed") {
        return latestLog.createdAt <= failedCheckCutoff;
      }

      return latestLog.createdAt <= successfulCheckCutoff;
    });

    const games = eligible
      .sort((a, b) => {
        const aNeverChecked = a.enrichmentLogs.length === 0;
        const bNeverChecked = b.enrichmentLogs.length === 0;

        if (aNeverChecked !== bNeverChecked) return aNeverChecked ? -1 : 1;

        const aMissing = countMissingMetadata(a);
        const bMissing = countMissingMetadata(b);

        if (aMissing !== bMissing) return bMissing - aMissing;

        const aCheckedAt = a.enrichmentLogs[0]?.createdAt.getTime() ?? 0;
        const bCheckedAt = b.enrichmentLogs[0]?.createdAt.getTime() ?? 0;

        if (aCheckedAt !== bCheckedAt) return aCheckedAt - bCheckedAt;
        return a.id - b.id;
      })
      .slice(0, GAMES_PER_RUN)
      .map(({ id, title }) => ({ id, title }));

    console.log(
      `[nightly-enrich] ${candidates.length} total games, ${eligible.length} eligible, ${games.length} selected`,
    );

    if (games.length > 0) {
      console.log(
        `[nightly-enrich] Selected: ${games.map((game) => `${game.id}:${game.title}`).join(" | ")}`,
      );
    }

    const results: {
      id: number;
      title: string;
      status: "checked" | "updated" | "failed";
      changedFields: string[];
      error?: string;
    }[] = [];

    for (const game of games) {
      gamesChecked += 1;

      try {
        const result = await enrichSingleGame(game.id);
        const status = result?.updated ? "updated" : "checked";
        const changedFields = result?.changedFields ?? [];

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

        console.log(
          status === "updated"
            ? `[nightly-enrich] Updated ${game.id}:${game.title} (${changedFields.join(", ")})`
            : `[nightly-enrich] Checked ${game.id}:${game.title} — no changes`,
        );

        results.push({
          id: game.id,
          title: game.title,
          status,
          changedFields,
        });
      } catch (error) {
        gamesFailed += 1;
        const message =
          error instanceof Error ? error.message : "Unknown enrichment error";

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

        console.error(
          `[nightly-enrich] Failed ${game.id}:${game.title}: ${message}`,
        );

        results.push({
          id: game.id,
          title: game.title,
          status: "failed",
          changedFields: [],
          error: message,
        });
      }
    }

    const finishedAt = new Date();

    await prisma.enrichmentRun.update({
      where: { id: run.id },
      data: {
        finishedAt,
        gamesChecked,
        gamesUpdated,
        gamesFailed,
      },
    });

    const summary = {
      ok: true,
      runId: run.id,
      checked: gamesChecked,
      updated: gamesUpdated,
      failed: gamesFailed,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      results,
    };

    console.log(`[nightly-enrich] Run #${run.id} finished`, summary);
    return NextResponse.json(summary);
  } catch (error) {
    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : "Unknown error";

    await prisma.enrichmentRun.update({
      where: { id: run.id },
      data: {
        finishedAt,
        gamesChecked,
        gamesUpdated,
        gamesFailed: gamesFailed + 1,
      },
    });

    console.error(`[nightly-enrich] Run #${run.id} failed: ${message}`, error);

    return NextResponse.json(
      { ok: false, runId: run.id, error: message },
      { status: 500 },
    );
  }
}

function countMissingMetadata(game: {
  coverArtUrl: string | null;
  metacriticScore: number | null;
  hltbMain: number | null;
  releaseDate: Date | null;
}) {
  return [
    game.coverArtUrl,
    game.metacriticScore,
    game.hltbMain,
    game.releaseDate,
  ].filter((value) => value == null).length;
}
