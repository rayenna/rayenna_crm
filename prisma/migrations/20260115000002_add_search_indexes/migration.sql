-- Create indexes for search optimization
-- Customer search indexes (B-tree indexes work better for LIKE queries with ILIKE mode: 'insensitive')
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers("customerId");
CREATE INDEX IF NOT EXISTS idx_customers_consumer_number ON customers("consumerNumber");
CREATE INDEX IF NOT EXISTS idx_customers_first_name_lower ON customers(LOWER("firstName"));
CREATE INDEX IF NOT EXISTS idx_customers_last_name_lower ON customers(LOWER("lastName"));
CREATE INDEX IF NOT EXISTS idx_customers_customer_name_lower ON customers(LOWER("customerName"));

-- Project search indexes
CREATE INDEX IF NOT EXISTS idx_projects_salesperson_id ON projects("salespersonId");
CREATE INDEX IF NOT EXISTS idx_projects_project_status ON projects("projectStatus");
CREATE INDEX IF NOT EXISTS idx_projects_year ON projects("year");
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects("customerId");
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects("createdAt");
