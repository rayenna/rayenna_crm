-- Add ProjectServiceType enum
CREATE TYPE "ProjectServiceType" AS ENUM (
  'EPC_PROJECT',
  'PANEL_CLEANING',
  'MAINTENANCE',
  'REPAIR',
  'CONSULTING',
  'RESALE',
  'OTHER_SERVICES'
);

-- Add projectServiceType column to projects table with default value
ALTER TABLE "projects" 
ADD COLUMN "projectServiceType" "ProjectServiceType" NOT NULL DEFAULT 'EPC_PROJECT';

-- Update all existing projects to EPC_PROJECT (they already have the default, but this ensures consistency)
UPDATE "projects" 
SET "projectServiceType" = 'EPC_PROJECT' 
WHERE "projectServiceType" IS NULL;
