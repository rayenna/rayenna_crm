# Proposal Engine on Vercel – Backup Deployment

**Goal:** Deploy the Proposal Engine frontend to Vercel in parallel with Render. Same repo, same rules as CRM: one build, env via `VITE_*`, no platform-specific code. Render remains unchanged; this is additive only.

---

## Current state (unchanged)

| Platform | Proposal Engine |
|----------|-----------------|
| **Render** | `render.yaml` → `rayenna-proposal-engine` (rootDir: `proposal-engine/frontend`). Already live. |
| **Vercel** | Not yet deployed. Use this doc to add a **second** Vercel project. |

You already have **one** Vercel project for the **CRM** frontend (Root Directory = `client`). This adds a **second** Vercel project for the **Proposal Engine** (Root Directory = `proposal-engine/frontend`). Same repo; two separate Vercel projects.

---

## What does not change

- **Render:** `render.yaml` and the `rayenna-proposal-engine` service are **not** modified. Render stays as-is.
- **CRM on Vercel:** Existing Vercel project (Root = `client`) is **not** modified. Root `vercel.json` and `client/vercel.json` are **not** modified.
- **Backend:** CORS in `src/server.ts` already allows any `*.vercel.app` origin. No backend change needed for Proposal Engine on Vercel.
- **Proposal Engine code:** `proposal-engine/frontend/vercel.json` already exists with SPA rewrites and cache headers. No code change required.

---

## Steps to add Proposal Engine on Vercel

### 1. Create a new Vercel project (second project)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** → **Project**.
3. Import the **same** Git repo (e.g. `rayenna/rayenna_crm`).
4. **Important:** Set **Root Directory** to `proposal-engine/frontend` (not `client`).
   - Click **Edit** next to Root Directory and enter: `proposal-engine/frontend`.
5. Leave **Framework Preset** as Vite (or auto-detected). Vercel will use `proposal-engine/frontend/vercel.json`.
6. Do **not** override Build Command / Output Directory unless you have a reason; the existing `vercel.json` in that folder sets them.

### 2. Environment variables (Proposal Engine)

In the new Vercel project → **Settings** → **Environment Variables**, add:

| Variable | Value | Required |
|----------|--------|----------|
| `VITE_API_BASE_URL` | Your backend URL (e.g. `https://rayenna-crm.onrender.com`) | **Yes** |
| `VITE_SENTRY_DSN` | Your Sentry DSN for Proposal Engine (if you use Sentry) | No |

Use the **same** backend URL as Render’s Proposal Engine (and CRM) so both frontends talk to the same API.

### 3. Deploy

- Trigger a deploy (e.g. push to `main` or click **Redeploy** in Vercel).
- Build runs from `proposal-engine/frontend` (`npm run build` → `dist/` and `dist/404.html`).
- After deploy, the app will be at `https://<project-name>.vercel.app` (or your custom domain if you add one).

### 4. Verify

- Open the Vercel URL; you should see the Proposal Engine login.
- Log in (same backend as Render); use the app (Dashboard, Customers, Costing, BOM, ROI, Proposal).
- Check browser console and network: no CORS errors (backend already allows `*.vercel.app`).

---

## Same rules as CRM + Render

- **Single build:** `npm run build` from `proposal-engine/frontend` produces the same output for both Render and Vercel. No platform-specific build steps.
- **Env only via VITE_*:** No hardcoded API URLs. Set `VITE_API_BASE_URL` (and optionally `VITE_SENTRY_DSN`) in each platform’s dashboard.
- **No platform-specific code:** No branching on hostname or “vercel” vs “render” in Proposal Engine source.
- **CORS:** Backend already allows `*.vercel.app`; no change needed.

---

## Summary

| Item | Action |
|------|--------|
| Render (PE) | No change; stays live. |
| CRM (Vercel) | No change; existing project unchanged. |
| PE (Vercel) | New Vercel project, Root Directory = `proposal-engine/frontend`, env vars as above. |
| Backend | No change; CORS already allows Vercel. |
| Repo | No code changes required; `proposal-engine/frontend/vercel.json` already in place. |

After this, you will have Proposal Engine on **both** Render and Vercel for business continuity, without breaking anything currently running.
