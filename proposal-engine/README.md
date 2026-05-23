# Proposal Engine

Sales proposal workspace for Rayenna: **costing sheet**, **BOM**, **ROI**, **AI roof layout**, and **customer proposal** (HTML/DOCX/PDF), linked to CRM projects.

The UI lives in this folder; the **API and database are shared with Rayenna CRM** (not a separate SQLite server).

## Quick start (local)

### 1. CRM API (port 3000)

From the **repository root**:

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

Wait for `http://localhost:3000/health` to respond.

### 2. Proposal Engine UI (port 5174)

Second terminal:

```bash
cd proposal-engine/frontend
npm install
npm run dev
```

Open **http://localhost:5174** and log in (or use CRM SSO with a `?ticket=` link).

Do **not** run `proposal-engine/backend` for normal development—that stack is [deprecated](./backend/DEPRECATED.md).

## Structure

```text
proposal-engine/
├── frontend/          # React + Vite + Tailwind (production UI)
├── docs/
│   ├── ARCHITECTURE.md      # System design (start here)
│   ├── SMOKE_CHECKLIST.md   # Manual test checklist
│   └── ai-roof-layout-2d-roadmap.md
├── backend/           # DEPRECATED legacy SQLite API
└── shared/            # DEPRECATED unused types
```

CRM backend routes: `src/routes/proposalEngine.ts`, `src/routes/roofLayout.ts`.

## Ports (local)

| Service | Port | Command |
|---------|------|---------|
| CRM API | 3000 | `npm run dev` (repo root) |
| CRM UI | 5173 | same |
| Proposal Engine UI | 5174 | `npm run dev` in `proposal-engine/frontend` |

## Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Root `.env` | Neon (API only) |
| `GOOGLE_MAPS_API_KEY` | Root `.env` (CRM API) | **AI Roof Layout** satellite imagery (Google Static Maps) |
| `VITE_API_BASE_URL` | Render/Vercel PE project | Production API origin, e.g. `https://rayenna-crm.onrender.com` |
| `VITE_SENTRY_DSN` | Optional on PE | Frontend error reporting |

Leave `VITE_API_BASE_URL` **unset** locally so Vite proxies `/api` to port 3000.

**AI Roof Layout:** Map GPS is set in **Rayenna CRM → Customer Master**. Kerala sites with longitude west of **76°** get a warning in CRM and PE before generate. Use **Regenerate** for a new satellite draft; **Delete layout** clears saved layout and resets the page.

## Tests

```bash
cd proposal-engine/frontend
npm test
```

Watch mode (re-runs on file changes):

```bash
npm run test:watch
```

Run those commands **without** trailing comments on the same line — a pasted `# ...` can be passed to Vitest as a filter and show “No test files found”.

## Build & deploy

```bash
cd proposal-engine/frontend
npm run build
# → dist/ and dist/404.html
```

Deployed as static site **rayenna-proposal-engine** on Render (and optional Vercel).  
Redeploy PE when `proposal-engine/frontend/` changes; redeploy CRM **API** when `src/` or `prisma/` changes.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [PROPOSAL_ENGINE_VERCEL_DEPLOYMENT.md](../PROPOSAL_ENGINE_VERCEL_DEPLOYMENT.md).

## Git commits

Stage only `proposal-engine/` for PE work. Do not mix `client/` or `src/` in the same commit.  
Prefix: `feat(proposal-engine):`, `fix(proposal-engine):`, etc.

## See also

- [Modernization progress](./docs/MODERNIZATION_PROGRESS.md) (Phase 0–2a log; resume pointer)
- [Architecture](./docs/ARCHITECTURE.md)
- [API contract](./docs/API_CONTRACT.md)
- [Smoke checklist](./docs/SMOKE_CHECKLIST.md)
- [AI roof layout 2D roadmap](./docs/ai-roof-layout-2d-roadmap.md)
