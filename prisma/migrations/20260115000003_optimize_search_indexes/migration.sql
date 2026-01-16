-- Optimize indexes for better search performance
-- Drop existing indexes if they exist and recreate with better options

-- Customer search indexes (using LOWER for case-insensitive search optimization)
DROP INDEX IF EXISTS idx_customers_customer_name_lower;
DROP INDEX IF EXISTS idx_customers_first_name_lower;
DROP INDEX IF EXISTS idx_customers_last_name_lower;

CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers("customerId");
CREATE INDEX IF NOT EXISTS idx_customers_consumer_number ON customers("consumerNumber");
CREATE INDEX IF NOT EXISTS idx_customers_first_name_lower ON customers(LOWER(COALESCE("firstName", '')));
CREATE INDEX IF NOT EXISTS idx_customers_last_name_lower ON customers(LOWER(COALESCE("lastName", '')));
CREATE INDEX IF NOT EXISTS idx_customers_customer_name_lower ON customers(LOWER(COALESCE("customerName", '')));

-- Project search indexes (already created, but ensure they exist)
CREATE INDEX IF NOT EXISTS idx_projects_salesperson_id ON projects("salespersonId");
CREATE INDEX IF NOT EXISTS idx_projects_project_status ON projects("projectStatus");
CREATE INDEX IF NOT EXISTS idx_projects_year ON projects("year");
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects("customerId");
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects("createdAt");
