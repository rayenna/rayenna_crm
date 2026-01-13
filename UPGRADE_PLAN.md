# Upgrade Plan - Rayenna CRM

**Date:** January 2025  
**Purpose:** Step-by-step upgrade plan for all major components

## Current Stack Summary

- **Node.js:** v24.12.0 (Current, non-LTS)
- **React:** 18.3.1 (Stable)
- **Prisma:** 5.22.0 (Stable, but 7.x available)
- **PostgreSQL:** 14+ (LTS until 2026)
- **TypeScript:** 5.9.3 (Current)

---

## Phase 1: Safe Minor/Patch Updates (Low Risk)

### Step 1.1: Update Backend Dependencies

```bash
# Navigate to project root
cd "D:\Cursor Projects\Rayenna CRM"

# Update all packages to latest within semver range
npm update

# Update specific safe packages
npm install dotenv@latest concurrently@latest --save
```

**Packages to update:**
- `dotenv`: 16.6.1 → 17.2.3 (minor update)
- `concurrently`: 8.2.2 → 9.2.1 (minor update)
- `@types/node`: 20.19.28 → 20.19.29 (patch update)

### Step 1.2: Update Frontend Dependencies

```bash
# Navigate to client directory
cd client

# Update all packages to latest within semver range
npm update

# Update specific safe packages
npm install react-hook-form@latest --save
```

**Packages to update:**
- `react-hook-form`: 7.70.0 → 7.71.0 (patch update)

### Step 1.3: Verify After Update

```bash
# Run TypeScript type checking
npm run build:server
cd client && npm run build

# Test the application
npm run dev
```

**Expected Result:** Application should work without changes

---

## Phase 2: Recommended Production Upgrades

### Step 2.1: Upgrade Node.js to LTS (Recommended for Production)

**Current:** Node.js v24.12.0  
**Target:** Node.js v20.x LTS (Active LTS until April 2026)

#### Option A: Using Node Version Manager (Recommended)

**For Windows (using nvm-windows):**

1. Install nvm-windows: https://github.com/coreybutler/nvm-windows/releases
2. Install Node.js v20 LTS:
   ```powershell
   nvm install 20.18.0
   nvm use 20.18.0
   ```
3. Verify:
   ```powershell
   node --version  # Should show v20.18.0
   npm --version
   ```

#### Option B: Direct Installation

1. Download Node.js v20 LTS from: https://nodejs.org/
2. Install the LTS version
3. Verify installation
4. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

**Testing:**
```bash
npm run dev
# Test all major features
```

---

### Step 2.2: Upgrade Prisma (5.x → 6.x → 7.x)

**Current:** Prisma 5.22.0  
**Target:** Prisma 6.x (intermediate) then 7.x (latest)

#### Step 2.2.1: Upgrade to Prisma 6.x First (Safer Path)

```bash
# 1. Backup your database
# (Important: Backup your PostgreSQL database before upgrading)

# 2. Update Prisma packages
npm install prisma@^6.0.0 @prisma/client@^6.0.0 --save-dev --save

# 3. Generate Prisma Client
npx prisma generate

# 4. Review and run migrations (if needed)
npx prisma migrate dev --name upgrade_to_prisma_6

# 5. Test the application
npm run dev
```

**Breaking Changes to Watch:**
- Review Prisma 6.x migration guide: https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-6
- Check for deprecated features in your codebase

#### Step 2.2.2: Upgrade to Prisma 7.x (After Testing 6.x)

```bash
# 1. Update Prisma packages
npm install prisma@^7.0.0 @prisma/client@^7.0.0 --save-dev --save

# 2. Generate Prisma Client
npx prisma generate

# 3. Review breaking changes
# Check: https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-7

# 4. Run migrations (if needed)
npx prisma migrate dev --name upgrade_to_prisma_7

# 5. Test thoroughly
npm run dev
```

**Important Notes:**
- Prisma 7.x has significant changes
- Test all database operations thoroughly
- Review query syntax changes
- Check for deprecated features

---

## Phase 3: Optional Major Upgrades (High Risk - Test Thoroughly)

### Step 3.1: Upgrade React (18.x → 19.x) - NOT RECOMMENDED YET

**Status:** React 19 is very new (released recently)  
**Recommendation:** Wait 3-6 months for ecosystem to stabilize

**If you decide to upgrade later:**

```bash
cd client

# Update React and related packages
npm install react@^19.0.0 react-dom@^19.0.0 @types/react@^19.0.0 @types/react-dom@^19.0.0 --save

# Update React Router (required for React 19)
npm install react-router-dom@^7.0.0 --save

# Test thoroughly
npm run build
npm run dev
```

**Breaking Changes:**
- Review React 19 migration guide: https://react.dev/blog/2024/04/25/react-19
- Test all components
- Update TypeScript types
- Check for deprecated APIs

---

### Step 3.2: Upgrade Vite (5.x → 7.x) - TEST FIRST

