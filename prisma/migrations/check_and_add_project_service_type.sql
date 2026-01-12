-- Check if enum exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectServiceType') THEN
        CREATE TYPE "ProjectServiceType" AS ENUM (
          'EPC_PROJECT',
          'PANEL_CLEANING',
          'MAINTENANCE',
          'REPAIR',
          'CONSULTING',
          'RESALE',
          'OTHER_SERVICES'
        );
    END IF;
END $$;

-- Check if column exists, add if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'projectServiceType'
    ) THEN
        ALTER TABLE "projects" 
        ADD COLUMN "projectServiceType" "ProjectServiceType" NOT NULL DEFAULT 'EPC_PROJECT';
    END IF;
END $$;

-- Update all existing projects to EPC_PROJECT
UPDATE "projects" 
SET "projectServiceType" = 'EPC_PROJECT' 
WHERE "projectServiceType" IS NULL;
