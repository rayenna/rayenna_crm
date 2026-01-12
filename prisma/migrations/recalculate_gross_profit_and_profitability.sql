-- Migration: Recalculate grossProfit and profitability for all existing projects
-- This ensures all projects have correct calculated values

-- First, update grossProfit for all projects that have projectCost and totalProjectCost
UPDATE "projects"
SET "grossProfit" = ROUND(("projectCost" - COALESCE("totalProjectCost", 0))::numeric, 2)
WHERE "projectCost" IS NOT NULL 
  AND "totalProjectCost" IS NOT NULL
  AND (
    "grossProfit" IS NULL 
    OR ABS("grossProfit" - ROUND(("projectCost" - COALESCE("totalProjectCost", 0))::numeric, 2)) > 0.01
  );

-- Set grossProfit to NULL for projects that can't be calculated
UPDATE "projects"
SET "grossProfit" = NULL
WHERE ("projectCost" IS NULL OR "totalProjectCost" IS NULL)
  AND "grossProfit" IS NOT NULL;

-- Now, update profitability for all projects that have grossProfit and projectCost
UPDATE "projects"
SET "profitability" = ROUND((("grossProfit" / NULLIF("projectCost", 0)) * 100)::numeric, 2)
WHERE "grossProfit" IS NOT NULL 
  AND "projectCost" IS NOT NULL 
  AND "projectCost" != 0
  AND (
    "profitability" IS NULL 
    OR ABS("profitability" - ROUND((("grossProfit" / NULLIF("projectCost", 0)) * 100)::numeric, 2)) > 0.01
  );

-- Set profitability to NULL for projects that can't be calculated
UPDATE "projects"
SET "profitability" = NULL
WHERE ("grossProfit" IS NULL OR "projectCost" IS NULL OR "projectCost" = 0)
  AND "profitability" IS NOT NULL;
