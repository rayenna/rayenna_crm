# Script to migrate Neon database
# Make sure you've updated .env with your Neon DATABASE_URL before running this

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Neon Database Migration Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with your Neon DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Check DATABASE_URL
$envContent = Get-Content .env -Raw
if ($envContent -notmatch "DATABASE_URL") {
    Write-Host "ERROR: DATABASE_URL not found in .env file!" -ForegroundColor Red
    exit 1
}

# Extract DATABASE_URL to check if it's Neon
$dbUrl = ($envContent | Select-String 'DATABASE_URL="([^"]+)"').Matches.Groups[1].Value
if ($dbUrl -match "localhost|127\.0\.0\.1") {
    Write-Host "WARNING: DATABASE_URL points to localhost!" -ForegroundColor Yellow
    Write-Host "Current: $dbUrl" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please update .env with your Neon connection string:" -ForegroundColor Yellow
    Write-Host 'DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"' -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

Write-Host "Step 1: Generating Prisma Client..." -ForegroundColor Green
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Prisma generate failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Running migrations..." -ForegroundColor Green
npm run prisma:migrate:deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Seeding database with default users..." -ForegroundColor Green
npm run prisma:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Seeding failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ Migration and seeding completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Default users created:" -ForegroundColor Cyan
Write-Host "  - admin@rayenna.com / admin123" -ForegroundColor White
Write-Host "  - sales@rayenna.com / sales123" -ForegroundColor White
Write-Host "  - operations@rayenna.com / ops123" -ForegroundColor White
Write-Host "  - finance@rayenna.com / finance123" -ForegroundColor White
Write-Host ""
