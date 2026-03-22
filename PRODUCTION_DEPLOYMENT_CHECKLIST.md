# Production & Deployment Readiness Checklist

**Date:** 2026-02-23  
**Scope:** All changes from ErrorModal unification, validation modals, dashboard errors, focus handling, and responsive fixes.  
**Target:** Render free tier (frontend Static Site + backend Web Service).

---

## A. Recheck Summary – Errors, Bugs, Performance

### Fixes applied in this pass
1. **TypeScript**
   - Added missing `countdown?: number` to `ErrorModalProps` (was used in component and AuthContext but not declared).
   - Prefixed unused `anchor` with `_anchor` to satisfy TS6133.

2. **Production console usage**
   - Gated `console.error` / `console.log` with `import.meta.env.DEV` in:
     - `RemarksSection.tsx`, `Projects.tsx`, `TallyExport.tsx`, `SupportTicketsDashboard.tsx`, `ProposalPreview.tsx`.
   - Avoids console noise and minor overhead in production; ErrorBoundary and axios warn were already correct.

3. **Build**
   - `npm run build` (tsc + vite + copy-404) completes successfully.
   - No ESLint errors on modified files.

### Reviewed – no issues found
- **ErrorModal:** Focus and focus-trap clean up correctly (cancelAnimationFrame, clearTimeout, removeEventListener). No leaks.
- **AuthContext:** Inactivity timers (idle, warning, countdown) are cleared on logout and in effect cleanup.
- **Dashboard error UI:** Uses `getFriendlyApiErrorMessage`; no heavy work in render.
- **React Query:** 401/403 retry disabled in client defaultOptions; no retry storms.
- **Axios:** Single instance, 60s timeout, interceptors lightweight.

### Performance / slowdown notes
- **60s API timeout:** Intentional for Render free-tier cold starts (~15–50s). Does not slow normal requests; only affects how long a failing request waits before erroring.
- **ErrorModal 50ms delayed focus:** One-off per open; negligible.
- **Dashboard error boxes:** Simple conditional render; no extra queries or heavy computation.

---

## B. Production Readiness

| Item | Status |
|------|--------|
| Client build passes (tsc + vite) | ✅ |
| No ungated console in production paths | ✅ |
| Error boundaries (Sentry + fallback) | ✅ |
| User-facing errors are friendly (dashboard, login, modals) | ✅ |
| Auth: 401 clears session and redirects | ✅ |
| Sensitive data: no tokens in logs (Sentry scrub in place) | ✅ |
| Required env: `VITE_API_BASE_URL` (and optional `VITE_SENTRY_DSN`) | ✅ Documented |

---

## C. Render Deployment Readiness (Free Tier)

### Frontend (Static Site)
- **render.yaml:** `rootDir: client`, `buildCommand: npm install && npm run build`, `staticPublishPath: dist`. ✅
- **NODE_OPTIONS:** `--max-old-space-size=2048` set to reduce OOM risk during build. ✅
- **VITE_API_BASE_URL:** Set in blueprint to `https://rayenna-crm.onrender.com`. ✅
- **404:** `scripts/copy-404.cjs` runs after build for SPA fallback. ✅
- **Static assets:** Served from CDN; no server load after deploy. ✅

### Backend (Web Service – separate from this repo’s frontend)
- Slowness after ~15 min idle is from **backend** hibernation, not the frontend.
- Frontend handles it by: 60s timeout, friendly timeout/network messages, and “server may be waking up” copy.

### What could make the app feel slow or hang (and mitigations)
| Risk | Mitigation |
|------|------------|
| Backend cold start (15+ min idle) | 60s timeout; user message suggests retry; no indefinite hang. |
| Build OOM on Render | NODE_OPTIONS=--max-old-space-size=2048 in render.yaml. |
| Heavy re-renders | No issues found in modified code; React Query and modal logic are standard. |
| Blocking main thread | No synchronous heavy work in render paths; focus/trap run in rAF/setTimeout. |

---

## D. Git Push Readiness

- **Build:** ✅ `npm run build` succeeds.
- **TypeScript:** ✅ `tsc --noEmit` passes.
- **Lint:** ✅ No errors on changed files.
- **Production / deployment:** ✅ Checklist above satisfied.

**Recommendation:** Safe to push to Git for production and Render deployment. After your **OK**, the next step is to run the Git push (no push will be performed until you confirm).
