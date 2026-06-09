# Proposal Engine — modernization progress

**Purpose:** Resume structural improvement work without re-discovering context.  
**Last updated:** 2026-06-09  
**Status:** **Phase 3b complete.** Next: product backlog or optional pipeline follow-ups.

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
| Unit tests (127) | Geometry, facets, `customerHelpers`, pipeline save/load, `resolveModuleDimensions`, costing/format, proposal assembly, etc. |
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

### Phase 4 Track B — Split `AIRoofLayout.tsx` (maintainability, no behaviour change)

| Slice | Extracted | Page size (approx.) |
|-------|-----------|---------------------|
| **1** | `RoofLayoutKonvaStage`, `lib/roofLayout/*` (types, page utils, capture, panel packing, customer sync) | ~2,526 lines |
| **2** | `generateRoofLayoutDraft`, `hydrateManualRoofLayout`, `roofLayoutGeometrySave`, `roofLayoutSaveExport`; `RoofLayoutPageHeader`, `RoofLayoutActiveCustomerBanner`, `RoofLayoutOverridePanel`, `RoofLayoutExportActions` | ~1,997 lines |
| **2b** (Jun 2026) | `RoofLayoutPreviewToolbar` — preview chrome only (2D/3D + undo); export moved to xl sidebar / md–lg stacked row | `AIRoofLayout.tsx` ~2.1k lines |

| **3** (May 2026) | `useRoofLayoutEditorState`, `useRoofLayoutScrollViewport`, `useRoofLayout3DTab`, `useRoofLayoutViewport`, `RoofLayout3DPreviewShell`, `RoofLayoutMobileMapTools`, `roofLayout3dExport` | ~1,695 lines |

### Phase 3b — Central save pipeline (in progress)

| Slice | Module | Notes |
|-------|--------|--------|
| **3b-1** (Jun 2026) | `lib/projectSavePipeline.ts`, `lib/projectLoadPipeline.ts` | `saveProjectArtifacts`, `loadProjectFromServer`, injectable deps, 19 unit tests |
| **3b-2** (Jun 2026) | `pages/CostingSheet.tsx` | Save sheet → `saveProjectArtifacts({ costing, bom })` |
| **3b-3** (Jun 2026) | `pages/BOMSheet.tsx`, `pages/ROICalculator.tsx` | BOM/ROI save + AlertCard on sync failure |
| **3b-4** (Jun 2026) | `pages/ProposalPreview.tsx` | Save → sync `proposal` only; Generate → sync all patched artifacts |
| **3b-5** (Jun 2026) | `lib/projectSaveRoofLayout.ts`, `pages/AIRoofLayout.tsx` | `saveRoofLayoutViaPipeline` — server capture + customer merge |
| **3b-6** (Jun 2026) | All save pages + `Dashboard.tsx`, `ServerSyncBanner.tsx` | `PIPELINE_MARK_SYNCED`; banner after save without reopen |
| **3b-7** (Jun 2026) | `Dashboard.tsx`, `CustomerWorkspace.tsx`, `Customers.tsx` | Hydrate via `loadProjectFromServer` (+ `preloadedDetail` for deep link) |

**Phase 3b complete** (Jun 2026).

---

## Not started (planned)

| Phase | Scope |
|-------|--------|
| ~~**2b**~~ | ~~Split `ProposalPreview.tsx`~~ — done |
| ~~**2c**~~ | ~~Split `CostingSheet.tsx`~~ — done |
| ~~**2d**~~ | ~~Split `Customers.tsx`~~ — done |
| ~~**2e**~~ | ~~Bundle measurement~~ — done (`chunkSizeWarningLimit: 600`; dynamic import deferred — low payoff vs risk) |
| ~~**3a**~~ | ~~WIP vs server sync banner~~ — done (`ServerSyncBanner` on Dashboard; `markServerSynced` in Dashboard + CustomerWorkspace) |
| **3b** | Central save pipeline — **complete** (3b-1…3b-7) | [PHASE_3B_SAVE_PIPELINE.md](./PHASE_3B_SAVE_PIPELINE.md) |
| ~~**4**~~ | ~~AI Roof Layout product (P0–P2 + Option A/C polish)~~ — **done** Jun 2026 (see roadmap session log) |
| ~~**4 quick wins**~~ | ~~Centralise `METERS_PER_PIXEL`~~ — done Jun 2026 (`src/constants/roofLayoutScale.ts` + `roofLayoutConstants.ts` + parity tests) |

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
| **CRM API** (Web Service) | **No** | Unless `src/` / `prisma/` changed in same batch (e.g. `roofLayoutScale.ts` Jun 2026 → redeploy API) |
| **rayenna-crm-frontend** | **No** | Unless `client/` changed |

Vercel PE project: redeploy if used (same as Render PE).

---

## Related plans

| Doc | Use |
|-----|-----|
| [PHASE_3B_SAVE_PIPELINE.md](./PHASE_3B_SAVE_PIPELINE.md) | Central save/sync pipeline (next) |
| [ai-roof-layout-2d-roadmap.md](./ai-roof-layout-2d-roadmap.md) | 2D roof layout product log (P0–P2 complete) |
| [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) | Manual regression |

---

## Git

PE-only commits under `proposal-engine/`. Do not mix with CRM paths in one commit.

When resuming in Cursor: *“Phase 3b save pipeline is complete — see `PHASE_3B_SAVE_PIPELINE.md` for architecture; next work is product backlog or CRM tasks.”*

---

## AI Roof Layout — product log (Jun 2026)

| Commit | Summary |
|--------|---------|
| `33a3344` | Save sync: workflow stepper + status badge follow `lastSavedProjectId` |
| `e34d67a` | **Saved — unsaved changes** via `roofLayoutGeometryFingerprint` |
| `5163656` | Edge setback (0–0.6 m), mobile scroll margin, **Center** map button |
| `40c6e4e` | Preview toolbar redesign; export in xl sidebar; mobile UX/accessibility |
| `a1bdec8` / `4174f6a` | `METERS_PER_PIXEL` + seed polygon constants (CRM authoritative, PE parity tests) |
| *(May 2026)* | **P2 SKU dimensions:** `resolveModuleDimensions`; panel pack + save geometry + status strip |
| *(May 2026)* | **P2 yield hints:** `estimateRoofLayoutYield` — effective kW + orientation loss badge |
| `90fd4fe` | **Option A:** 3D SKU parity (`portraitModuleSizeM`), site plan PDF metrics table, single-facet azimuth |
| `339bfa1` | HelpPage: SKU, yield, India hints, site plan PDF docs |
| `3567529` | CRM API: `roofLayoutSummary` on projects list (panel count + placed kW) |
| `3000ddb` | **Option C:** satellite contrast slider; stricter `copy-404.cjs`; Customers card layout line; Render no-cache headers |

Prod smoke verified on Render after Option A/C deploy (Jun 2026).

---

## User Guide (May 2026)

**Help → Quick Start** and related sections in `frontend/src/pages/HelpPage.tsx` document core workflow, CRM server sync across devices, margin decimals, Save Sheet/BOM/ROI/proposal persistence, Dashboard **Up to date** banner, AI roof save image (panels only), picker button label, and FAQ for empty project on reopen.
