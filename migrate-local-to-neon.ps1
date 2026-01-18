# Script to migrate data from local PostgreSQL to Neon
# Make sure PostgreSQL client tools (pg_dump, psql) are installed

param(
    [string]$LocalDbUrl = "postgresql://postgres:password@localhost:5432/rayenna_crm",
    [string]$NeonDbUrl = "postgresql://neondb_owner:npg_YBTlVfenu2k7@ep-twilight-water-a1ahtaf4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Local Database → Neon Migration Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if pg_dump is available
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDumpPath) {
    Write-Host "❌ ERROR: pg_dump not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools:" -ForegroundColor Yellow
    Write-Host "  - Download from: https://www.postgresql.org/download/" -ForegroundColor White
    Write-Host "  - Or use: winget install PostgreSQL.PostgreSQL" -ForegroundColor White
    exit 1
}

$backupFile = "local_db_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

Write-Host "Step 1: Exporting data from local database..." -ForegroundColor Green
Write-Host "Local DB: $LocalDbUrl" -ForegroundColor Gray
Write-Host ""

try {
    # Export schema and data (exclude _prisma_migrations table to avoid conflicts)
    pg_dump "$LocalDbUrl" --data-only --exclude-table=_prisma_migrations -F p -f $backupFile
    
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }
    
    $fileSize = (Get-Item $backupFile).Length / 1KB
    Write-Host "✅ Backup created: $backupFile ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Step 2: Importing data to Neon..." -ForegroundColor Green
    Write-Host "Neon DB: $NeonDbUrl" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  WARNING: This will add data to Neon. Existing data may conflict." -ForegroundColor Yellow
    Write-Host ""
    
    $confirm = Read-Host "Continue? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
    
    # Import to Neon
    psql "$NeonDbUrl" -f $backupFile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Some errors occurred during import (this may be normal if data conflicts)" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Data imported successfully!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Step 3: Cleaning up..." -ForegroundColor Green
    # Keep backup file for reference
    # Remove-Item $backupFile -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "✅ Migration completed!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backup file saved: $backupFile" -ForegroundColor Cyan
    Write-Host "You can delete it later if migration is successful." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify data in Neon dashboard" -ForegroundColor White
    Write-Host "2. Test the application" -ForegroundColor White
    Write-Host "3. Make sure Render DATABASE_URL points to Neon" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $backupFile) {
        Write-Host "Backup file created: $backupFile" -ForegroundColor Cyan
    }
    exit 1
}
