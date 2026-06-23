# How to Find Your Local Database URL

## Method 1: Check .env.example (Most Common)

The default format is usually:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/rayenna_crm?schema=public"
```

## Method 2: Check Your PostgreSQL Setup

### If you used default PostgreSQL installation:
- **Username**: `postgres` (usually)
- **Password**: The password you set during PostgreSQL installation
- **Host**: `localhost`
- **Port**: `5432` (default)
- **Database**: `rayenna_crm`

**Format:**
```
postgresql://postgres:YOUR_PASSWORD@localhost:5432/rayenna_crm?schema=public
```

### If you're not sure of your password:
1. Open pgAdmin
2. Right-click on your PostgreSQL server → Properties
3. Check the connection settings

Or try connecting with psql:
```powershell
psql -U postgres -d rayenna_crm
```

## Method 3: Check Your Application Logs

If your app was working locally before, check:
- Server logs when it starts
- May show connection string (masked)

## Method 4: Common Default Values

**Windows PostgreSQL (typical):**
- Username: `postgres`
- Password: (what you set during installation)
- Host: `localhost`
- Port: `5432`
- Database: `rayenna_crm`

**Example URLs:**
```
postgresql://postgres:postgres@localhost:5432/rayenna_crm?schema=public
postgresql://postgres:admin@localhost:5432/rayenna_crm?schema=public
postgresql://postgres:123456@localhost:5432/rayenna_crm?schema=public
```

## Method 5: Test Connection

You can test if a URL works:
```powershell
# Test with Prisma Studio (will show error if wrong)
# Temporarily set in .env, then:
npm run prisma:studio
```

## Quick Test

If you know your PostgreSQL password, try:
```powershell
node migrate-data-to-neon.js "postgresql://postgres:YOUR_PASSWORD@localhost:5432/rayenna_crm"
```

Replace `YOUR_PASSWORD` with your actual PostgreSQL password.
