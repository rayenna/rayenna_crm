# Installing Node.js on Windows

You need to install Node.js first, which includes npm (Node Package Manager).

## Method 1: Official Installer (Recommended)

1. **Download Node.js**
   - Go to https://nodejs.org/
   - Download the **LTS (Long Term Support)** version (recommended)
   - Choose the Windows Installer (.msi) for your system (64-bit is most common)

2. **Run the Installer**
   - Double-click the downloaded `.msi` file
   - Follow the installation wizard
   - **Important**: Make sure to check "Add to PATH" option (should be checked by default)
   - Click "Install" and wait for it to complete

3. **Verify Installation**
   - Close and reopen PowerShell (important to refresh PATH)
   - Run these commands to verify:
   ```powershell
   node --version
   npm --version
   ```
   - You should see version numbers (e.g., v20.x.x and 10.x.x)

## Method 2: Using Chocolatey (If you have Chocolatey installed)

If you have Chocolatey package manager installed:

```powershell
choco install nodejs-lts
```

Then close and reopen PowerShell.

## Method 3: Using winget (Windows 11/10 with winget)

```powershell
winget install OpenJS.NodeJS.LTS
```

Then close and reopen PowerShell.

## After Installation

1. **Restart PowerShell**
   - Close your current PowerShell window
   - Open a new PowerShell window
   - This is important to refresh the PATH environment variable

2. **Verify Node.js is working**
   ```powershell
   node --version
   npm --version
   ```

3. **Navigate to your project directory**
   ```powershell
   cd "D:\Cursor Projects\Rayenna CRM"
   ```

4. **Now run the installation commands**
   ```powershell
   npm install
   cd client
   npm install
   cd ..
   ```

## Troubleshooting

### If `node` or `npm` still not recognized after installation:

1. **Check if Node.js is installed**
   - Search for "Node.js" in Start Menu
   - If you can find it, it's installed but PATH might not be updated

2. **Manually add to PATH** (if needed):
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Add these paths (if they don't exist):
     ```
     C:\Program Files\nodejs\
     %APPDATA%\npm
     ```
   - Click OK on all dialogs
   - **Restart PowerShell**

3. **Check installation location**
   ```powershell
   # Check if Node.js is installed in Program Files
   Test-Path "C:\Program Files\nodejs\node.exe"
   Test-Path "C:\Program Files (x86)\nodejs\node.exe"
   ```

4. **Restart your computer** (sometimes required for PATH changes to take effect)

## Recommended Versions

- **Node.js**: v18.x.x or v20.x.x (LTS versions)
- **npm**: Comes with Node.js (usually 9.x.x or 10.x.x)

## Verify Everything Works

After successful installation, run these commands:

```powershell
node --version
npm --version
npm config get registry
```

You should see version numbers and npm registry URL without errors.

Then proceed with the project setup from `SETUP_WINDOWS.md` or `QUICKSTART.md`.
