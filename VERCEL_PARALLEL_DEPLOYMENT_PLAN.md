# Vercel Parallel Deployment Plan – Zero Downtime, Dual Frontend

**Goal:** Deploy the existing frontend to Vercel in parallel with Render. No downtime, no breaking of production, backend, or sessions. Two live frontends for business continuity.

**Tech stack:** Frontend React (Vite), Backend Render (Node/Express), DB Neon PostgreSQL, Storage Cloudinary, Auth JWT.

---

## Render production safety (do not break)

**Render is production. This plan does not change or replace it.**

- **render.yaml:** Not modified. Render uses `rootDir: client`, `buildCommand: npm install && npm run build`, `staticPublishPath: dist`, and `VITE_API_BASE_URL` from the blueprint. No edits to `render.yaml` are required or recommended.
- **Backend CORS:** The only backend change is **additive** — allowing `*.vercel.app` in `isOriginAllowed()`. All Render origins remain allowed:
  - `https://rayenna-crm-frontend.onrender.com` is in the explicit `allowedOrigins` list.
  - Any origin whose URL contains `render.com` is allowed (covers all `*.onrender.com`).
- **Build:** The same `client/` build runs on both Render and Vercel. `client/vercel.json` is used only by Vercel; Render ignores it and uses `render.yaml` only.
- **Do not:** Change or remove Render services, alter `render.yaml`, remove Render origins from CORS, or point production DNS away from Render until you explicitly choose to. Vercel is additive only; Render stays the production system.

---

## Detailed Plan (Steps 1–12)

### STEP 1: Verify project structure
- **Build tool:** Vite ✅ (client/vite.config.ts, client/package.json).
- **Build command:** `o` ✅ (runs `tsc --noEmit && vite build && node scripts/copy-404.cjs`).
- **Output directory:** `dist` ✅ (Vite default; no custom `outDir` in vite.config).
- **Root for Vercel:** Either **Root Directory = `client`** (recommended) or deploy from repo root: a **root `vercel.json`** is present so that when Vercel builds from the repo root it only runs the client build (no server, no Prisma, no `DATABASE_URL`). Render is unaffected (Render uses `render.yaml` with `rootDir: client` for the frontend).

### STEP 2: Environment variables (frontend)
- **Required:** `VITE_API_BASE_URL` – backend API base (e.g. `https://rayenna-crm.onrender.com`). Used in `client/src/utils/axios.ts`; no fallback URL in code.
- **Optional:** `VITE_SENTRY_DSN` – Sentry DSN; if unset, Sentry is not initialised (`client/src/main.tsx`).
- **No hardcoded backend URLs** in `client/src`. All API usage goes through `axios` with `baseURL: import.meta.env.VITE_API_BASE_URL`.
- **Action:** In Vercel project settings, set `VITE_API_BASE_URL` to the same Render backend URL as on Render. Optionally set `VITE_SENTRY_DSN` if you use Sentry.

### STEP 3: Vercel config
- **Current:** `client/vercel.json` exists with SPA rewrites and cache headers.
- **Action:** Add explicit `buildCommand`, `outputDirectory`, and `framework` so behaviour is unambiguous when Root Directory = `client`. No removal of existing rewrites/headers.

### STEP 4: Clean build validation ✅
- Run `npm run build` from `client/`. Fix any errors or blocking warnings. Ensure `dist/` and `dist/404.html` (copy-404 script) are produced.
- **Verified:** Build completes; `dist/` and `dist/404.html` are produced.

### STEP 5: Deploy to Vercel (no domain switch)
- Import the Git repo in Vercel; set **Root Directory** to `client`.
- Add env vars: `VITE_API_BASE_URL` = Render backend URL (e.g. `https://rayenna-crm.onrender.com`). Optionally `VITE_SENTRY_DSN`.
- Do **not** remove Render deployment or change DNS. Both Render and Vercel URLs will stay live.

### STEP 6: Backend CORS
- **Current:** Backend (`src/server.ts`) allows specific origins and has a custom `isOriginAllowed()` that also allows `render.com` and `localhost`. One Vercel URL is listed; new Vercel deployments (e.g. `*-xxx.vercel.app`) may get a different host.
- **Action:** Allow any `*.vercel.app` origin in backend CORS (e.g. in `isOriginAllowed`) so any Vercel preview/production URL works without backend code change for each new URL. Render and existing behaviour unchanged.

### STEP 7: Test on Vercel URL
- Open `https://<your-vercel-app>.vercel.app` and test: login, dashboard, project filters, dynamic tiles, file uploads (Cloudinary), API calls (no CORS errors).

### STEP 8: Performance check
- Compare initial load and navigation (Render vs Vercel). API latency is unchanged (same backend). Optional: note Vercel edge vs Render static for caching.

### STEP 9: Safe parallel run
- Keep **Render** as production for current users; use **Vercel** for internal/testing. No DNS change until you are confident.

### STEP 10: Optional domain switch (later)
- When stable, point a custom domain (e.g. `app.rayenna.com`) to Vercel; keep Render as fallback. Not part of initial parallel deploy.

### STEP 11: Rollback
- If anything fails: do nothing. Render remains live; no rollback needed. Disable or delete Vercel project if desired.

### STEP 12: Final hardening
- No console errors in production paths; env vars consistent between Render and Vercel; no mixed content (all HTTPS); build is reproducible from `client/` with `npm run build`.

---

## Pros and cons of parallel deployment (Render + Vercel)

