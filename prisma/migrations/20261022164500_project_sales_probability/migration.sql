-- Sales Probability (0–100) on projects. Backfill from current status, then lock hygiene.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "salesProbability" INTEGER;

UPDATE "projects"
SET "salesProbability" = CASE "projectStatus"
  WHEN 'LEAD' THEN 10
  WHEN 'SITE_SURVEY' THEN 20
  WHEN 'PROPOSAL' THEN 30
  WHEN 'CONFIRMED' THEN 75
  WHEN 'UNDER_INSTALLATION' THEN 100
  WHEN 'SUBMITTED_FOR_SUBSIDY' THEN 100
  WHEN 'COMPLETED' THEN 100
  WHEN 'COMPLETED_SUBSIDY_CREDITED' THEN 100
  WHEN 'LOST' THEN 0
  ELSE 10
END
WHERE "salesProbability" IS NULL;

ALTER TABLE "projects"
  ALTER COLUMN "salesProbability" SET DEFAULT 10,
  ALTER COLUMN "salesProbability" SET NOT NULL;

ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_salesProbability_range";
ALTER TABLE "projects" ADD CONSTRAINT "projects_salesProbability_range"
  CHECK ("salesProbability" >= 0 AND "salesProbability" <= 100);

ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_salesProbability_hygiene";
ALTER TABLE "projects" ADD CONSTRAINT "projects_salesProbability_hygiene"
  CHECK (
    ("projectStatus" <> 'LOST' OR "salesProbability" = 0)
    AND (
      "projectStatus" NOT IN ('COMPLETED', 'COMPLETED_SUBSIDY_CREDITED')
      OR "salesProbability" = 100
    )
  );
