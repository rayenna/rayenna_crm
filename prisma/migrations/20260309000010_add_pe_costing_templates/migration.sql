-- Shared Proposal Engine costing templates stored in the backend.
-- Accessible to all users via the API; only Admin can delete.

CREATE TABLE IF NOT EXISTS "pe_costing_templates" (
  "id"           TEXT        NOT NULL,
  "name"         TEXT        NOT NULL,
  "description"  TEXT,
  "items"        JSONB       NOT NULL,
  "createdById"  TEXT        NOT NULL,
  "savedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pe_costing_templates_pkey" PRIMARY KEY ("id")
);

-- Foreign key to users table (creator of the template).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'pe_costing_templates_createdById_fkey'
  ) THEN
    ALTER TABLE "pe_costing_templates"
      ADD CONSTRAINT "pe_costing_templates_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Helpful indexes for querying templates.
CREATE INDEX IF NOT EXISTS "pe_costing_templates_createdById_idx"
  ON "pe_costing_templates"("createdById");

CREATE INDEX IF NOT EXISTS "pe_costing_templates_savedAt_idx"
  ON "pe_costing_templates"("savedAt");

