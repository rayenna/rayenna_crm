# Production Readiness Assessment

**Scope:** Rayenna CRM + Proposal Engine (frontends + backend API)  
**Date:** March 2026  
**Based on:** Latest implementation (Sentry for PE, deep link, RBAC, PE backend routes, dual frontend).

---

## Executive summary

| Area | Verdict | Notes |
|------|--------|--------|
| **Build & deploy** | ✅ Ready | Both frontends build; Render/Vercel and env docs in place. |
| **Security** | ✅ Adequate | JWT auth, RBAC on PE routes, CORS and body limits configured. A few hardening items below. |
| **Observability** | ✅ Good | Sentry on backend (optional) and PE frontend (when DSN set); health checks. |
| **Stability** | ✅ Good | Error boundary, 401 handling, startup checks; sync is fire-and-forget. |
| **Code quality** | ⚠️ Minor | A few console usages and list limits; no blocking issues. |

**Overall:** **Production ready**, with recommended essential and optional improvements below.

---

## 1. Architecture (current state)

- **a. Rayenna CRM frontend** – Static site (Render + Vercel), `client/`, talks to backend API. Has own Sentry (unchanged).
- **b. Rayenna Proposal Engine frontend** – Static site (Render), `proposal-engine/frontend/`, talks to same backend; Sentry (rayennape-frontend) when `VITE_SENTRY_DSN` set.
- **c. Rayenna CRM backend** – Node/Express, Prisma, Neon; mounts `/api/proposal-engine/*`, auth, CORS, 10MB body limit for proposals.

PE frontend is the only code that uses the new Sentry project; CRM frontend and backend keep their existing Sentry setup.

---

## 2. What’s in good shape

- **Env and startup:** Backend validates `JWT_SECRET` and `DATABASE_URL` at startup; fails fast if missing.
- **Auth:** Login rate-limited; JWT in sessionStorage for PE; 401 clears token and redirects to login.
- **RBAC:** PE routes enforce view/edit by role (Sales own, Ops/Finance/Management read-only, Admin full). Frontend hides edit/delete for read-only roles.
- **CORS:** Backend allows Render CRM, Render PE, Vercel, and localhost; no wildcard `*`.
- **Payload size:** `express.json`/`urlencoded` set to 10MB to avoid 413 on large proposal HTML.
- **Health:** `/health` and `/api/health` respond before Prisma/routes load (Render 5s timeout).
- **Errors:** Global Express error handler; stack only in development. PE ErrorBoundary reports to Sentry and shows a safe fallback UI.
- **Sentry (PE):** Init only when `VITE_SENTRY_DSN` is set; tag `module: proposal-engine`; release `proposal-engine@1.0.0`; test helper in dev.
- **Docs:** `PRODUCTION_DEPLOY.md`, `SENTRY_RENDER.md`, `VERCEL_PARALLEL_DEPLOYMENT_PLAN.md` cover env, CORS, and two-commit convention.
- **Builds:** `client/` and `proposal-engine/frontend/` both build successfully (tsc + vite + 404 copy).

---

## 3. Gaps and risks (by severity)

### High impact (fix before or soon after production)

1. **Proposal Engine env on Render**  
   `render.yaml` does **not** set `VITE_API_BASE_URL` or `VITE_SENTRY_DSN` for the PE service. If they’re missing in the Render dashboard, the PE frontend will call relative `/api` (wrong in production) and Sentry won’t run.  
   **Action:** In Render → **rayenna-proposal-engine** → Environment, set:
   - `VITE_API_BASE_URL` = backend URL (e.g. `https://rayenna-crm.onrender.com`)
   - `VITE_SENTRY_DSN` = your rayennape-frontend DSN  
   Redeploy after adding/changing any `VITE_*`.

2. **Database migrations in production**  
   If backend deploy doesn’t run `npx prisma migrate deploy`, new PE tables/migrations might be missing in Neon.  
   **Action:** Add `npx prisma migrate deploy` to the backend build or start script on Render (or run once per release). Document in `PRODUCTION_DEPLOY.md` (already mentioned; ensure the team follows it).

### Medium impact (recommended)

