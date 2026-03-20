-- Roof layout persistence:
-- - Store AI + manual roof layout images + metrics in a DB table
-- - Persist includeRoofLayout flag on PE proposals
-- This is designed to be safe for migrate deploy (no shadow DB).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoofLayoutSource') THEN
    CREATE TYPE "RoofLayoutSource" AS ENUM ('AI', 'MANUAL');
  END IF;
END $$;

ALTER TABLE "pe_proposals"
  ADD COLUMN IF NOT EXISTS "includeRoofLayout" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "project_roof_layouts" (
  "id"            TEXT NOT NULL,
  "projectId"    TEXT NOT NULL,
  "roofAreaM2"   DOUBLE PRECISION NOT NULL,
  "usableAreaM2" DOUBLE PRECISION NOT NULL,
  "panelCount"   INTEGER NOT NULL,
  "layoutImageUrl" TEXT NOT NULL,
  "source"        "RoofLayoutSource" NOT NULL DEFAULT 'AI',
  "savedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "project_roof_layouts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_roof_layouts_projectId_key" UNIQUE ("projectId"),
  CONSTRAINT "project_roof_layouts_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "project_roof_layouts_projectId_idx" ON "project_roof_layouts"("projectId");

