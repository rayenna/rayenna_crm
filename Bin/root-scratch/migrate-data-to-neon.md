# Migrate Data from Local Database to Neon

This guide will help you migrate your local database data to Neon.

## Option 1: Using pg_dump (Recommended)

### Step 1: Backup Local Database

1. **Open PowerShell or Command Prompt**

2. **Export data from local database:**
   ```powershell
   # Set your local database URL (adjust as needed)
   $localDbUrl = "postgresql://postgres:password@localhost:5432/rayenna_crm"
   
   # Extract connection details
   # Format: postgresql://user:password@host:port/database
   # For pg_dump, use format: pg_dump "postgresql://user:password@host:port/database" > backup.sql
   
   pg_dump "postgresql://postgres:password@localhost:5432/rayenna_crm" -F p -f local_backup.sql
   ```

   Or using environment variable:
   ```powershell
   # Temporarily switch .env to local
   # Then:
   pg_dump $env:DATABASE_URL -F p -f local_backup.sql
   ```

### Step 2: Import to Neon

1. **Update .env to point to Neon:**
   ```bash
   DATABASE_URL="postgresql://neondb_owner:npg_YBTlVfenu2k7@ep-twilight-water-a1ahtaf4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
   ```

2. **Import data:**
   ```powershell
   # Use psql to import
   $neonUrl = "postgresql://neondb_owner:npg_YBTlVfenu2k7@ep-twilight-water-a1ahtaf4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   psql $neonUrl -f local_backup.sql
   ```

### Step 3: Verify Data

```powershell
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const u=await p.user.findMany();const c=await p.customer.findMany();const pr=await p.project.findMany();console.log('Users:',u.length,'Customers:',c.length,'Projects:',pr.length);await p.$disconnect();})();"
```

## Option 2: Using Prisma Studio (Manual Copy)

1. **Open local Prisma Studio:**
   ```bash
   # Set .env to local DB
   npm run prisma:studio
   ```

2. **Export data manually:**
   - Go to each table
   - Copy data to CSV/Excel

3. **Open Neon Prisma Studio:**
   ```bash
   # Set .env to Neon
   npm run prisma:studio
   ```

4. **Import data manually:**
   - Create records in Neon

## Option 3: Using Neon SQL Editor

1. Go to Neon Dashboard → Your Database → SQL Editor

2. Export from local using:
   ```sql
   -- For each table, copy data
   COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;
   ```

3. Import to Neon using:
   ```sql
   COPY users FROM STDIN WITH CSV HEADER;
   -- Paste data here
   ```

## Important Notes

⚠️ **Before migrating:**
- Backup Neon database first (in case something goes wrong)
- Make sure both databases have the same schema (they should, since we synced)
- Users table already has 4 users - you may need to skip that table or use INSERT ... ON CONFLICT

⚠️ **After migrating:**
- Verify all data is present
- Test login and functionality
- Update Render's DATABASE_URL if not already set

## Troubleshooting

**If pg_dump is not found:**
- Install PostgreSQL client tools
- Or use Prisma Studio for manual migration

**If import fails:**
- Check that schema matches
- Disable foreign key constraints temporarily
- Import tables in order (users → customers → projects → etc.)