**Current:** Vite 5.4.21  
**Target:** Vite 7.3.1

```bash
cd client

# Update Vite and plugins
npm install vite@^7.0.0 @vitejs/plugin-react@^5.0.0 --save-dev

# Test build
npm run build
npm run dev
```

**Breaking Changes:**
- Review Vite 7 migration guide
- Update configuration if needed
- Test build process

---

### Step 3.3: Upgrade Tailwind CSS (3.x → 4.x) - NOT RECOMMENDED YET

**Status:** Tailwind CSS 4.x is a complete rewrite  
**Recommendation:** Wait for stable release and migration tools

**If upgrading in future:**
- Review Tailwind CSS 4 migration guide
- Expect significant configuration changes
- Test all styling thoroughly

---

## Phase 4: Backend Framework Upgrades

### Step 4.1: Upgrade Express (4.x → 5.x) - OPTIONAL

**Current:** Express 4.22.1  
**Status:** Express 4.x is still widely used and stable

**If upgrading:**

```bash
# Update Express
npm install express@^5.0.0 @types/express@^5.0.0 --save --save-dev

# Review breaking changes
# Check: https://expressjs.com/en/guide/migrating-5.html

# Test all routes
npm run dev
```

**Recommendation:** Stay on Express 4.x unless you need Express 5.x features

---

## Recommended Upgrade Priority

### High Priority (Do Now)
1. ✅ **Node.js → v20 LTS** (for production stability)
2. ✅ **Minor/patch updates** (safe, low risk)

### Medium Priority (Next 1-3 Months)
3. ⚠️ **Prisma 5.x → 6.x** (test thoroughly)
4. ⚠️ **Prisma 6.x → 7.x** (after 6.x is stable)

### Low Priority (Wait 6+ Months)
5. ⏸️ **React 18 → 19** (wait for ecosystem stabilization)
6. ⏸️ **Tailwind CSS 3 → 4** (wait for stable release)
7. ⏸️ **Vite 5 → 7** (test when needed)
8. ⏸️ **Express 4 → 5** (only if needed)

---

## Pre-Upgrade Checklist

Before starting any upgrades:

- [ ] **Backup database** (Critical!)
- [ ] **Commit all changes** to Git
- [ ] **Create a backup branch**: `git checkout -b backup-before-upgrade`
- [ ] **Test current application** thoroughly
- [ ] **Document current behavior** (screenshots, test cases)
- [ ] **Review changelogs** for breaking changes
- [ ] **Allocate time** for testing (2-4 hours per major upgrade)

---

## Post-Upgrade Testing Checklist

After each upgrade:

- [ ] **Application starts** without errors
- [ ] **All pages load** correctly
- [ ] **Database operations** work (CRUD)
- [ ] **Authentication/Authorization** works
- [ ] **File uploads** work
- [ ] **Dashboards** display correctly
- [ ] **Proposal generation** works (if OpenAI key is set)
- [ ] **Forms submit** correctly
- [ ] **No console errors** in browser
- [ ] **Build process** completes successfully

---

## Rollback Plan

If something goes wrong:

### Quick Rollback (Git)
```bash
# Revert to previous commit
git checkout backup-before-upgrade

# Or revert specific package.json changes
git checkout HEAD -- package.json package-lock.json
cd client
git checkout HEAD -- package.json package-lock.json

# Reinstall dependencies
npm install
cd client && npm install
```

### Database Rollback
```bash
# Restore database from backup
# Use your PostgreSQL backup tool to restore
```

---

## Safe Upgrade Command Sequence

### For Minor/Patch Updates (Safest)

```powershell
# 1. Backup and commit
git add .
git commit -m "Backup before package updates"

# 2. Update backend
npm update
npm install dotenv@latest concurrently@latest --save

# 3. Update frontend
cd client
npm update
npm install react-hook-form@latest --save
cd ..

# 4. Test
npm run dev

# 5. If successful, commit
git add .
git commit -m "Updated minor/patch versions"
```

---

## Notes

1. **Always test in development first** before production
2. **Major version upgrades** (x.0.0) often have breaking changes
3. **LTS versions** are recommended for production
4. **Don't upgrade everything at once** - do it incrementally
5. **Read migration guides** before major upgrades
6. **Keep backups** at every step

---

## Support Resources

- **Prisma Upgrade Guides:** https://www.prisma.io/docs/guides/upgrade-guides
- **React Migration Guide:** https://react.dev/blog/2024/04/25/react-19
- **Node.js Releases:** https://nodejs.org/en/about/releases/
- **PostgreSQL Releases:** https://www.postgresql.org/support/versioning/

---

## Recommended Immediate Actions

1. ✅ **Run safe updates** (Phase 1) - Do this now
2. ⚠️ **Consider Node.js LTS** (Phase 2.1) - For production
3. ⏸️ **Wait on React 19** - Too new, wait for stabilization
4. ⏸️ **Prisma upgrade** - Plan for later, test thoroughly

**Current stack is production-ready as-is!**
