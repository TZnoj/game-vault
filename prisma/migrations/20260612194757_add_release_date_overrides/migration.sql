-- AlterTable
ALTER TABLE "MetadataOverride" ADD COLUMN     "lockReleaseDate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualReleaseDate" TIMESTAMP(3);
