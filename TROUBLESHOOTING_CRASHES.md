# Troubleshooting Application Crashes

## All Compilation Errors Fixed ✅

All TypeScript errors have been resolved:
- ✅ Backend TypeScript compilation passes
- ✅ Frontend TypeScript compilation passes
- ✅ All unused imports removed
- ✅ All type errors fixed

## Common Causes of Crashes

### 1. Missing or Incorrect .env File

**Check if `.env` file exists:**
```powershell
Test-Path .env
```

**If missing, create it:**
```powershell
Copy-Item .env.example .env
```

**Required .env settings:**
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/rayenna_crm?schema=public"
JWT_SECRET=your-secret-key-change-this-in-production-12345
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

**⚠️ IMPORTANT:** Replace `YOUR_PASSWORD` with your actual PostgreSQL password!

### 2. Database Not Running

**Check if PostgreSQL service is running:**
```powershell
Get-Service postgresql*
```

**If not running, start it:**
```powershell
Start-Service postgresql-x64-XX  # Replace XX with your version
```

### 3. Database Not Created

**Check if database exists:**
- Open pgAdmin
- Look for `rayenna_crm` database
- If missing, create it (see SETUP_POSTGRESQL.md)

### 4. Prisma Not Set Up

**Run Prisma setup commands:**
```powershell
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5. Missing Dependencies

**Reinstall dependencies:**
```powershell
# Backend
npm install

# Frontend
cd client
npm install
cd ..
```

### 6. Port Already in Use

**Check what's using port 3000:**
```powershell
netstat -ano | findstr :3000
```

**Kill the process:**
```powershell
taskkill /PID <PID_NUMBER> /F
```

**Or change PORT in .env:**
```env
PORT=3001
```

## Step-by-Step Recovery

1. **Verify .env file exists and is configured correctly**
   ```powershell
   Get-Content .env
   ```
   Make sure `DATABASE_URL` has your correct PostgreSQL password.

2. **Check PostgreSQL is running**
   ```powershell
   Get-Service postgresql*
   ```

3. **Verify database exists**
   - Open pgAdmin and check for `rayenna_crm` database

4. **Run Prisma commands**
   ```powershell
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Clear node_modules and reinstall (if needed)**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Recurse -Force client\node_modules
   npm install
   cd client
   npm install
   cd ..
   ```

6. **Test compilation**
   ```powershell
   # Backend
   npx tsc --noEmit
   
   # Frontend
   cd client
   npm run build
   cd ..
   ```

7. **Start the application**
   ```powershell
   npm run dev
   ```

## Check Application Logs

When you run `npm run dev`, check the console output for:
- Database connection errors
- Port already in use errors
- Missing module errors
- TypeScript compilation errors

## Quick Fix Command

Run this sequence to reset everything:
```powershell
# Stop any running processes (Ctrl+C if npm run dev is running)

# Verify .env exists
if (-not (Test-Path .env)) {
    Write-Output "Creating .env file..."
    @"
DATABASE_URL="postgresql://postgres:password@localhost:5432/rayenna_crm?schema=public"
JWT_SECRET=your-secret-key-change-this-in-production-12345
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
"@ | Set-Content .env
    Write-Output "⚠️ Update DATABASE_URL with your PostgreSQL password in .env file!"
}

# Verify database exists (manual check in pgAdmin)

# Run setup
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Start application
npm run dev
```

## Still Crashing?

If the application still crashes after following these steps:

1. **Check the actual error message** in the terminal/console
2. **Share the error message** - the specific error will help identify the issue
3. **Check if it's a runtime error or compilation error**
4. **Verify all prerequisites are met** (Node.js, PostgreSQL, etc.)

## Status Check Command

Run this to verify everything is set up:
```powershell
Write-Output "Checking setup..."
Write-Output "Node.js: $(node --version)"
Write-Output "npm: $(npm --version)"
Write-Output ".env exists: $(Test-Path .env)"
Write-Output "Prisma client: $(Test-Path node_modules/@prisma/client)"
Write-Output "Database URL set: $((Get-Content .env 2>$null | Select-String 'DATABASE_URL').Count -gt 0)"
```
