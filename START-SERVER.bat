@echo off
echo.
echo ===== Starting Development Server =====
echo.

REM Kill processes on port 3000
echo Checking for processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo Starting server...
echo.
npm run dev
