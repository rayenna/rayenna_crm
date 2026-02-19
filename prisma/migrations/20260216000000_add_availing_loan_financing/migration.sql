-- AlterTable: Add availing loan / financing columns to projects (Sales & Commercial)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "availingLoan" BOOLEAN;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "financingBank" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "financingBankOther" TEXT;
