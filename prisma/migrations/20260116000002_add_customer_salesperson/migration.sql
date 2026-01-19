-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "salespersonId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "customers"
    ADD CONSTRAINT "customers_salespersonId_fkey"
    FOREIGN KEY ("salespersonId") REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
