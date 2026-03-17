-- Performance indexes for CRM hot paths (Projects list, dashboards, joins)
-- Safe to run multiple times due to IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS "projects_customerId_idx"       ON "projects" ("customerId");
CREATE INDEX IF NOT EXISTS "projects_salespersonId_idx"    ON "projects" ("salespersonId");
CREATE INDEX IF NOT EXISTS "projects_projectStatus_idx"    ON "projects" ("projectStatus");
CREATE INDEX IF NOT EXISTS "projects_paymentStatus_idx"    ON "projects" ("paymentStatus");
CREATE INDEX IF NOT EXISTS "projects_createdAt_idx"        ON "projects" ("createdAt");
CREATE INDEX IF NOT EXISTS "projects_confirmationDate_idx" ON "projects" ("confirmationDate");
CREATE INDEX IF NOT EXISTS "projects_year_idx"             ON "projects" ("year");

