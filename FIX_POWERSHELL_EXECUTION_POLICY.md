# Fix PowerShell Execution Policy Issue

This error occurs because PowerShell blocks script execution by default. Here are solutions:

## Solution 1: Change Execution Policy (Recommended for Development)

**Open PowerShell as Administrator** (Right-click PowerShell → "Run as Administrator"), then run:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

When prompted, type `Y` and press Enter.

**What this does:**
- `RemoteSigned`: Allows local scripts to run, but downloaded scripts need to be signed
- `CurrentUser`: Only affects your user account (doesn't require admin, but safer with admin)

**Alternative (less secure, but works):**
```powershell
Set-ExecutionPolicy Bypass -Scope CurrentUser
```

Then close and reopen PowerShell, and try:
```powershell
npm --version
```

## Solution 2: Use Command Prompt (cmd) Instead

If you don't want to change PowerShell settings, use Command Prompt instead:

1. Press `Win + R`
2. Type `cmd` and press Enter
3. Navigate to your project:
   ```cmd
   cd "D:\Cursor Projects\Rayenna CRM"
   ```
4. Run npm commands:
   ```cmd
   npm --version
   npm install
   cd client
   npm install
   cd ..
   ```

## Solution 3: Bypass for Current Session Only

Run this in your current PowerShell session:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

This only affects the current PowerShell window. Close and reopen PowerShell will revert it.

## Solution 4: Use npm.cmd Instead

You can explicitly call the .cmd version:

```powershell
npm.cmd --version
npm.cmd install
```

However, this is tedious. Better to fix the execution policy.

## Recommended: Solution 1

For development work, I recommend **Solution 1** as it's a one-time fix and allows npm to work normally.

### Steps:
1. **Open PowerShell as Administrator**
   - Press `Win + X`
   - Click "Windows PowerShell (Admin)" or "Terminal (Admin)"
   
2. **Run the command:**
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   
3. **Type `Y` when prompted**

4. **Close and reopen PowerShell** (regular, not admin)

5. **Verify it works:**
   ```powershell
   npm --version
   ```

6. **Navigate to your project and continue setup:**
   ```powershell
   cd "D:\Cursor Projects\Rayenna CRM"
   npm install
   ```

## Verify Current Execution Policy

To check your current execution policy:
```powershell
Get-ExecutionPolicy -List
```

## Security Note

- `RemoteSigned` is safe for development - it allows locally created scripts
- `CurrentUser` scope only affects your account, not the entire system
- This is a common and necessary setting for Node.js development on Windows

## If You Still Have Issues

If Solution 1 doesn't work, try:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```
(This requires Administrator and affects all users - use with caution)

Or simply use **Command Prompt (cmd)** instead of PowerShell for npm commands.
