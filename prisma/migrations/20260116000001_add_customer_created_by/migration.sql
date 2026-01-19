-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "customers"
    ADD CONSTRAINT "customers_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
