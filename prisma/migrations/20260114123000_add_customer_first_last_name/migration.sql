-- Search index migrations reference these columns; they were missing from the
-- initial customers table migration, which breaks shadow DB replay (prisma migrate dev).
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
