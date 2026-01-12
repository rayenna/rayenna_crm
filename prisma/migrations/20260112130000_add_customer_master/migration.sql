-- CreateTable: Create customers table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "address" TEXT,
    "contactNumbers" TEXT,
    "consumerNumber" TEXT,
    "leadSource" TEXT,
    "leadBroughtBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Create unique index on customerId (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'customers_customerId_key'
    ) THEN
        CREATE UNIQUE INDEX "customers_customerId_key" ON "customers"("customerId");
    END IF;
END $$;

-- AlterTable: Add customerId column to projects (nullable initially)
ALTER TABLE "projects" ADD COLUMN "customerId" TEXT;

-- Data Migration: Create customers from existing projects and link them
DO $$
DECLARE
    project_record RECORD;
    new_customer_id TEXT;
    customer_db_id TEXT;
    customer_key TEXT;
    customer_map TEXT[] := ARRAY[]::TEXT[];
    customer_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Loop through all projects
    FOR project_record IN 
        SELECT DISTINCT 
            "customerName",
            COALESCE("address", '') as address,
            COALESCE("contactNumbers", '') as contactNumbers,
            COALESCE("consumerNumber", '') as consumerNumber,
            COALESCE("leadSource", '') as leadSource,
            COALESCE("leadBroughtBy", '') as leadBroughtBy
        FROM "projects"
        WHERE "customerName" IS NOT NULL
    LOOP
        -- Create a unique key for grouping customers
        customer_key := LOWER(project_record."customerName" || '_' || COALESCE(project_record."consumerNumber", 'no-consumer'));
        
        -- Check if we've already created this customer
        IF customer_key = ANY(customer_map) THEN
            -- Find the customer ID we already created
            customer_db_id := customer_ids[array_position(customer_map, customer_key)];
        ELSE
            -- Generate a unique 6-digit alphanumeric ID
            -- Format: 3 letters + 3 numbers (e.g., ABC123)
            LOOP
                new_customer_id := 
                    CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
                    CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
                    CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
                    FLOOR(RANDOM() * 10)::TEXT ||
                    FLOOR(RANDOM() * 10)::TEXT ||
                    FLOOR(RANDOM() * 10)::TEXT;
                
                -- Check if this ID already exists
                EXIT WHEN NOT EXISTS (SELECT 1 FROM "customers" WHERE "customerId" = new_customer_id);
            END LOOP;
            
            -- Insert new customer
            INSERT INTO "customers" (
                "id",
                "customerId",
                "customerName",
                "address",
                "contactNumbers",
                "consumerNumber",
                "leadSource",
                "leadBroughtBy",
                "createdAt",
                "updatedAt"
            ) VALUES (
                gen_random_uuid()::TEXT,
                new_customer_id,
                project_record."customerName",
                NULLIF(project_record."address", ''),
                NULLIF(project_record."contactNumbers", ''),
                NULLIF(project_record."consumerNumber", ''),
                NULLIF(project_record."leadSource", ''),
                NULLIF(project_record."leadBroughtBy", ''),
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ) RETURNING "id" INTO customer_db_id;
            
            -- Store the mapping
            customer_map := array_append(customer_map, customer_key);
            customer_ids := array_append(customer_ids, customer_db_id);
        END IF;
        
        -- Update all projects with this customer data to point to the customer
        UPDATE "projects"
        SET "customerId" = customer_db_id
        WHERE "customerName" = project_record."customerName"
          AND COALESCE("consumerNumber", '') = COALESCE(project_record."consumerNumber", '')
          AND "customerId" IS NULL;
    END LOOP;
END $$;

-- AlterTable: Make customerId required and add foreign key constraint
ALTER TABLE "projects" ALTER COLUMN "customerId" SET NOT NULL;

-- AddForeignKey: Add foreign key constraint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Remove old customer fields from projects
ALTER TABLE "projects" DROP COLUMN "customerName";
ALTER TABLE "projects" DROP COLUMN "address";
ALTER TABLE "projects" DROP COLUMN "contactNumbers";
ALTER TABLE "projects" DROP COLUMN "consumerNumber";
ALTER TABLE "projects" DROP COLUMN "leadSource";
ALTER TABLE "projects" DROP COLUMN "leadBroughtBy";
