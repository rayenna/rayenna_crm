# Start Development Server Script
# This script kills any processes on port 3000 and then starts the dev server

Write-Host "`n=== Starting Development Server ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill processes on port 3000
Write-Host "Checking for processes on port 3000..." -ForegroundColor Yellow

$processes = netstat -ano | findstr :3000 | ForEach-Object {
    if ($_ -match 'LISTENING\s+(\d+)') {
        $matches[1]
    }
}

if ($processes) {
    $uniqueProcesses = $processes | Select-Object -Unique
    Write-Host "Found processes on port 3000: $($uniqueProcesses -join ', ')" -ForegroundColor Yellow
    
    foreach ($procId in $uniqueProcesses) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "✓ Killed process $procId" -ForegroundColor Green
        } catch {
            Write-Host "✗ Could not kill process $procId" -ForegroundColor Red
        }
    }
    
    Start-Sleep -Seconds 2
} else {
    Write-Host "✓ Port 3000 is free" -ForegroundColor Green
}

# Step 2: Kill any existing node processes (optional - comment out if you want to keep other node processes)
# Get-Process | Where-Object {$_.ProcessName -match "^node$|^ts-node$"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Step 3: Start the dev server
Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Cyan
Write-Host ""

npm run dev
