-- AlterTable
ALTER TABLE "projects" ADD COLUMN "leadSourceDetails" TEXT;

-- AlterEnum (PostgreSQL doesn't support ALTER TYPE directly, need to recreate)
-- First, add new values to the enum
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'DIGITAL_MARKETING';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'OTHER';