### Pros
- **Zero downtime:** Render stays as-is; no cutover.
- **Business continuity:** If one platform has an incident, the other can be used (with DNS or link change when you choose).
- **Testing:** Validate Vercel build and behaviour before any DNS/domain change.
- **Flexibility:** Option to use Vercel for previews/branch deploys later; Render remains production fallback.
- **Same backend:** Single backend (Render), same DB (Neon), same auth (JWT); no backend or DB changes.

### Cons
- **Two UIs to keep in sync:** Same repo, so one deploy (e.g. from `main`) can build on both; no extra process if you deploy from one branch to both.
- **Slight operational overhead:** Two dashboards (Render + Vercel) and two sets of env vars to keep aligned (especially `VITE_API_BASE_URL`).
- **No automatic failover:** Switching users to Vercel requires DNS or link change; not automatic.

### Risks and mitigations
| Risk | Mitigation |
|------|------------|
| CORS blocks Vercel | Allow `*.vercel.app` (and optionally exact URL) in backend CORS. |
| Wrong API URL on Vercel | Set `VITE_API_BASE_URL` in Vercel to Render backend; document in checklist. |
| Build differs (e.g. root dir) | Use Root Directory = `client` and same build command; validate `dist` locally. |
| JWT/session | JWT in memory/header; no cookie dependency. Same backend, so auth works from both frontends. |

---

## Summary

- **Render:** Unchanged; remains **production**. No config or code change required on Render for this plan. Do not modify `render.yaml` or remove Render from CORS.
- **Vercel:** New deployment from same repo, root = `client`, same env vars (at least `VITE_API_BASE_URL`), backend CORS updated to allow Vercel origins.
- **Backend:** One minimal CORS change only (allow `*.vercel.app`). No API or behaviour change.
- **Rollback:** None needed; Render stays live.

---

## OUTPUT: Pre-deployment verification

### 1. Detected environment variables (frontend)

| Variable | Required | Used in | Notes |
|----------|----------|---------|--------|
| `VITE_API_BASE_URL` | **Yes** | `utils/axios.ts` (baseURL), Login/Users UI copy | Backend API base, e.g. `https://rayenna-crm.onrender.com`. Must be set in Vercel. |
| `VITE_SENTRY_DSN` | No | `main.tsx` | Sentry DSN; if unset, Sentry is not initialised. |

All other `import.meta.env` usage is standard (e.g. `DEV`, `MODE`, `PROD`) and does not need to be set in Vercel.

### 2. Hardcoded URLs

- **Client (`client/src`):** **None.** All API access uses `import.meta.env.VITE_API_BASE_URL` via `axios`; no backend URL is hardcoded in the frontend.
- **Backend (`src/server.ts`):** CORS allowed-origins list includes specific Render and Vercel URLs; `isOriginAllowed()` now also allows any `*.vercel.app` so no hardcoded Vercel URL is required for new deployments.
- **Config:** `render.yaml` sets `VITE_API_BASE_URL` for the Render *frontend* build only; this is not used by Vercel (Vercel uses its own env vars).

No frontend code changes were required to remove hardcoded URLs.

### 3. Vercel compatibility

- **Build:** Vite; `npm run build` runs successfully from `client/`; output is `dist/` with `index.html` and `dist/404.html` (SPA fallback). **Compatible.**
- **Config:** `client/vercel.json` updated with explicit `buildCommand`, `outputDirectory`, `framework` and existing SPA rewrites/headers. **Compatible.**
- **Root directory:** Vercel project must use **Root Directory = `client`** so that `package.json`, `vite.config.ts`, and `vercel.json` are used. **Required.**
- **Env:** Only `VITE_*` are baked into the build at build time; set in Vercel project settings. **Compatible.**
- **Auth:** JWT in header/memory; no cookie dependency. Same backend; works from any origin allowed by CORS. **Compatible.**

### 4. Code changes made (minimal)

| File | Change |
|------|--------|
| `client/vercel.json` | Added `buildCommand`, `outputDirectory`, `framework`; kept existing rewrites and headers. |
| `src/server.ts` | In `isOriginAllowed()`, allow origins whose hostname ends with `.vercel.app` so any Vercel deployment is CORS-allowed. No change to API behaviour. |
| `client/src/vite-env.d.ts` | Declared optional `VITE_SENTRY_DSN` in `ImportMetaEnv` for type safety. |

No UI refactors, no business-logic changes, no new dependencies. Render deployment and backend behaviour (other than CORS allowlist) are unchanged.

### 5. Final checklist before deploying to Vercel

- [ ] **Vercel:** Import repo; set **Root Directory** to `client`.
- [ ] **Vercel env:** Set `VITE_API_BASE_URL` = `https://rayenna-crm.onrender.com` (or your live Render backend URL). Optionally set `VITE_SENTRY_DSN` if you use Sentry.
- [ ] **Backend:** Redeploy backend once (so CORS change allowing `*.vercel.app` is live). Render frontend is unaffected.
- [x] **Build (local):** `npm run build` from `client/` succeeds; `dist/` and `dist/404.html` produced. Trigger Vercel build after deploy; confirm it completes.
- [ ] **Test:** On `https://<your-app>.vercel.app`: login, dashboard, project filters, tiles, file uploads, API calls; no CORS errors.
- [ ] **Render:** Leave as-is; no DNS or domain change. Both Render and Vercel URLs remain valid.
- [ ] **Rollback:** If anything fails, do nothing; Render stays production. Optionally disable or remove Vercel project.
