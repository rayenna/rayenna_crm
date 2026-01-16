-- AlterTable
ALTER TABLE "customers" ADD COLUMN "salespersonId" TEXT;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
