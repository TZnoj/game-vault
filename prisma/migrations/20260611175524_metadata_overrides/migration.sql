-- CreateTable
CREATE TABLE "MetadataOverride" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "igdbName" TEXT,
    "rawgName" TEXT,
    "hltbName" TEXT,
    "coverArtUrl" TEXT,

    CONSTRAINT "MetadataOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetadataOverride_gameId_key" ON "MetadataOverride"("gameId");

-- AddForeignKey
ALTER TABLE "MetadataOverride" ADD CONSTRAINT "MetadataOverride_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
