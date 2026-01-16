-- Add leadSource column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'leadSource'
  ) THEN
    ALTER TABLE "projects" ADD COLUMN "leadSource" "LeadSource";
  END IF;
END $$;
