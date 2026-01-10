# Quick Start Guide

## Prerequisites

- **Node.js** (v18+) and npm installed - Download from https://nodejs.org/
- **PostgreSQL** (v14+) installed and running
- See `INSTALL_NODEJS.md` if you need to install Node.js first

## Initial Setup (5 minutes)

1. **Install dependencies**
   
   **For Bash/Git Bash/Linux/Mac:**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```
   
   **For PowerShell (Windows):**
   ```powershell
   npm install
   cd client; npm install; cd ..
   ```
   
   Or run separately:
   ```powershell
   npm install
   cd client
   npm install
   cd ..
   ```

2. **Set up PostgreSQL database**
   - **Using pgAdmin (Recommended)**: Open pgAdmin → Right-click "Databases" → Create → Database → Name: `rayenna_crm`
   - **Using psql**: `psql -U postgres` then `CREATE DATABASE rayenna_crm;`
   - See `SETUP_POSTGRESQL.md` for detailed instructions if you get errors

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/rayenna_crm?schema=public"
   JWT_SECRET="your-secret-key-here"
   ```

4. **Initialize database**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

6. **Login**
   - Open http://localhost:5173
   - Login with:
     - **Admin**: admin@rayenna.com / admin123
     - **Sales**: sales@rayenna.com / sales123
     - **Operations**: operations@rayenna.com / ops123
     - **Finance**: finance@rayenna.com / finance123

## Default Users Created by Seed

| Email | Password | Role |
|-------|----------|------|
| admin@rayenna.com | admin123 | ADMIN |
| sales@rayenna.com | sales123 | SALES |
| operations@rayenna.com | ops123 | OPERATIONS |
| finance@rayenna.com | finance123 | FINANCE |

**⚠️ Change these passwords immediately in production!**

## First Steps

1. **Create a Project** (as Admin or Sales)
   - Go to Projects → New Project
   - Fill in customer details
   - Add system capacity and project cost
   - Save

2. **Update Project Status** (as Operations)
   - View the project
   - Edit and update execution milestones
   - Upload compliance documents

3. **Record Payments** (as Finance)
   - Edit the project
   - Update payment fields
   - System auto-calculates totals and status

4. **View Dashboards**
   - Each role sees a customized dashboard
   - Management sees aggregated metrics

5. **Export to Tally** (as Finance or Admin)
   - Go to Tally Export (add link in navigation)
   - Choose format: Excel, JSON, or XML
   - Download and import to Tally

## Common Tasks

### Adding a New User
1. Login as Admin
2. Go to Users
3. Click "New User"
4. Fill in details and assign role

### Uploading Documents
1. Open a project
2. Scroll to Documents section
3. Upload files (PDF, images, Excel, Word)
4. Categorize: proposal, agreement, kseb, mnre, invoice, payment_proof

### Exporting Financial Data
1. Login as Finance or Admin
2. Access Tally export endpoint
3. Filter by date range or status
4. Download in preferred format

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure database exists

### Port Already in Use
- Change PORT in .env
- Or kill process using port 3000/5173

### Migration Errors
- Drop and recreate database
- Run `npm run prisma:migrate` again

### File Upload Issues
- Check uploads/ directory exists
- Verify file size limits
- Check file type restrictions

## Next Steps

- Customize profit calculation formula in `src/utils/calculations.ts`
- Add email notifications for milestones
- Configure alerts for overdue payments
- Set up automated backups
- Deploy to production server
