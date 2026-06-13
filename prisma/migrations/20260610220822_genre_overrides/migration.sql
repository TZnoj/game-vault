-- CreateTable
CREATE TABLE "GenreOverride" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "genres" TEXT NOT NULL,

    CONSTRAINT "GenreOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenreOverride_gameId_key" ON "GenreOverride"("gameId");

-- AddForeignKey
ALTER TABLE "GenreOverride" ADD CONSTRAINT "GenreOverride_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
