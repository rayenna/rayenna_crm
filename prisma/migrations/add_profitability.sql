-- Migration: Add profitability field to Project model
-- Profitability (%) = (Gross Profit / Order Value) × 100

ALTER TABLE "projects" 
ADD COLUMN IF NOT EXISTS "profitability" DOUBLE PRECISION;
