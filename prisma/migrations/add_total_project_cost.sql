-- Migration: Add totalProjectCost field to Project model
-- This field tracks the overall cost incurred in the project

ALTER TABLE "projects" 
ADD COLUMN IF NOT EXISTS "totalProjectCost" DOUBLE PRECISION;
