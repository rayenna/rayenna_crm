-- Complete the customer master migration
-- This script handles the case where the migration was partially applied

-- Step 1: Ensure customers table exists with correct structure
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customers'
    ) THEN
        CREATE TABLE "customers" (
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
        
        CREATE UNIQUE INDEX IF NOT EXISTS "customers_customerId_key" ON "customers"("customerId");
    END IF;
END $$;

-- Step 2: Add customerId column to projects if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'customerId'
    ) THEN
        ALTER TABLE "projects" ADD COLUMN "customerId" TEXT;
    END IF;
END $$;

-- Step 3: Data Migration - Create customers from existing projects and link them
DO $$
DECLARE
    project_record RECORD;
    new_customer_id TEXT;
    customer_db_id TEXT;
    customer_key TEXT;
    customer_map TEXT[] := ARRAY[]::TEXT[];
    customer_ids TEXT[] := ARRAY[]::TEXT[];
    map_index INT;
BEGIN
    -- Only proceed if customerName column still exists in projects
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'customerName'
    ) THEN
        -- Loop through all projects
        FOR project_record IN 
            SELECT DISTINCT 
                "customerName",
                COALESCE("address", '') as "address",
                COALESCE("contactNumbers", '') as "contactNumbers",
                COALESCE("consumerNumber", '') as "consumerNumber",
                COALESCE("leadSource", '') as "leadSource",
                COALESCE("leadBroughtBy", '') as "leadBroughtBy"
            FROM "projects"
            WHERE "customerName" IS NOT NULL
        LOOP
            -- Create a unique key for grouping customers
            customer_key := LOWER(project_record."customerName" || '_' || COALESCE(project_record."consumerNumber", 'no-consumer'));
            
            -- Check if we've already created this customer
            map_index := array_position(customer_map, customer_key);
            IF map_index IS NOT NULL THEN
                -- Find the customer ID we already created
                customer_db_id := customer_ids[map_index];
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
                customer_db_id := gen_random_uuid()::TEXT;
                
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
                    customer_db_id,
                    new_customer_id,
                    project_record."customerName",
                    NULLIF(project_record."address", ''),
                    NULLIF(project_record."contactNumbers", ''),
                    NULLIF(project_record."consumerNumber", ''),
                    NULLIF(project_record."leadSource", ''),
                    NULLIF(project_record."leadBroughtBy", ''),
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                );
                
                -- Store the mapping
                customer_map := array_append(customer_map, customer_key);
                customer_ids := array_append(customer_ids, customer_db_id);
            END IF;
            
            -- Update all projects with this customer data to point to the customer
            UPDATE "projects"
            SET "customerId" = customer_db_id
            WHERE "projects"."customerName" = project_record."customerName"
              AND COALESCE("projects"."consumerNumber", '') = COALESCE(project_record."consumerNumber", '')
              AND ("projects"."customerId" IS NULL OR "projects"."customerId" = '');
        END LOOP;
    END IF;
END $$;

-- Step 4: Make customerId required (only if all projects have customerId)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "projects" WHERE "customerId" IS NULL OR "customerId" = ''
    ) THEN
        ALTER TABLE "projects" ALTER COLUMN "customerId" SET NOT NULL;
        
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'projects_customerId_fkey'
        ) THEN
            ALTER TABLE "projects" 
            ADD CONSTRAINT "projects_customerId_fkey" 
            FOREIGN KEY ("customerId") 
            REFERENCES "customers"("id") 
            ON DELETE RESTRICT 
            ON UPDATE CASCADE;
        END IF;
    ELSE
        RAISE NOTICE 'Cannot make customerId required - some projects still have NULL customerId';
    END IF;
END $$;

-- Step 5: Remove old customer fields from projects (only if customerId is set and required)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_customerId_fkey'
    ) THEN
        -- Drop old columns if they exist
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'customerName'
        ) THEN
            ALTER TABLE "projects" DROP COLUMN "customerName";
        END IF;
        
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'address'
        ) THEN
            ALTER TABLE "projects" DROP COLUMN "address";
        END IF;
        
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'contactNumbers'
        ) THEN
            ALTER TABLE "projects" DROP COLUMN "contactNumbers";
        END IF;
        
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'consumerNumber'
        ) THEN
            ALTER TABLE "projects" DROP COLUMN "consumerNumber";
        END IF;
        
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'leadSource'
        ) THEN
            ALTER TABLE "projects" DROP COLUMN "leadSource";
        END IF;
        
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'leadBroughtBy'
        ) THEN
            ALTER TABLE "projects" DROP COLUMN "leadBroughtBy";
        END IF;
    END IF;
END $$;
