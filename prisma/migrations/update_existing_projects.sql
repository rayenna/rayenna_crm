-- Ensure all existing projects have EPC_PROJECT as their projectServiceType
-- Note: The column already has a default value, so this is just a safety check
UPDATE "projects" 
SET "projectServiceType" = 'EPC_PROJECT' 
WHERE "projectServiceType" IS NULL;
