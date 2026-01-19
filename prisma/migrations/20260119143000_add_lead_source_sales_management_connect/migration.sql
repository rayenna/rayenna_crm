-- Add new LeadSource enum values
-- This is safe to run multiple times (IF NOT EXISTS) and works on Neon/Postgres.

ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'SALES';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'MANAGEMENT_CONNECT';

