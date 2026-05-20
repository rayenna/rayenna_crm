# Proposal Engine — modernization progress

**Purpose:** Resume structural improvement work without re-discovering context.  
**Last updated:** 2026-05-20  
**Status:** **Phase 3a** complete — server sync confirmation banner wired into Dashboard + CustomerWorkspace. Structural modernisation (2a–3a) is complete. Next work is **Phase 4** (AI Roof Layout P1 product features) when ready.

---

## Goal

Improve maintainability and documentation **without changing product behaviour**. The app remains production-ready throughout.

Reference plan (original assessment): architecture review in team chat, May 2026.

---

## Completed

### Phase 0 — Documentation truth (no runtime changes)

| Item | Location |
|------|----------|
| Rewritten system architecture (CRM API + Neon, not SQLite :5001) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Updated quick start (root `npm run dev` + PE on 5174) | [../README.md](../README.md) |
| API request/response notes for PE frontend | [API_CONTRACT.md](./API_CONTRACT.md) |
| Manual regression checklist | [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) |
| Legacy `backend/` marked deprecated | [../backend/DEPRECATED.md](../backend/DEPRECATED.md) |
| Unused `shared/` marked deprecated | [../shared/DEPRECATED.md](../shared/DEPRECATED.md) |
| `customerStore.ts` header: server = truth, localStorage = WIP | `frontend/src/lib/customerStore.ts` |
| Roof layout old plan superseded | [../ROOF_LAYOUT_MODULE_PLAN.md](../ROOF_LAYOUT_MODULE_PLAN.md) → [ai-roof-layout-2d-roadmap.md](./ai-roof-layout-2d-roadmap.md) |

### Phase 1 — Safety net

| Item | Notes |
|------|--------|
| **Vitest** in `proposal-engine/frontend` | `npm test`, `npm run test:watch` |
| Unit tests (23+) | `parseGoogleMapsLink`, `roofLayoutGeometry`, status helpers, `mapApiArtifactsToRecord`, `proposalAssembly`, `costing/format` |
| `tsconfig` excludes `*.test.ts` from app build | Production `tsc` unchanged |

### Phase 2a — Split `apiClient.ts`

| Module | Path |
|--------|------|
| Core fetch | `frontend/src/lib/api/core.ts` |
| Session / JWT | `frontend/src/lib/api/session.ts` |
| Login | `frontend/src/lib/api/auth.ts` |
| Roof layout API | `frontend/src/lib/api/roofLayout.ts` |
| PE projects, sync, share, templates | `frontend/src/lib/api/proposalEngine.ts` |
| Project detail + artifact mapping | `frontend/src/lib/api/projectDetail.ts` |
| **Barrel (unchanged imports)** | `frontend/src/lib/apiClient.ts` |

All pages still `import from '../lib/apiClient'`.

### Phase 2b — Split `ProposalPreview.tsx`

| Module | Path | Role |
|--------|------|------|
| Types | `frontend/src/proposal/types.ts` | `ProposalData`, ROI, DOCX overrides |
| Format | `frontend/src/proposal/format.ts` | `fmtINR`, `fmtINRFull` |
| Assembly | `frontend/src/proposal/proposalAssembly.ts` | `buildProposal`, `collectProposalAssembly`, `genRef`, WIP read |
| Copy / constants | `frontend/src/proposal/proposalCopy.ts` | Section text, lists, disclaimers |
| PDF export | `frontend/src/proposal/exportPdf.ts` | `exportToPdf` |
| DOCX export | `frontend/src/proposal/exportDocx.ts` | `buildDocx` (~1.2k lines) |
| Editable HTML | `frontend/src/proposal/proposalEditableHtml.ts` | Text override extract/merge |
| Document blocks | `frontend/src/proposal/ProposalDocumentBlocks.tsx` | Section React components, `exportToDocx`, `CustomerForm` |
| Share modal | `frontend/src/proposal/ProposalShareModal.tsx` | Mobile-first bottom sheet |
| **Page shell** | `frontend/src/pages/ProposalPreview.tsx` | ~1.1k lines — state, handlers, layout |

Tests: `proposal/proposalAssembly.test.ts`. Route unchanged: lazy `ProposalPreview` in `App.tsx`.

### Phase 2c — Split `CostingSheet.tsx`

