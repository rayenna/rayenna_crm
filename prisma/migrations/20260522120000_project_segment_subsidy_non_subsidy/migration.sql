-- Project Segment: Subsidy vs Non-Subsidy (customer type is on Customer Master).
CREATE TYPE "ProjectType_new" AS ENUM ('SUBSIDY', 'NON_SUBSIDY');

ALTER TABLE "projects"
  ALTER COLUMN "type" TYPE "ProjectType_new"
  USING (
    CASE "type"::text
      WHEN 'RESIDENTIAL_SUBSIDY' THEN 'SUBSIDY'::"ProjectType_new"
      WHEN 'RESIDENTIAL_NON_SUBSIDY' THEN 'NON_SUBSIDY'::"ProjectType_new"
      WHEN 'COMMERCIAL_INDUSTRIAL' THEN 'NON_SUBSIDY'::"ProjectType_new"
      ELSE 'NON_SUBSIDY'::"ProjectType_new"
    END
  );

DROP TYPE "ProjectType";

ALTER TYPE "ProjectType_new" RENAME TO "ProjectType";
