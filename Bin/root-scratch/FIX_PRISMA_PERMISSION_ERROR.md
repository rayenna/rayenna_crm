# Fix Prisma Permission Error (EPERM)

This error occurs when Prisma can't replace the query engine DLL file because it's locked or permission is denied.

## Quick Fix - Method 1 (Recommended)

1. **Close all running Node.js processes**
   ```powershell
   # Find and kill all node processes
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```

2. **Delete the .prisma folder**
   ```powershell
   Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force "node_modules\@prisma\client" -ErrorAction SilentlyContinue
   ```

3. **Regenerate Prisma client**
   ```powershell
   npm run prisma:generate
   ```

## Method 2: Run as Administrator

1. Close PowerShell/terminal
2. **Right-click PowerShell** → **Run as Administrator**
3. Navigate to project:
   ```powershell
   cd "D:\Cursor Projects\Rayenna CRM"
   ```
4. Run:
   ```powershell
   npm run prisma:generate
   ```

## Method 3: Delete and Reinstall

1. **Delete node_modules and reinstall**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   npm install
   npm run prisma:generate
   ```

## Method 4: Use npx directly

Sometimes using npx directly helps:
```powershell
npx prisma generate
```

## Method 5: Check for Locked Files

1. **Check if file is in use:**
   ```powershell
   Get-Process | Where-Object {$_.Path -like "*node_modules*"} | Stop-Process -Force
   ```

2. **Try again:**
   ```powershell
   npm run prisma:generate
   ```

## Method 6: Disable Antivirus Temporarily

Some antivirus software locks DLL files:
1. Temporarily disable Windows Defender or your antivirus
2. Run `npm run prisma:generate`
3. Re-enable antivirus

## Method 7: Manual Cleanup Script

Run this PowerShell script:
```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Remove Prisma folders
Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\@prisma" -ErrorAction SilentlyContinue

# Regenerate
npm run prisma:generate
```
