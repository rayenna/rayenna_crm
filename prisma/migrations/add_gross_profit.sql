-- Migration: Add grossProfit field to Project model
-- Gross Profit = Order Value (projectCost) - Total Project Cost (totalProjectCost)

ALTER TABLE "projects" 
ADD COLUMN IF NOT EXISTS "grossProfit" DOUBLE PRECISION;
