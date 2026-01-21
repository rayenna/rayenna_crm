-- AlterTable
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "completionReportSubmissionDate" TIMESTAMP(3);
