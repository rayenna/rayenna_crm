-- Migration: Split address field into multiple fields
-- This migration adds new address fields and migrates existing data

-- Step 1: Add new address fields (nullable)
ALTER TABLE "customers" 
ADD COLUMN IF NOT EXISTS "addressLine1" TEXT,
ADD COLUMN IF NOT EXISTS "addressLine2" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "state" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT,
ADD COLUMN IF NOT EXISTS "pinCode" TEXT;

-- Step 2: Migrate existing address data to addressLine1
-- This preserves existing data by moving it to addressLine1
UPDATE "customers" 
SET "addressLine1" = "address"
WHERE "address" IS NOT NULL AND "address" != '';

-- Step 3: Drop the old address column (after data migration)
-- Uncomment the line below after verifying the migration worked correctly
-- ALTER TABLE "customers" DROP COLUMN IF EXISTS "address";
