# Production Deploy: Audit & Security Module

**Goal:** Ship the Admin-only Audit & Security feature without affecting any existing behaviour, data, or routes.

---

## Nothing Existing Is Changed

| Area | Status |
|------|--------|
| **Database** | Only **new** tables: `security_audit_logs`, `access_logs`. No ALTER, no DROP, no changes to `users`, `projects`, `customers`, etc. |
| **API routes** | Only **new** path: `/api/admin/audit/*`. All existing routes (`/api/auth`, `/api/projects`, etc.) are unchanged. |
| **Business logic** | Unchanged. Login, user create, project create, etc. behave exactly as before. Audit calls are fire-and-forget and never awaited. |
| **Frontend** | New route `/audit-security` and one new nav item **“Audit & Security”** — visible **only to ADMIN**. No changes to Dashboard, Projects, Customers, or any other page. |
| **Sales / Operations / Management** | No new menus, no new APIs, no new behaviour. They do not see Audit & Security. |

---

## What Was Added (Additive Only)

- **Backend:** New tables (via migration), `auditLogger.ts`, `adminAudit.ts` route, and non-blocking `logAccess` / `logSecurityAudit` calls in auth, users, projects, support tickets, proposals. All logging is async and fail-safe.
- **Frontend:** New page “Audit & Security” and one ADMIN-only nav link.
- **Migration:** `20260127000000_add_security_audit_access_logs` — creates the two new tables and indexes only.

---

## Production Deploy Steps

### 1. Deploy the application (migration runs automatically)

Your backend build already runs migrations via `scripts/migrate-deploy-with-retry.js` (see `build:server` in package.json). When you push and the backend deploys (e.g. on Render), it will:

1. Run `npx prisma generate`
2. Run `resolve-failed-migration.js` (only touches known legacy migrations)
3. Run **`migrate-deploy-with-retry.js`** — runs `npx prisma migrate deploy` with retries (5 attempts, 8s between) to handle Neon advisory-lock timeouts
4. Run `tsc`

So **you do not need to run the prod migration manually**. Push and deploy as usual:

```bash
git add -A
git status   # Confirm only intended files
git commit -m "Add Admin Audit & Security module (additive only)"
git push origin main
```

The new migration `20260127000000_add_security_audit_access_logs` will be applied during that build. No existing tables are modified.

### 2. If you prefer migration in a separate phase (e.g. Render Release Command)

Some setups run migrations in a “Release” step before new instances take traffic. If your backend is on Render, you can set **Release Command** to:

```bash
npx prisma migrate deploy
```

Then your **Build Command** should not run migrations (otherwise they run twice). Current setup runs migration in the build; that is safe and leaves nothing to change unless you want migration in Release instead.

### 3. Verify after deploy

- [ ] **Existing users:** Login as Sales/Operations — no new menu, behaviour unchanged.
- [ ] **Existing flows:** Create/edit project, customer, support ticket — all work as before.
- [ ] **Admin:** Login as Admin → see **“Audit & Security”** in nav → open it → summary tiles and Activity timeline load (may be empty at first; do a login or create a project to see rows).
- [ ] **APIs:** `GET /api/admin/audit/security-summary?days=7` and `GET /api/admin/audit/logs` return 200 for an authenticated Admin (and 403 for non-Admin).

---

## Rollback (If Ever Needed)

- **App:** Revert the commit and redeploy. The new routes and nav item disappear; behaviour returns to the previous version. Audit logging calls simply stop running; they do not alter responses or data.
- **Database:** The new tables and their data remain but are unused. You can drop them later if desired:
  - `DROP TABLE IF EXISTS access_logs;`
  - `DROP TABLE IF EXISTS security_audit_logs;`
  Do not run this unless you deliberately want to remove audit history.

---

## Summary

- **Deploy:** Push and deploy the app as usual. The prod migration runs during the backend build (`migrate-deploy-with-retry.js`). No manual migration step is required.
- **Safety:** Additive-only — new tables, new routes, new page, ADMIN-only. No existing data or behaviour is changed in production.