3. **Console in production (PE frontend)**  
   - `apiClient.ts`: `console.error` on sync failures (costing, BOM, ROI, proposal) runs in production.  
   - `CostingSheet.tsx`: `console.log` for import debug.  
   **Action:** Gate with `import.meta.env.DEV` or send to Sentry (e.g. `Sentry.captureMessage` or `captureException`) in production and avoid logging PII.

4. **Backend PE route logging**  
   `proposalEngine.ts` uses `console.error` in catch blocks. In production this can clutter logs and, in theory, leak internal details.  
   **Action:** Prefer a structured logger and/or Sentry (`Sentry.captureException`) when `SENTRY_DSN` is set; avoid logging request bodies or user data.

5. **List limits (200)**  
   `GET /projects` and `GET /projects/eligible` use `take: 200`. Large tenants may not see all projects.  
   **Action:** Document as a known limit; later add pagination or a higher cap with performance testing.

### Low impact (optional)

6. **Sentry tracesSampleRate (PE)**  
   Currently `1.0` (100% of transactions). Can be costly at high traffic.  
   **Action:** Consider lowering to `0.1`–`0.2` in production once you’re happy with error capture.

7. **No rate limiting on PE API routes**  
   Auth and write endpoints (e.g. artifact PUT/DELETE) are not rate-limited beyond the generic auth middleware.  
   **Action:** Optional: add a rate limiter for `/api/proposal-engine/*` (e.g. per user or per IP) to reduce abuse risk.

8. **PE release version**  
   Release is hardcoded `proposal-engine@1.0.0`.  
   **Action:** Optional: derive from `package.json` version or build env (e.g. `proposal-engine@${version}`) for easier release matching in Sentry.

---

## 4. Essential improvements (checklist)

- [ ] **Render PE service:** Set `VITE_API_BASE_URL` and `VITE_SENTRY_DSN` in Environment; redeploy.
- [ ] **Backend deploy:** Ensure `npx prisma migrate deploy` runs on deploy (or once per release) so Neon schema is up to date.
- [ ] **PE frontend:** Gate or replace production `console.error`/`console.log` (apiClient sync failures, CostingSheet import) with DEV-only or Sentry.

---

## 5. Optional improvements

- [ ] **PE Sentry:** Lower `tracesSampleRate` to `0.1`–`0.2` in production.
- [ ] **PE release:** Set Sentry `release` from `package.json` or build env.
- [ ] **Backend PE routes:** Use Sentry for PE route errors when `SENTRY_DSN` is set; reduce or structure `console.error` in production.
- [ ] **Rate limiting:** Add optional rate limit for `/api/proposal-engine/*`.
- [ ] **Pagination:** Document 200-item limit; plan pagination for projects/eligible if needed.

---

## 6. Quick verification before go-live

1. **Env**
   - CRM frontend (Render/Vercel): `VITE_API_BASE_URL`, `VITE_PROPOSAL_ENGINE_URL`.
   - PE frontend (Render): `VITE_API_BASE_URL`, `VITE_SENTRY_DSN`.
   - Backend: `DATABASE_URL`, `JWT_SECRET`; optional `SENTRY_DSN`, `FRONTEND_URL`.

2. **CORS**  
   Backend `allowedOrigins` (and any dynamic rules) include production CRM, PE, and Vercel URLs.

3. **DB**  
   Run `npx prisma migrate deploy` against production Neon (or ensure it runs in backend deploy).

4. **Sentry**  
   In PE: trigger `__triggerSentryTestError()` in browser console and confirm event in rayennape-frontend.

5. **Builds**  
   `cd client && npm run build` and `cd proposal-engine/frontend && npm run build` both succeed.

---

## 7. File reference (recently touched)

| Area | Key files |
|------|-----------|
| PE Sentry | `proposal-engine/frontend/src/monitoring/sentry.ts`, `main.tsx`, `ErrorBoundary.tsx` |
| PE API | `proposal-engine/frontend/src/lib/apiClient.ts` |
| Backend PE | `src/routes/proposalEngine.ts`, `src/server.ts` |
| Auth | `src/routes/auth.ts`, `src/middleware/auth.ts` |
| Deploy/docs | `PRODUCTION_DEPLOY.md`, `proposal-engine/frontend/SENTRY_RENDER.md`, `render.yaml` |

---

**Conclusion:** The current implementation is **production ready** provided the essential items (PE env on Render, DB migrations, and gating PE console in production) are done. The optional items improve cost, operability, and long-term maintainability.
