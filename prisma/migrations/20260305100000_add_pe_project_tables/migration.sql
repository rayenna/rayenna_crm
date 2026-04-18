-- PE tables for CRM-linked Proposal Engine artifacts. The old
-- `20260305_add_proposal_engine_tables.sql` file was never a Prisma migration, so
-- shadow DB replay had no `pe_proposals` (etc.) before later ALTERs.

CREATE TABLE IF NOT EXISTS "pe_costing_sheets" (
  "id"           TEXT NOT NULL,
  "projectId"    TEXT NOT NULL,
  "createdById"  TEXT NOT NULL,
  "sheetName"    TEXT NOT NULL,
  "items"        JSONB NOT NULL,
  "showGst"      BOOLEAN NOT NULL DEFAULT true,
  "marginPct"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grandTotal"   DOUBLE PRECISION NOT NULL,
  "systemSizeKw" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "savedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pe_costing_sheets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pe_bom_sheets" (
  "id"          TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "rows"        JSONB NOT NULL,
  "savedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pe_bom_sheets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pe_roi_results" (
  "id"          TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "result"      JSONB NOT NULL,
  "savedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pe_roi_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pe_proposals" (
  "id"            TEXT NOT NULL,
  "projectId"     TEXT NOT NULL,
  "createdById"   TEXT NOT NULL,
  "refNumber"     TEXT NOT NULL,
  "generatedAt"   TIMESTAMP(3) NOT NULL,
  "bomComments"   JSONB,
  "editedHtml"    TEXT,
  "textOverrides" JSONB,
  "summary"       TEXT,
  "savedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pe_proposals_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pe_costing_sheets_projectId_fkey'
  ) THEN
    ALTER TABLE "pe_costing_sheets"
      ADD CONSTRAINT "pe_costing_sheets_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pe_costing_sheets_createdById_fkey'
  ) THEN
    ALTER TABLE "pe_costing_sheets"
      ADD CONSTRAINT "pe_costing_sheets_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pe_bom_sheets_projectId_fkey'
  ) THEN
    ALTER TABLE "pe_bom_sheets"
      ADD CONSTRAINT "pe_bom_sheets_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pe_bom_sheets_createdById_fkey'
  ) THEN
    ALTER TABLE "pe_bom_sheets"
      ADD CONSTRAINT "pe_bom_sheets_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pe_roi_results_projectId_fkey'
  ) THEN
    ALTER TABLE "pe_roi_results"
      ADD CONSTRAINT "pe_roi_results_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pe_roi_results_createdById_fkey'
  ) THEN
    ALTER TABLE "pe_roi_results"
      ADD CONSTRAINT "pe_roi_results_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pe_proposals_projectId_fkey'
  ) THEN
    ALTER TABLE "pe_proposals"
      ADD CONSTRAINT "pe_proposals_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pe_proposals_createdById_fkey'
  ) THEN
    ALTER TABLE "pe_proposals"
      ADD CONSTRAINT "pe_proposals_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "pe_costing_sheets_projectId_idx" ON "pe_costing_sheets"("projectId");
CREATE INDEX IF NOT EXISTS "pe_costing_sheets_savedAt_idx" ON "pe_costing_sheets"("savedAt");
CREATE INDEX IF NOT EXISTS "pe_bom_sheets_projectId_idx" ON "pe_bom_sheets"("projectId");
CREATE INDEX IF NOT EXISTS "pe_bom_sheets_savedAt_idx" ON "pe_bom_sheets"("savedAt");
CREATE INDEX IF NOT EXISTS "pe_roi_results_projectId_idx" ON "pe_roi_results"("projectId");
CREATE INDEX IF NOT EXISTS "pe_roi_results_savedAt_idx" ON "pe_roi_results"("savedAt");
CREATE INDEX IF NOT EXISTS "pe_proposals_projectId_idx" ON "pe_proposals"("projectId");
CREATE INDEX IF NOT EXISTS "pe_proposals_savedAt_idx" ON "pe_proposals"("savedAt");
