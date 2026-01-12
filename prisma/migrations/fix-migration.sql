-- Check if customers table exists and drop it if it's empty
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customers'
    ) THEN
        -- Check if table is empty
        IF NOT EXISTS (SELECT 1 FROM customers LIMIT 1) THEN
            DROP TABLE customers CASCADE;
            RAISE NOTICE 'Dropped empty customers table';
        ELSE
            RAISE NOTICE 'Customers table exists with data - cannot drop';
        END IF;
    END IF;
END $$;
