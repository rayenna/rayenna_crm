# Quick Start: Upload to GitHub

## Prerequisites

**Install Git first:**
1. Download from: https://git-scm.com/download/win
2. Install with default settings
3. **Restart PowerShell** after installation
4. Verify: `git --version`

## Step-by-Step Instructions

### 1. Create Repository on GitHub

1. Go to: https://github.com/new
2. Repository name: `rayenna_crm`
3. Description: `Custom CRM + Project Operations system for Rayenna Energy - Solar EPC Management`
4. Choose **Public** or **Private**
5. **IMPORTANT:** DO NOT check "Initialize this repository with a README"
6. Click "Create repository"

### 2. Run Setup Script

After Git is installed, run:

```powershell
cd "D:\Cursor Projects\Rayenna CRM"
.\setup-github.ps1
```

The script will:
- ✅ Initialize git repository
- ✅ Add all files (excluding .env and node_modules)
- ✅ Create initial commit
- ✅ Ask for your GitHub repository URL
- ✅ Push everything to GitHub

### 3. Manual Setup (Alternative)

If the script doesn't work, run these commands manually:

```powershell
cd "D:\Cursor Projects\Rayenna CRM"

# Initialize git
git init

# Configure git (first time only)
git config --global user.name "rayenna"
git config --global user.email "your-email@example.com"

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Rayenna CRM - Solar EPC Management System"

# Add remote repository
git remote add origin https://github.com/rayenna/rayenna_crm.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**If you get authentication error:**
- GitHub will ask for username and password
- Username: `rayenna`
- Password: Use a **Personal Access Token** (not your GitHub password)
  - Go to: https://github.com/settings/tokens
  - Generate new token (classic)
  - Select `repo` scope
  - Use the token as password

## Cloning the Repository

After uploading, anyone can clone it with:

```powershell
git clone https://github.com/rayenna/rayenna_crm.git
cd rayenna_crm
```

Then follow `QUICKSTART.md` for setup instructions.

## Important Files

✅ **Will be uploaded:**
- All source code
- Documentation files
- Package.json files
- Configuration examples

❌ **Will NOT be uploaded (in .gitignore):**
- `.env` - Contains passwords
- `node_modules/` - Dependencies
- `uploads/` - User files
- Build outputs

## Verification

After pushing, visit:
**https://github.com/rayenna/rayenna_crm**

You should see all your project files there!
