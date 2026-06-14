-- CreateTable
CREATE TABLE "EnrichmentRun" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "gamesChecked" INTEGER NOT NULL DEFAULT 0,
    "gamesUpdated" INTEGER NOT NULL DEFAULT 0,
    "gamesFailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrichmentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrichmentLog" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "gameId" INTEGER,
    "gameTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changedFields" TEXT[],
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrichmentLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EnrichmentLog" ADD CONSTRAINT "EnrichmentLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "EnrichmentRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrichmentLog" ADD CONSTRAINT "EnrichmentLog_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
