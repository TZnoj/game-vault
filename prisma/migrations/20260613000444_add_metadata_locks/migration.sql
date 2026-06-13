-- AlterTable
ALTER TABLE "MetadataOverride" ADD COLUMN     "lockCoverArt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockHLTB" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockMetacritic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualMetacritic" INTEGER;
