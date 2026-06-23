# Setting Up GitHub Repository

## Step 1: Install Git

If Git is not installed on your system:

1. **Download Git for Windows**
   - Go to: https://git-scm.com/download/win
   - Download the latest version
   - Run the installer
   - Use default settings (recommended)
   - **Important**: Make sure "Git from the command line and also from 3rd-party software" is selected

2. **Verify Installation**
   - Close and reopen PowerShell
   - Run: `git --version`
   - You should see a version number (e.g., `git version 2.x.x`)

3. **Configure Git (First Time Only)**
   ```powershell
   git config --global user.name "rayenna"
   git config --global user.email "your-email@example.com"
   ```

## Step 2: Create GitHub Repository

### Option A: Using GitHub Website (Recommended)

1. **Go to GitHub**
   - Open browser and go to: https://github.com
   - Login with your account (username: `rayenna`)

2. **Create New Repository**
   - Click the "+" icon in top right → "New repository"
   - Repository name: `rayenna_crm`
   - Description: "Custom CRM + Project Operations system for Rayenna Energy - Solar EPC Management"
   - Visibility: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click "Create repository"

3. **Copy the Repository URL**
   - After creating, GitHub will show you commands
   - Copy the repository URL (e.g., `https://github.com/rayenna/rayenna_crm.git`)

### Option B: Using GitHub CLI (if installed)

```powershell
gh auth login
gh repo create rayenna_crm --public --description "Custom CRM + Project Operations system for Rayenna Energy"
```

## Step 3: Initialize Local Git Repository

Open PowerShell in your project directory and run:

```powershell
cd "D:\Cursor Projects\Rayenna CRM"

# Initialize git repository
git init

# Add all files (except those in .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Rayenna CRM - Solar EPC Management System"

# Add remote repository (replace with your actual GitHub username if different)
git remote add origin https://github.com/rayenna/rayenna_crm.git

# Set main branch (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Verify Upload

1. **Check GitHub Repository**
   - Go to: https://github.com/rayenna/rayenna_crm
   - Verify all files are uploaded

2. **Verify .env is NOT uploaded**
   - The `.env` file should NOT appear in the repository
   - Only `.env.example` should be visible (if we create it)

## Step 5: Clone Repository (For Future Use)

To clone this repository on another machine:

```powershell
git clone https://github.com/rayenna/rayenna_crm.git
cd rayenna_crm
```

Then follow the setup instructions in `QUICKSTART.md`

## Troubleshooting

### Authentication Issues

If you get authentication errors when pushing:

**Option 1: Use Personal Access Token**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use token as password when pushing

**Option 2: Use GitHub CLI**
```powershell
gh auth login
```

**Option 3: Use SSH (Advanced)**
- Set up SSH keys and use SSH URL: `git@github.com:rayenna/rayenna_crm.git`

### Push Rejected

If push is rejected:
```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Large Files

If you get errors about large files:
- Make sure `node_modules/` and `uploads/` are in `.gitignore`
- They should not be committed

## Important Notes

⚠️ **Never commit these files:**
- `.env` - Contains sensitive database passwords
- `node_modules/` - Dependencies (too large)
- `uploads/` - User uploaded files
- Any files with passwords or API keys

✅ **Always commit:**
- Source code files
- Configuration examples (`.env.example`)
- Documentation files
- Package.json files

## Quick Setup Script

Save this as `setup-github.ps1` and run it:

```powershell
# Setup GitHub Repository Script

Write-Output "Setting up GitHub repository..."

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Output "ERROR: Git is not installed!"
    Write-Output "Please install Git from: https://git-scm.com/download/win"
    exit 1
}

# Check if already a git repository
if (Test-Path .git) {
    Write-Output "Git repository already initialized"
} else {
    Write-Output "Initializing git repository..."
    git init
}

# Add all files
Write-Output "Adding files to git..."
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Output "Creating initial commit..."
    git commit -m "Initial commit: Rayenna CRM - Solar EPC Management System"
} else {
    Write-Output "No changes to commit"
}

# Check if remote exists
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Output "Remote already configured: $remote"
} else {
    Write-Output ""
    Write-Output "⚠️  REMOTE NOT CONFIGURED"
    Write-Output "Please create the repository on GitHub first:"
    Write-Output "1. Go to https://github.com/new"
    Write-Output "2. Repository name: rayenna_crm"
    Write-Output "3. Do NOT initialize with README"
    Write-Output "4. Copy the repository URL"
    Write-Output ""
    $repoUrl = Read-Host "Enter repository URL (e.g., https://github.com/rayenna/rayenna_crm.git)"
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Output "Remote added: $repoUrl"
    }
}

# Push to GitHub
Write-Output ""
$push = Read-Host "Push to GitHub? (y/n)"
if ($push -eq "y" -or $push -eq "Y") {
    git branch -M main
    git push -u origin main
    Write-Output "✅ Repository pushed to GitHub!"
} else {
    Write-Output "Run 'git push -u origin main' when ready"
}
```
