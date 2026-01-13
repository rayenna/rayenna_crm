# Kill all processes using port 3000
Write-Host "Finding processes using port 3000..." -ForegroundColor Yellow

$processes = netstat -ano | findstr :3000 | ForEach-Object {
    if ($_ -match 'LISTENING\s+(\d+)') {
        $matches[1]
    }
}

if ($processes) {
    $uniqueProcesses = $processes | Select-Object -Unique
    Write-Host "Found processes: $($uniqueProcesses -join ', ')" -ForegroundColor Yellow
    
    foreach ($procId in $uniqueProcesses) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "Killed process $procId" -ForegroundColor Green
        } catch {
            Write-Host "Could not kill process $procId : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No processes found on port 3000" -ForegroundColor Green
}

Write-Host "`nPort 3000 should now be free. You can run 'npm run dev' now." -ForegroundColor Cyan
