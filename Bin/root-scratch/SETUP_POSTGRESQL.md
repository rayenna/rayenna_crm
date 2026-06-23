# Setting Up PostgreSQL Database

There are several ways to create the database for Rayenna CRM.

## Option 1: Using pgAdmin (GUI - Easiest)

pgAdmin is included with PostgreSQL installation.

1. **Open pgAdmin**
   - Search for "pgAdmin" in Windows Start Menu
   - Or find it in Start Menu → PostgreSQL folder

2. **Connect to PostgreSQL Server**
   - Enter the master password you set during PostgreSQL installation
   - You should see "PostgreSQL" server in the left panel

3. **Create Database**
   - Right-click on "Databases" in the left panel
   - Select "Create" → "Database..."
   - Enter database name: `rayenna_crm`
   - Click "Save"

That's it! The database is created.

## Option 2: Add PostgreSQL to PATH (for command line)

If you want to use `psql` from command line:

1. **Find PostgreSQL installation path**
   - Usually: `C:\Program Files\PostgreSQL\<version>\bin`
   - Or: `C:\Program Files (x86)\PostgreSQL\<version>\bin`

2. **Add to PATH**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\Program Files\PostgreSQL\<version>\bin`
     (Replace `<version>` with your PostgreSQL version, e.g., `15` or `16`)
   - Click OK on all dialogs
   - **Restart PowerShell**

3. **Verify**
   ```powershell
   psql --version
   ```

4. **Create database**
   ```powershell
   psql -U postgres
   ```
   Enter your password when prompted, then:
   ```sql
   CREATE DATABASE rayenna_crm;
   \q
   ```

## Option 3: Use Full Path to psql

If PostgreSQL is installed but not in PATH, use the full path:

```powershell
# Try common locations (adjust version number)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

Or:
```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
```

Then create database:
```sql
CREATE DATABASE rayenna_crm;
\q
```

## Option 4: Use SQL Shell (psql) from Start Menu

1. Search for "SQL Shell (psql)" in Windows Start Menu
2. Press Enter for each prompt (uses defaults):
   - Server: [localhost]
   - Database: [postgres]
   - Port: [5432]
   - Username: [postgres]
3. Enter your PostgreSQL password
4. Run:
   ```sql
   CREATE DATABASE rayenna_crm;
   \q
   ```

## Option 5: Check if PostgreSQL is Actually Installed

If you can't find pgAdmin or psql:

1. Check if PostgreSQL service is running:
   ```powershell
   Get-Service postgresql*
   ```

2. Search for PostgreSQL in Start Menu
   - Look for "pgAdmin" or "PostgreSQL" folder

3. If not installed, download from:
   - https://www.postgresql.org/download/windows/
   - Use the "Postgres.app" or "EnterpriseDB" installer

## Recommended: Use Option 1 (pgAdmin)

**The easiest way is using pgAdmin GUI:**

1. Open pgAdmin from Start Menu
2. Enter master password
3. Right-click "Databases" → Create → Database
4. Name: `rayenna_crm`
5. Save

No command line needed!

## Verify Database is Created

After creating the database using any method, verify it exists:

**In pgAdmin:**
- Expand "Databases" in left panel
- You should see `rayenna_crm` listed

**Using psql (if available):**
```powershell
psql -U postgres -l
```
Look for `rayenna_crm` in the list.

## After Database is Created

Continue with the setup:

1. Update `.env` file with your database credentials:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/rayenna_crm?schema=public"
   ```

2. Run Prisma commands:
   ```powershell
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

## Troubleshooting

### Can't connect to PostgreSQL
- Make sure PostgreSQL service is running:
  ```powershell
  Get-Service postgresql*
  ```
- If not running, start it from Services (services.msc)

### Forgot PostgreSQL password
- Reset it using pgAdmin (right-click server → Properties → Password)
- Or reset using Windows Services if needed

### Port 5432 already in use
- Check if another PostgreSQL instance is running
- Change port in PostgreSQL config (advanced)
