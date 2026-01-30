-- CreateEnum
CREATE TYPE "LostToCompetitionReason" AS ENUM ('LOST_DUE_TO_PRICE', 'LOST_DUE_TO_FEATURES', 'LOST_DUE_TO_RELATIONSHIP_OTHER');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "lostToCompetitionReason" "LostToCompetitionReason";
