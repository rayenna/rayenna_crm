# Setup GitHub Repository Script for Rayenna CRM

Write-Output "========================================"
Write-Output "Rayenna CRM - GitHub Repository Setup"
Write-Output "========================================"
Write-Output ""

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Output "❌ ERROR: Git is not installed!"
    Write-Output ""
    Write-Output "Please install Git from: https://git-scm.com/download/win"
    Write-Output "After installation, close and reopen PowerShell, then run this script again."
    exit 1
}

Write-Output "✅ Git is installed: $(git --version)"
Write-Output ""

# Change to project directory
$projectDir = "D:\Cursor Projects\Rayenna CRM"
if (-not (Test-Path $projectDir)) {
    Write-Output "❌ Project directory not found: $projectDir"
    exit 1
}

Set-Location $projectDir
Write-Output "📁 Working directory: $(Get-Location)"
Write-Output ""

# Check if already a git repository
if (Test-Path .git) {
    Write-Output "ℹ️  Git repository already initialized"
} else {
    Write-Output "📦 Initializing git repository..."
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Output "❌ Failed to initialize git repository"
        exit 1
    }
    Write-Output "✅ Git repository initialized"
}

Write-Output ""

# Verify .env is in .gitignore
$gitignoreContent = Get-Content .gitignore -Raw -ErrorAction SilentlyContinue
if ($gitignoreContent -notmatch "\.env") {
    Write-Output "⚠️  WARNING: .env not found in .gitignore"
    Write-Output "Adding .env to .gitignore..."
    Add-Content .gitignore "`n.env"
}

# Check for sensitive files
if (Test-Path .env) {
    Write-Output "✅ .env file found (will be ignored by git)"
} else {
    Write-Output "ℹ️  .env file not found (expected if not configured yet)"
}

Write-Output ""

# Add all files
Write-Output "📝 Adding files to git staging area..."
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Output "❌ Failed to add files"
    exit 1
}

# Check if there are changes to commit
Write-Output ""
Write-Output "Checking for changes to commit..."
$status = git status --porcelain
if ($status) {
    Write-Output "Found changes. Creating initial commit..."
    git commit -m "Initial commit: Rayenna CRM - Solar EPC Management System"
    if ($LASTEXITCODE -ne 0) {
        Write-Output "❌ Failed to create commit"
        exit 1
    }
    Write-Output "✅ Initial commit created"
} else {
    Write-Output "ℹ️  No changes to commit (everything is already committed)"
}

Write-Output ""

# Check if remote exists
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Output "✅ Remote repository configured: $remote"
    Write-Output ""
    $pushNow = Read-Host "Push to GitHub now? (y/n)"
    if ($pushNow -eq "y" -or $pushNow -eq "Y") {
        Write-Output "🚀 Pushing to GitHub..."
        git branch -M main
        git push -u origin main
        if ($LASTEXITCODE -eq 0) {
            Write-Output ""
            Write-Output "✅✅✅ SUCCESS! ✅✅✅"
            Write-Output "Repository pushed to GitHub successfully!"
            Write-Output "View it at: https://github.com/rayenna/rayenna_crm"
        } else {
            Write-Output ""
            Write-Output "❌ Push failed. Possible reasons:"
            Write-Output "1. Repository doesn't exist on GitHub - create it first at https://github.com/new"
            Write-Output "2. Authentication required - use Personal Access Token"
            Write-Output "3. Network issues"
        }
    }
} else {
    Write-Output "⚠️  REMOTE REPOSITORY NOT CONFIGURED"
    Write-Output ""
    Write-Output "Please follow these steps:"
    Write-Output "1. Go to https://github.com/new"
    Write-Output "2. Repository name: rayenna_crm"
    Write-Output "3. Description: Custom CRM + Project Operations system for Rayenna Energy"
    Write-Output "4. Choose Public or Private"
    Write-Output "5. DO NOT initialize with README, .gitignore, or license"
    Write-Output "6. Click 'Create repository'"
    Write-Output ""
    
    $repoUrl = Read-Host "Enter your repository URL (e.g., https://github.com/rayenna/rayenna_crm.git)"
    
    if ($repoUrl) {
        git remote add origin $repoUrl
        if ($LASTEXITCODE -eq 0) {
            Write-Output "✅ Remote repository added: $repoUrl"
            Write-Output ""
            $pushNow = Read-Host "Push to GitHub now? (y/n)"
            if ($pushNow -eq "y" -or $pushNow -eq "Y") {
                Write-Output "🚀 Pushing to GitHub..."
                git branch -M main
                git push -u origin main
                if ($LASTEXITCODE -eq 0) {
                    Write-Output ""
                    Write-Output "✅✅✅ SUCCESS! ✅✅✅"
                    Write-Output "Repository pushed to GitHub successfully!"
                    Write-Output "View it at: $repoUrl"
                } else {
                    Write-Output ""
                    Write-Output "❌ Push failed. You may need to authenticate."
                    Write-Output "Try using: gh auth login (if GitHub CLI is installed)"
                    Write-Output "Or use Personal Access Token as password"
                }
            }
        } else {
            Write-Output "❌ Failed to add remote repository"
        }
    } else {
        Write-Output "No URL provided. Run this script again after creating the repository on GitHub."
    }
}

Write-Output ""
Write-Output "Setup complete!"
Write-Output "For cloning instructions, see SETUP_GITHUB_REPOSITORY.md"
