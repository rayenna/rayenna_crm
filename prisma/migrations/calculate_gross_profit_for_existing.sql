-- Migration: Calculate grossProfit for existing projects
-- Gross Profit = Order Value (projectCost) - Total Project Cost (totalProjectCost)

UPDATE "projects"
SET "grossProfit" = ROUND(("projectCost" - COALESCE("totalProjectCost", 0))::numeric, 2)
WHERE "projectCost" IS NOT NULL 
  AND "totalProjectCost" IS NOT NULL
  AND "grossProfit" IS NULL;

-- For projects with projectCost but no totalProjectCost, set grossProfit to NULL (cannot calculate)
UPDATE "projects"
SET "grossProfit" = NULL
WHERE "projectCost" IS NOT NULL 
  AND "totalProjectCost" IS NULL
  AND "grossProfit" IS NULL;