| Module | Path | Role |
|--------|------|------|
| Types | `frontend/src/costing/types.ts` | `FormValues`, `CostingTemplate`, `ImportRow` |
| Format | `frontend/src/costing/format.ts` | `toNum`, `fmt`, `cellStr` |
| Built-in templates | `frontend/src/costing/builtInTemplates.ts` | `EMPTY_ROW`, six production templates |
| WIP sheets storage | `frontend/src/costing/costingStorage.ts` | `loadSheets`, `persistSheets` |
| Export | `frontend/src/costing/exportCosting.ts` | XLSX + CSV export |
| Import | `frontend/src/costing/costingImport.ts` | Excel parse, blank template download |
| Modals / panels | `frontend/src/costing/CostingModals.tsx` | Save sheet/template, saved sheets, templates, import preview |
| Table UI | `frontend/src/costing/CostingTable.tsx` | `CostRow`, grouped table, grand total, category breakdown |
| **Page shell** | `frontend/src/pages/CostingSheet.tsx` | ~850 lines — form state, save/sync, layout |

Tests added: `costing/format.test.ts`. Route unchanged: lazy `CostingSheet` in `App.tsx`. Shared domain logic remains in `lib/costingConstants.ts` (Vite Fast Refresh).

### Phase 2d — Split `Customers.tsx`

| Module | Path | Role |
|--------|------|------|
| Types + constants | `frontend/src/customers/types.ts` | `ProjectOption`, `PROJECTS_PAGE_SIZE`, `PROJECT_LIST_SORT_OPTIONS` |
| Helpers | `frontend/src/customers/customerHelpers.ts` | derive/map/build functions, role constants, `canCreateOrEditProposals` |
| Badges | `frontend/src/customers/CustomerBadges.tsx` | `ProposalReadinessBadge`, `ArtifactDots` |
| Project card | `frontend/src/customers/ProjectCard.tsx` | API-driven project card (Ops / Mgmt / Finance / Admin) |
| Project picker | `frontend/src/customers/ProjectPickerModal.tsx` | CRM project selector modal with sort/filter/pagination |
| Conflict modal | `frontend/src/customers/ProjectConflictModal.tsx` | Overwrite vs Append prompt for duplicate CRM projects |
| Customer card | `frontend/src/customers/CustomerCard.tsx` | Local `CustomerRecord` card with artifact dots + delete confirm |
| New customer | `frontend/src/customers/NewCustomerModal.tsx` | Standalone manual-add modal (reserved; not currently wired) |
| **Page shell** | `frontend/src/pages/Customers.tsx` | ~480 lines — state, handlers, deep-link logic, list layout |

Route unchanged: lazy `Customers` in `App.tsx`. `NewCustomerModal` still re-exported from page shell for backwards compatibility.

---

## Not started (planned)

| Phase | Scope |
|-------|--------|
| ~~**2b**~~ | ~~Split `ProposalPreview.tsx`~~ — done |
| ~~**2c**~~ | ~~Split `CostingSheet.tsx`~~ — done |
| ~~**2d**~~ | ~~Split `Customers.tsx`~~ — done |
| ~~**2e**~~ | ~~Bundle measurement~~ — done (`chunkSizeWarningLimit: 600`; dynamic import deferred — low payoff vs risk) |
| ~~**3a**~~ | ~~WIP vs server sync banner~~ — done (`ServerSyncBanner` on Dashboard; `markServerSynced` in Dashboard + CustomerWorkspace) |
| **3b** | Central save pipeline (deferred — higher effort, lower urgency than Phase 4) |
| **4** | Product — AI Roof Layout P1: multi-facet, smarter fill, measurements (see [ai-roof-layout-2d-roadmap.md](./ai-roof-layout-2d-roadmap.md)) |
| **4 quick wins** | Anytime: centralise `METERS_PER_PIXEL` + panel size; always save full geometry JSON; keyboard shortcuts (`Esc` pan, `E` edit, `Ctrl+Z`/`Y` undo) |

---

## How to verify after any PE change

```bash
cd proposal-engine/frontend
npm test
npm run build
```

Staging: [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md). Costing smoke: save sheet, templates, import Excel, export XLSX/CSV, BOM autofill.

---

## Deploy impact (PE modernization batches)

| Render service | Redeploy? | Why |
|----------------|-----------|-----|
| **rayenna-proposal-engine** (static) | **Yes** | Changes under `proposal-engine/frontend/` |
| **CRM API** (Web Service) | **No** | Unless `src/` / `prisma/` changed in same batch |
| **rayenna-crm-frontend** | **No** | Unless `client/` changed |

Vercel PE project: redeploy if used (same as Render PE).

---

## Git

PE-only commits under `proposal-engine/`. Do not mix with CRM paths in one commit.

When resuming in Cursor: *“Continue PE modernization from `proposal-engine/docs/MODERNIZATION_PROGRESS.md`, start Phase 4.”*

---

## User Guide (May 2026)

**Help → Quick Start** and **AI Roof Layout** sections in `frontend/src/pages/HelpPage.tsx` document guided stepper, Maps override, keepouts, undo/redo, Save to Proposal vs Regenerate, cross-device geometry, 2D/3D tabs, and FAQ entries.
