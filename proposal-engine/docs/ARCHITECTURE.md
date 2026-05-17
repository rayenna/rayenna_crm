# Proposal Engine — Architecture

**Last updated:** 2026-05-16

The Proposal Engine is a **separate product UI** in this monorepo. It ships as its own static frontend but uses the **same Rayenna CRM API and Neon database** as the main CRM—not a standalone SQLite backend.

---

## System diagram (production)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Proposal Engine UI (static)                                    │
│  proposal-engine/frontend  →  dist/                             │
│  Render: rayenna-proposal-engine  ·  Vercel: PE project         │
│  Port locally: 5174                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS  JWT (sessionStorage pe_jwt)
                             │ VITE_API_BASE_URL → CRM API origin
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Rayenna CRM API (Node + Express)                               │
│  repo root src/server.ts  ·  port 3000 locally                  │
│  Render: rayenna-crm.onrender.com (example)                     │
├─────────────────────────────────────────────────────────────────┤
│  /api/proposal-engine/*   artifacts, projects, share, templates │
│  /api/roof/*              AI layout, save layout, satellite     │
│  /api/auth/*              login, SSO ticket exchange              │
│  /api/projects/:id        CRM project (lat/lng, capacity)       │
│  /health                  backend wake / readiness                │
└────────────────────────────┬────────────────────────────────────┘
                             │ Prisma
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL (Neon) — shared with CRM                            │
│  pe_costing_sheets, pe_bom_sheets, pe_roi_results,              │
│  pe_proposals, project_roof_layouts, pe_shared_proposals, …     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repository layout

```text
proposal-engine/
├── frontend/              # Production UI — React + Vite + Tailwind (port 5174)
│   ├── src/
│   │   ├── pages/         # Customers, Costing, BOM, ROI, AIRoofLayout, ProposalPreview, …
│   │   ├── lib/           # apiClient.ts (barrel), api/*, customerStore.ts
│   │   └── components/
│   ├── vercel.json        # Vercel when Root Directory = proposal-engine/frontend
│   └── dist/              # Build output (not committed)
├── backend/               # ⚠️ DEPRECATED — see backend/DEPRECATED.md
├── shared/                # ⚠️ Unused legacy types — see shared/DEPRECATED.md
├── docs/                  # Architecture, roadmaps, smoke checklist
└── ROOF_LAYOUT_MODULE_PLAN.md   # Historical plan — superseded by docs/ai-roof-layout-2d-roadmap.md
```

**CRM-owned backend code** (not under `proposal-engine/`):

| Area | Path |
|------|------|
| PE REST API | `src/routes/proposalEngine.ts` → mounted at `/api/proposal-engine` |
| Roof layout API | `src/routes/roofLayout.ts` → mounted at `/api/roof` |
| Layout job | `src/workers/layoutGenerationWorker.ts` |
| Geometry types (server) | `src/types/roofLayoutGeometry.ts` |
| Prisma schema | `prisma/schema.prisma` |

---

## Isolation (git & deploy)

| Concern | CRM | Proposal Engine |
|---------|-----|-----------------|
| Frontend source | `client/` | `proposal-engine/frontend/` |
| API implementation | `src/` | Uses CRM `src/` (no separate PE server in prod) |
| Database | Neon PostgreSQL | **Same** Neon DB |
| Prisma schema | `prisma/schema.prisma` | Same file |
| Local API port | 3000 | Proxied via Vite (no PE backend) |
| Local UI port | 5173 | 5174 |
| Render static service | `rayenna-crm-frontend` | `rayenna-proposal-engine` |
| Env for API URL | `VITE_API_BASE_URL` | `VITE_API_BASE_URL` (same backend URL) |

**Git rule:** PE commits only touch `proposal-engine/`. CRM/API commits touch `src/`, `prisma/`, `client/`—never mix in one commit. See `.cursor/rules/proposal-engine-isolation.mdc`.

**Dual frontend rule:** PE build must work on both Render and Vercel (`proposal-engine/frontend/vercel.json`). No hostname branching in source.

---

## Running locally

### 1. CRM API (required)

From repo root (uses root `.env` and Neon `DATABASE_URL`):

```bash
npm install
cd client && npm install && cd ..
npm run dev
# → API http://localhost:3000
# → CRM UI http://localhost:5173 (optional)
```

### 2. Proposal Engine UI

Second terminal:

```bash
cd proposal-engine/frontend
npm install
npm run dev
# → http://localhost:5174
```

Vite proxies `/api` and `/health` to `http://localhost:3000` (`proposal-engine/frontend/vite.config.ts`).

**Do not** set `VITE_API_BASE_URL` for local dev unless you intentionally bypass the proxy.

**Do not** run `proposal-engine/backend` for normal PE work—that stack is deprecated.

### 3. Login

- Email/password against CRM auth, or  
- Open PE from CRM with SSO: `?ticket=…` (one-time exchange to `pe_jwt` in `sessionStorage`).

---

## Authentication & session

| Item | Detail |
|------|--------|
| Token storage | `sessionStorage` keys: `pe_jwt`, `pe_user_id`, `pe_user_role`, `pe_user_name` |
| API calls | `Authorization: Bearer <token>` via `apiClient.ts` |
| Access control | Enforced in `src/routes/proposalEngine.ts` (sales = assigned project/customer; Ops/Mgmt/Finance/Admin broader read; edit rules per role) |
| Shared proposals | `GET /api/proposal-engine/share/:token` — no auth; optional password |

---

## Data model (Neon / Prisma)

Artifacts are keyed by **CRM `projectId`** (`CustomerRecord.master.crmProjectId` in the UI).

| Table | Purpose |
|-------|---------|
| `pe_costing_sheets` | Costing sheet snapshot per project |
| `pe_bom_sheets` | BOM rows per project |
| `pe_roi_results` | ROI inputs/result per project |
| `pe_proposals` | Generated proposal HTML/view, custom sections, ref number |
| `project_roof_layouts` | Roof metrics, layout image URLs, `geometryJson` (2D editor state) |
| `pe_costing_templates` | User/org costing templates |
| `pe_selected_projects` | Per-user “opened in PE” tracking |
| `pe_removed_projects` | Admin hide-from-list |
| `pe_shared_proposals` | Password-protected share links |

CRM **Customer** / **Project** master data (name, site, `systemCapacity`, lat/lng) lives in core CRM tables; PE reads via `/api/proposal-engine/projects` and `/api/projects/:id`.

---

## API surface (used by PE frontend)

Base path: `{API_ORIGIN}/api/proposal-engine` unless noted.

### Projects & artifacts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List projects for PE (filters, pagination) |
| GET | `/projects/stats` | Dashboard stats |
| GET | `/projects/eligible` | CRM projects user can add to PE |
| POST | `/projects/:id/select` | Mark project selected for user |
| GET | `/projects/:id` | Project + all artifacts (primary hydrate) |
| GET/PUT | `/projects/:id/costing` | Costing artifact |
| GET/PUT | `/projects/:id/bom` | BOM artifact |
| GET/PUT | `/projects/:id/roi` | ROI artifact |
| GET/PUT | `/projects/:id/proposal` | Proposal artifact |
| DELETE | `/projects/:id/proposal` | Clear proposal artifact only |
| DELETE | `/projects/:id` | Remove project from PE (admin/sales rules) |

### Templates, share, admin

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/DELETE | `/costing-templates` … | Costing templates |
| POST | `/share` | Create share link |
| GET | `/share/:token` | Public viewer HTML |
| POST | `/admin/clear`, `/admin/unhide-all` | Admin list hygiene |
| GET | `/admin/limits-stats` | Admin metrics |

### Roof layout (`/api/roof`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai-layout` | Generate satellite + metrics + seed polygon |
| POST | `/save-layout-image` | Save Konva export + optional `geometry` |
| POST | `/save-3d-layout-image` | Save 3D PNG |
| POST | `/set-layout-embed-preference` | 2D vs 3D in proposal |
| GET | `/manual-layout/:projectId` | Load saved layout + geometry |

Static layout files: `/api/generated_layouts/{projectId}_satellite.png`, `_ai_layout.png`, etc. (or Cloudinary URLs when configured).

---

## Frontend data layer

### Authoritative (server)

On **Save** / **sync**, artifacts are written to Neon via `apiClient.ts` (`syncProjectCosting`, `syncProjectBom`, `syncProjectRoi`, `syncProjectProposal`). Opening a project uses `fetchProjectWithArtifacts` + `mapApiArtifactsToRecord` + `applyProposalEngineProjectDetail` so **another device** sees the same data after login.

Roof layout geometry: `project_roof_layouts.geometryJson` (see cross-device rule in `.cursor/rules/pe-crm-cross-device-users.mdc`).

### Local only (browser)

| Storage | Keys (pattern) | Purpose |
|---------|----------------|---------|
| `localStorage` | `rayenna_customers_v1_{userId}` | Cached customer list / UI state |
| `localStorage` | `rayenna_active_customer_v1_{userId}` | Which project is “active” in PE |
| `localStorage` | `rayenna_pe_hidden_projects_v1_{userId}` | User-hidden rows in PE list |
| `localStorage` | `rayenna_*_v1_{userId}` WIP keys | In-progress drafts on Costing/BOM/ROI/Proposal pages before explicit save |

WIP keys are cleared when switching projects (`switchActiveCustomer`). **Unsaved WIP does not sync across devices**—by design.

Details: `proposal-engine/frontend/src/lib/customerStore.ts`.

---

## Main UI routes

| Path | Page |
|------|------|
| `/`, `/customers` | Project/customer list (CRM-linked) |
| `/customers/:id` | Workspace hub |
| `/costing` | Costing sheet |
| `/bom` | BOM |
| `/roi` | ROI calculator |
| `/ai-layout` | AI roof layout (2D/3D) |
| `/proposal` | Proposal preview & export |
| `/view/:token` | Shared proposal (public) |
| `/login` | PE login |

Heavy routes are lazy-loaded in `App.tsx`.

---

## Deployment

| Service | Render blueprint | Build |
|---------|------------------|--------|
| PE frontend | `rayenna-proposal-engine` (`rootDir: proposal-engine/frontend`) | `npm run build` → `dist/` |
| CRM API | Separate Web Service (not in `render.yaml` static section) | `npm run build:server` includes `prisma migrate deploy` |
| CRM frontend | `rayenna-crm-frontend` | Only when `client/` changes |

See `PROPOSAL_ENGINE_VERCEL_DEPLOYMENT.md` and `VERCEL_PARALLEL_DEPLOYMENT_PLAN.md` for Vercel parity.

**After API deploy:** migrations apply automatically on build. **After PE frontend deploy:** hard refresh; service worker may cache—see `client` PWA notes for analogous behaviour.

---

## Testing

Pure logic unit tests (Vitest, no browser):

```bash
cd proposal-engine/frontend
npm test
```

Coverage today: `parseGoogleMapsLink`, `roofLayoutGeometry`, `deriveProposalStatusFromArtifacts` / `normalizeProposalStatus`, `mapApiArtifactsToRecord`.  
Run before refactors to large pages (`ProposalPreview`, `CostingSheet`). Manual flows: [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md).

---

## Related documentation

| Doc | Purpose |
|-----|---------|
| [MODERNIZATION_PROGRESS.md](./MODERNIZATION_PROGRESS.md) | **Resume here** — Phase 0–2a done; 2b+ planned |
| [API_CONTRACT.md](./API_CONTRACT.md) | Request/response shapes PE frontend relies on |
| [ai-roof-layout-2d-roadmap.md](./ai-roof-layout-2d-roadmap.md) | **Active** product/engineering roadmap for 2D roof layout |
| [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) | Manual regression checklist before/after releases |
| [../README.md](../README.md) | Quick start |
| [../backend/DEPRECATED.md](../backend/DEPRECATED.md) | Legacy standalone backend |
| `docs/pe-image-storage-migration-plan.md` (repo root) | PE custom-section images / TOAST monitoring |

---

## Feature status (high level)

| Feature | Status |
|---------|--------|
| CRM project picker & artifact sync | Shipped |
| Costing, BOM, ROI, Proposal generation | Shipped |
| DOCX/PDF export, custom HTML sections | Shipped |
| Password-protected share links | Shipped |
| AI roof layout (2D Konva + optional 3D) | Shipped — iterating per 2D roadmap |
| Legacy `proposal-engine/backend` (SQLite) | **Deprecated** — not used in production |
