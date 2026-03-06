# Production deploy – CRM + Proposal Engine

Short checklist and conventions for deploying Rayenna CRM and Proposal Engine to production (Render, Vercel, Neon).

---

## 1. Git: two-commit convention

This repo has **two products**. Never mix them in one commit.

| Product            | Stage only                                      | Commit prefix              |
|--------------------|--------------------------------------------------|----------------------------|
| **Proposal Engine**| `proposal-engine/` (e.g. `proposal-engine/frontend/`) | `feat(proposal-engine):`   |
| **CRM**            | `client/` `src/` `prisma/`                      | `feat(crm):` / `fix(crm):` |

- **Before every commit:** run `git diff --cached --name-only`.
  - Proposal Engine commit → every line must start with `proposal-engine/`.
  - CRM commit → no line must start with `proposal-engine/`.
- Never use `git add .` or `git add -A`. Stage by path only.

See `.cursor/rules/proposal-engine-isolation.mdc` for full rules.

---

## 2. Environment variables

### CRM frontend (Render + Vercel)

| Variable               | Required | Notes |
|------------------------|----------|--------|
| `VITE_API_BASE_URL`    | Yes      | Backend API base URL (e.g. `https://rayenna-crm.onrender.com`). Set in **Render** (blueprint or dashboard) and **Vercel** project env. |
| `VITE_PROPOSAL_ENGINE_URL` | Yes* | Production Proposal Engine URL, **no trailing slash**. Used for “Open in Proposal Engine” and deep link. Set in both Render and Vercel for the **CRM frontend**. |
| `VITE_SENTRY_DSN`      | No       | If unset, Sentry is not initialised. |

\* Required if you use the “Open in Proposal Engine” button and PE summary on project detail.

### Proposal Engine frontend (Render)

| Variable               | Required | Notes |
|------------------------|----------|--------|
| (API base)             | Yes      | Proposal Engine talks to the **CRM backend**. Ensure the frontend is built with the correct API base (e.g. via build-time env or `vite.config` / env file). If your PE frontend uses `VITE_API_BASE_URL`, set it in the **Proposal Engine** service on Render to the same CRM backend URL. |
| `NODE_OPTIONS`         | Recommended | e.g. `--max-old-space-size=2048` (already in `render.yaml` for PE). |

### Backend (Render Web Service)

| Variable       | Required | Notes |
|----------------|----------|--------|
| `DATABASE_URL` | Yes      | Neon (or other Postgres). Usually already set if the backend is already on Render. |
| `JWT_SECRET`   | Yes      | Must be set; server checks on startup. |

No need to change `DATABASE_URL` when moving to production if the same Neon DB is already used.

---

## 3. Database (Neon)

- **Same DB for dev and prod:** Schema must stay in sync. After pulling new code that adds Prisma migrations, run:
  - **Dev:** `npx prisma migrate dev` (or `db push` for quick sync).
  - **Prod:** run **`npx prisma migrate deploy`** as part of the **backend** build or start on Render so new migrations are applied on deploy.
- Do not commit `.env` or `.env.local`; they are in `.gitignore`.

---

## 4. CORS (backend)

In `src/server.ts`, allowed origins must include:

- Render frontend (e.g. `https://rayenna-crm-frontend.onrender.com`) and `render.com`.
- Vercel frontend: `*.vercel.app` (or your specific Vercel app URL).
- Proposal Engine frontend URL if it is on a different origin (e.g. `https://rayenna-proposal-engine.onrender.com`).

Add any new production frontend or PE URL here when you add a new deployment.

---

## 5. Build verification before deploy

From repo root:

```bash
# CRM frontend (Render + Vercel)
cd client && npm run build
# Expect: dist/ and dist/404.html

# Proposal Engine frontend (Render)
cd proposal-engine/frontend && npm run build
# Expect: dist/ and dist/404.html
```

Both must complete without errors. PE may show a chunk-size warning; that is non-blocking.

---

## 6. Render services (from `render.yaml`)

- **rayenna-crm-frontend** – CRM UI (`rootDir: client`, `staticPublishPath: dist`). Set `VITE_API_BASE_URL` and `VITE_PROPOSAL_ENGINE_URL`.
- **rayenna-proposal-engine** – Proposal Engine UI (`rootDir: proposal-engine/frontend`, `staticPublishPath: dist`). Set backend API URL if PE frontend uses it at build time; keep `NODE_OPTIONS` as in blueprint.
- **Backend** – Separate Web Service (see `DEPLOYMENT_GUIDE.md`). Set `DATABASE_URL`, `JWT_SECRET`; run `npx prisma migrate deploy` in build/start.

---

## 7. More detail

- **Dual frontend (Render + Vercel):** `VERCEL_PARALLEL_DEPLOYMENT_PLAN.md`
- **General production checklist:** `PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Backend and architecture:** `DEPLOYMENT_GUIDE.md`, `render.yaml`
