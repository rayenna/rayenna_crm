# Proposal Engine — modernization progress

**Purpose:** Resume structural improvement work without re-discovering context.  
**Last updated:** 2026-05-16  
**Status:** **Phase 2b** complete — `ProposalPreview.tsx` split into `frontend/src/proposal/`. Next: **Phase 2c** (`CostingSheet.tsx`).

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
| Unit tests (23) | `parseGoogleMapsLink`, `roofLayoutGeometry`, `deriveProposalStatusFromArtifacts` / `normalizeProposalStatus`, `mapApiArtifactsToRecord` |
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

Tests added: `proposal/proposalAssembly.test.ts` (`genRef`, `fmtINR`, `fmtINRFull`).  
Route unchanged: lazy `import('./pages/ProposalPreview')` in `App.tsx`.

---

## Not started (planned)

| Phase | Scope |
|-------|--------|
| ~~**2b**~~ | ~~Split `ProposalPreview.tsx`~~ — done |
| **2c** | Split `CostingSheet.tsx` |
| **2d** | Split `Customers.tsx` |
| **2e** | Bundle measurement; lazy chunks only if justified |
| **3** | WIP vs server conflict banner; central save pipeline |
| **4** | Product: [ai-roof-layout-2d-roadmap.md](./ai-roof-layout-2d-roadmap.md) P0/P1 |

---

## How to verify after any PE change

```bash
cd proposal-engine/frontend
npm test
npm run build
```

Staging: [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md).

---

## Deploy impact (this modernization batch)

| Render service | Redeploy? | Why |
|----------------|-----------|-----|
| **rayenna-proposal-engine** (static) | **Yes** | All changes are under `proposal-engine/frontend/` + docs |
| **CRM API** (Web Service) | **No** | No `src/` or `prisma/` changes in this batch |
| **rayenna-crm-frontend** | **No** | No `client/` changes |

Vercel PE project: redeploy if used (same as Render PE).

---

## Git

PE-only commits under `proposal-engine/`. Do not mix with CRM paths in one commit.

When resuming in Cursor: *“Continue PE modernization from `proposal-engine/docs/MODERNIZATION_PROGRESS.md`, start Phase 2b.”*

---

## User Guide (May 2026)

**Help → Quick Start** and **AI Roof Layout** sections in `frontend/src/pages/HelpPage.tsx` were updated to document: guided stepper, Maps override + regenerate, keepouts, undo/redo, Save to Proposal vs Regenerate, cross-device geometry, 2D/3D tabs, and new FAQ entries.
