-- Case-insensitive name sort: ORDER BY customerName uses byte/collation ordering where lowercase
-- letters sort after uppercase (e.g. DESC puts "joy" before "Vishnu"). Sort by this key instead.
ALTER TABLE "customers" ADD COLUMN "customerNameSortKey" TEXT
  GENERATED ALWAYS AS (lower(trim("customerName"))) STORED;

CREATE INDEX IF NOT EXISTS "customers_customerNameSortKey_idx" ON "customers"("customerNameSortKey");
