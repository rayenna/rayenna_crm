# Windows Setup Guide (PowerShell)

This guide is specifically for Windows users using PowerShell.

## Prerequisites

Before starting, make sure you have:

0. **Fix PowerShell Execution Policy (if needed)**
   - If you see "running scripts is disabled" error, see `FIX_POWERSHELL_EXECUTION_POLICY.md`
   - Quick fix: Run PowerShell as Admin, then: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
   - Or use Command Prompt (cmd) instead of PowerShell

1. **Node.js and npm installed**
   - Download from https://nodejs.org/ (LTS version)
   - See `INSTALL_NODEJS.md` for detailed installation instructions
   - Verify installation:
     ```powershell
     node --version
     npm --version
     ```

2. **PostgreSQL installed and running**
   - Download from https://www.postgresql.org/download/windows/
   - Make sure PostgreSQL service is running
   - Note your database credentials (username, password)

3. **Git (optional, if cloning from repository)**
   - Download from https://git-scm.com/download/win

## Step 1: Install Dependencies

Open PowerShell in the project root directory and run:

```powershell
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

**Alternative (one command):**
```powershell
npm install; cd client; npm install; cd ..
```

## Step 2: Set Up Environment Variables

```powershell
# Copy the example .env file
Copy-Item .env.example .env
```

Then edit `.env` with a text editor and configure:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Any random string for JWT tokens
- `PORT`: Backend server port (default: 3000)

## Step 3: Set Up Database

Make sure PostgreSQL is installed and running. Then:

```powershell
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with default users
npm run prisma:seed
```

## Step 4: Start the Application

```powershell
# Start both backend and frontend servers
npm run dev
```

This will start:
- Backend on http://localhost:3000
- Frontend on http://localhost:5173

## Common PowerShell Commands

### Navigate directories
```powershell
cd client          # Enter client directory
cd ..              # Go back one level
cd \               # Go to root
```

### Run commands separately
If a command fails with `&&`, run them separately:
```powershell
npm run build:server
npm run build:client
```

### Check Node.js version
```powershell
node --version
npm --version
```

### Clear npm cache (if needed)
```powershell
npm cache clean --force
```

## Troubleshooting

### Port Already in Use
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Permission Errors
Run PowerShell as Administrator if you encounter permission issues.

### PostgreSQL Connection Issues
- Check if PostgreSQL service is running:
  ```powershell
  Get-Service postgresql*
  ```
- Verify connection string in `.env`
- Make sure PostgreSQL is accessible on localhost:5432

### Prisma Issues
If Prisma commands fail:
```powershell
# Reinstall Prisma
npm uninstall prisma @prisma/client
npm install prisma @prisma/client --save-dev
npm install @prisma/client
npm run prisma:generate
```

## Default Login Credentials

After seeding the database:

| Email | Password | Role |
|-------|----------|------|
| admin@rayenna.com | admin123 | ADMIN |
| sales@rayenna.com | sales123 | SALES |
| operations@rayenna.com | ops123 | OPERATIONS |
| finance@rayenna.com | finance123 | FINANCE |

**⚠️ Change these passwords in production!**
