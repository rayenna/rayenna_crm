-- Migration: Add new customer fields
-- Email, Id Proof#, Type of Id Proof, Company Name, Company GST#

ALTER TABLE "customers" 
ADD COLUMN IF NOT EXISTS "email" TEXT,
ADD COLUMN IF NOT EXISTS "idProofNumber" TEXT,
ADD COLUMN IF NOT EXISTS "idProofType" TEXT,
ADD COLUMN IF NOT EXISTS "companyName" TEXT,
ADD COLUMN IF NOT EXISTS "companyGst" TEXT;
