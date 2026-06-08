
# AI Roof Layout — Implementation Plan & Status

> **Last updated:** 2026-05-23  
> **Status:** **Core 2D module shipped** and in active use. This file is the **module plan + delivery record** for the original “AI roof detection & solar layout” initiative.  
> **Active roadmap (P1/P2 backlog):** [docs/ai-roof-layout-2d-roadmap.md](./docs/ai-roof-layout-2d-roadmap.md)  
> **Structural / refactor log:** [docs/MODERNIZATION_PROGRESS.md](./docs/MODERNIZATION_PROGRESS.md)

**Goal:** Generate a satellite-assisted rooftop solar layout from CRM coordinates, let sales draw and adjust the roof in 2D, persist layout on the CRM project, and embed it in the Proposal Engine proposal.

**Scope:** Proposal Engine **UI** in `proposal-engine/frontend/`. **API, persistence, satellite fetch, and image storage** on the shared CRM backend (`src/`), mounted at `/api/roof/*`, same auth and project access as the rest of PE.

---

## 1. Executive summary

| Area | Original plan (2026) | As built (May 2026) |
|------|----------------------|---------------------|
| Satellite imagery | Google Static Maps | ✅ `src/services/satelliteFetcher.ts` — zoom 19, 1024×2 scale (~2048 px) |
| Roof detection | OpenCV / AI trace | ❌ Not implemented — **centred rectangle** seeded in worker; user draws outline (honest copy in UI) |
| Panel placement | Backend grid in polygon | ✅ Konva editor + `computePanelsForPolygon` / refill; geometry-driven on save |
| API | `/proposal-engine/roof-layout/generate` | ✅ `/api/roof/ai-layout` (+ save, manual-layout GET, delete) |
| UI page | `RoofLayoutGenerator.tsx` | ✅ `pages/AIRoofLayout.tsx` (+ `components/roofLayout/*`) |
| Proposal embed | ProposalPreview section | ✅ “Proposed Rooftop Solar Layout” toggle + saved artifact |
| Worker / async | Background queue | ❌ **Synchronous** in-request generation (no separate worker process) |
| OpenCV | Phase 2 | ❌ Still deferred |
| Multi-facet roofs | Not in original plan | ✅ **Phase 4 v1** — up to 3 sections, v2 `geometryJson`, azimuth per facet |
| 3D simulation | Deferred (§10 below) | ✅ **Partial** — `Solar3DView.tsx`, 2D/3D tabs, optional 3D PNG + proposal preference |
| Cross-device | Cache files only | ✅ `ProjectRoofLayout` (Prisma) + Cloudinary when configured + `geometryJson` |
| Delete layout | Not in original plan | ✅ `DELETE /api/roof/layout/:projectId` + PE confirm modal |

---

## 2. Constraints (unchanged intent)

| Constraint | Implementation |
|------------|----------------|
| Module inside Proposal Engine | PE frontend + CRM API under `/api/roof` |
| Coordinates from CRM | **Customer** `latitude` / `longitude`; **Project** `systemCapacity`; **Project** `panelCapacityW` (watts) with 550 W default |
| Manual fallback | Maps link override + panel wattage override on `AIRoofLayout` |
| Cross-device truth | Server `project_roof_layouts` + optional Cloudinary URLs; PE `customerStore.roofLayout` mirror |

**Map GPS quality (2026-05):** Kerala sites (lat ~8°–13°N) with longitude **&lt; 76°** often return Google’s grey “no imagery” tile. Warnings in **CRM Customer Master** (`MapSelector`) and **PE** before generate; fix coordinates in CRM or use override URL.

**Env (CRM API):** `GOOGLE_MAPS_API_KEY` required for satellite fetch (see root `.env` / Render env).

---

## 3. Where things live (current repo map)

| Component | Location | Notes |
|-----------|----------|--------|
| API routes | `src/routes/roofLayout.ts` | Mounted: `apiRouter.use('/roof', roofLayoutRoutes)` |
| Geometry types (server) | `src/types/roofLayoutGeometry.ts` | v2 facets; `legacyCoordinatesFromGeometry()` for API compat |
| Satellite fetch | `src/services/satelliteFetcher.ts` | Google Static Maps → `generated_layouts/{projectId}_satellite.png` |
| Layout job | `src/workers/layoutGenerationWorker.ts` | Sync pipeline: satellite → area/obstacle stubs → pack count → AI layout PNG |
| Area / obstacles | `src/services/roofSegmentationService.ts`, `obstacleDetector.ts` | Heuristic / stub (not real CV segmentation) |
| Panel packing (job) | `src/services/panelPackingEngine.ts` | Used at **generate** time for metrics + initial count |
| AI layout render | `src/services/layoutRenderer.ts` | `{projectId}_ai_layout.png` |
| Image persistence | `src/services/roofLayoutImageStorage.ts` | Cloudinary upload/repair; `deleteProjectRoofLayoutArtifacts()` |
| Map GPS validation | `src/utils/mapGpsValidation.ts` | Kerala longitude warning (shared logic in PE `mapGpsValidation.ts`) |
| Generated files | `generated_layouts/` (repo root) | Also served at `/api/generated_layouts` and `/generated_layouts` |
| DB | `prisma` → `ProjectRoofLayout` | `geometryJson`, `satelliteImageUrl`, `layoutImage3dUrl`, `prefer3dForProposal` |
| PE page | `proposal-engine/frontend/src/pages/AIRoofLayout.tsx` | Konva canvas, hydrate from `GET manual-layout` |
| PE components | `proposal-engine/frontend/src/components/roofLayout/` | Stepper, facet bar, status strip, map chrome, undo, panels, keepouts, adjust |
| PE libs | `lib/roofLayoutGeometry.ts`, `roofLayoutFacets.ts`, `roofLayoutConstants.ts`, `roofLayoutEdgeMeasure.ts`, `roofLayoutSatelliteImage.ts` | v2 geometry; facet state; edge lengths |
| PE API client | `lib/api/roofLayout.ts` | `generateAiRoofLayout`, `saveManualRoofLayoutImage`, `fetchManualRoofLayout`, `deleteRoofLayout`, 3D save |
| Proposal | `pages/ProposalPreview.tsx`, `proposal/roofLayoutForProposal.ts` | Include layout in proposal; availability checks |
| 3D view | `components/Solar3DView.tsx`, `lib/solar3DHelpers.ts` | Lazy-loaded; optional export |
| Confirm delete | `components/ConfirmDangerModal.tsx` | Same pattern as Customers delete modal |
| Customers UI | `CustomerBadges.tsx`, `customerStore.ts` | **Map GPS**, **Roof layout** badges; **5** artifact dots (roof = 5th dot; PE Ready still = 4 core) |
| Help | `pages/HelpPage.tsx` (Quick Start + AI Roof section) | Regenerate vs Delete, Kerala GPS, multi-facet |

**Not used (original plan paths):** `src/services/roof/*` package layout, `RoofLayoutGenerator.tsx`, `opencv4nodejs`, separate `roofLayoutWorker` queue.

---

## 4. API contract (implemented)

Base path: **`/api/roof`** (authenticated).

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/ai-layout` | Generate satellite + AI layout PNG; upsert `ProjectRoofLayout` (AI source); returns metrics + URLs + seed polygon |
| `POST` | `/save-layout-image` | Save cropped 2D JPEG + **v2 geometry** (`geometryJson`) |
| `POST` | `/save-3d-layout-image` | Save 3D PNG; optional prefer-for-proposal flag |
| `POST` | `/set-layout-embed-preference` | Toggle 2D vs 3D for proposal embed |
| `GET` | `/manual-layout/:projectId` | Load saved layout + geometry + satellite URL for editor hydrate |
| `DELETE` | `/layout/:projectId` | Remove DB row, local `generated_layouts/*`, Cloudinary assets (if configured) |

**Generate body:** `{ projectId, latitude, longitude, systemSizeKw, panelWattage }`  
**Generate errors:** Missing fields, access denied, **422** if Kerala Map GPS rule fails (`MAP_GPS_KERALA_LONGITUDE`), satellite placeholder / missing imagery, missing `GOOGLE_MAPS_API_KEY`.

**Static assets:** `{API}/api/generated_layouts/{projectId}_satellite.png`, `_ai_layout.png`, `_manual_layout.jpg`, `_3d_layout.png`, etc.

---

## 5. Data model

**`ProjectRoofLayout`** (`project_roof_layouts`):

- Metrics: `roofAreaM2`, `usableAreaM2`, `panelCount`
- URLs: `layoutImageUrl` (2D proposal/export), `satelliteImageUrl`, optional `layoutImage3dUrl`, `prefer3dForProposal`
- **`geometryJson`:** version **2** — `facets[]` (id, label, azimuthDeg, roofPolygon, panelRects), global `keepouts`, panel orientation/spacing, `imageWidth` / `imageHeight`, `metersPerPixel`
- **v1** geometry still parsed server-side into v2 for legacy rows
- `source`: `AI` | `MANUAL`

PE mirrors saved layout on `CustomerRecord.roofLayout` and optionally `proposal.roofLayout` for cards and proposal flow.

---

## 6. Backend pipeline (generate)

```text
POST /ai-layout
  → ensureProjectWriteAccess
  → getKeralaMapGpsWarning (422 if failed)
  → generateRoofLayoutJob
       → fetchSatelliteImage (Google, validate non-placeholder size)
       → computeRoofAreaM2 / detectObstaclesM2 (stubs)
       → computePanelPacking (target kW → panel count estimate)
       → renderLayoutImage → ai_layout.png
  → optional Cloudinary upload
  → prisma.projectRoofLayout.upsert
  → JSON response (metrics, URLs, roof_polygon_coordinates seed)
```

**Not implemented:** OpenCV roof polygon, async job queue, param-based file cache separate from DB (regenerate overwrites satellite file per project).

---

## 7. Frontend workflow (2D design studio)

**Route:** `/ai-layout` → `AIRoofLayout.tsx`

**Guided steps (stepper):** Locate site → Outline roof → Place panels → Review & save

| Feature | Status |
|---------|--------|
| Generate / Regenerate AI Layout | ✅ |
| Delete layout (modal confirm, blank + Generate) | ✅ May 2026 |
| Satellite base + Konva panels | ✅ |
| Drag roof polygon + move whole roof | ✅ |
| Undo / redo polygon | ✅ |
| Rectangular keepouts | ✅ |
| Panel density, portrait/landscape, opacity, zoom | ✅ |
| Refill / clear panels (active facet + refill all) | ✅ |
| Edge length on hover (m) | ✅ |
| North arrow + legend (`RoofLayoutMapChrome`) | ✅ |
| Status strip (kW vs CRM, fill %, areas) | ✅ |
| Multi-facet (≤3), azimuth presets, facet bar | ✅ Phase 4 v1 |
| Save to Proposal (JPEG + geometry to server) | ✅ |
| Mobile: Scroll map / Edit polygon / Keepouts | ✅ |
| 2D / 3D tabs + 3D export | ✅ |
| Draft vs saved indicators | ✅ |
| Map GPS / Kerala warnings | ✅ May 2026 |

**Honest product copy:** Satellite-assisted **draft**; roof outline is **user-drawn**, not auto-traced.

---

## 8. Proposal integration

- After **Save to Proposal**, layout is on the CRM project.
- **Proposal** page: **Include AI Roof Layout (Beta) in proposal** when layout exists (`roofLayoutForProposal` availability).
- Exported **2D** save image is panels-on-satellite (no green edit handles); geometry remains editable on return to AI Roof Layout.
- Optional **3D** image in proposal when saved and preference set.

---

## 9. Phased delivery — plan vs reality

| Phase | Original intent | Outcome |
|-------|-----------------|--------|
| **Phase 1** | Rectangular fallback, sync API, no OpenCV, proposal embed | ✅ **Done** (evolved into full Konva editor + DB persistence) |
| **Phase 2** | OpenCV + background worker | ❌ **Not started** |
| **Phase 3** | Persist layout URL; panel wattage in CRM | ✅ **Done** (`ProjectRoofLayout` + `panelCapacityW` on Project) |
| **P0 UX** (roadmap) | Stepper, undo, chrome, desktop layout | ✅ Largely done (see roadmap) |
| **P1** (roadmap) | Keepouts, multi-facet, measurements, PDF site plan | ✅ Keepouts + multi-facet + measurements + **site plan PDF** (May 2026); 90° snap + circle keepouts pending |
| **P2** (roadmap) | Yield hints, SKU dimensions, India copy | ❌ Not started |
| **Phase 4 v1** | SolarEdge-style multi-facet | ✅ **Done** (May 2026) |
| **Ops** | Delete layout, GPS validation | ✅ **Done** (May 2026) |

---

## 10. 3D solar view (updated from “deferred only”)

Originally deferred in this plan; **now partially shipped:**

| Item | Status |
|------|--------|
| Three.js scene (`Solar3DView`) | ✅ Lazy-loaded |
| Roof polygon → mesh, panels from coords | ✅ |
| Tilt / orbit / export PNG | ✅ |
| Save 3D to server + proposal embed preference | ✅ |
| Full engineering / shade / stringing | ❌ Out of scope |

Treat 3D as **optional sales visual**, not a replacement for 2D editing truth (`geometryJson`).

---

## 11. Still deferred / backlog

From original plan and [ai-roof-layout-2d-roadmap.md](./docs/ai-roof-layout-2d-roadmap.md):

- [ ] Real roof segmentation (OpenCV or external CV) instead of rectangle seed  
- [ ] Background worker + 202/poll for long-running generates  
- [x] PDF **site plan** export (logo, scale, north, customer block) — browser print from AI Roof Layout (May 2026)  
- [x] Circle keepouts, 90° / parallel snap (May 2026)  
- [ ] Param-based image cache keyed by `systemSizeKw` + `panelWattage` (today: per-`projectId` files + DB)  
- [ ] Smarter obstacle detection (currently stub)  
- [ ] P2 yield / module SKU dimensions from BOM  

**Quick wins (roadmap):** centralise `METERS_PER_PIXEL` with worker; keyboard shortcuts (`Esc` / `E` / undo); ~~further split `AIRoofLayout.tsx`~~ slices 1–2 done (~2k lines; slice 3 deferred).

---

## 12. Pre-flight checklist (updated)

- [x] Google Static Maps API key — `GOOGLE_MAPS_API_KEY` on CRM API  
- [x] Phase 1 without OpenCV — rectangle seed + user edit  
- [x] Sync generate (no worker)  
- [x] `panelCapacityW` on Project (CRM) + 550 W default in PE  
- [x] `generated_layouts/` gitignored; served via Express  
- [x] CORS / static URLs for PE (Render + Vercel); local Vite proxy `/api` → :3000  
- [x] Cloudinary optional for production persistence  
- [x] Cross-device geometry via `geometryJson`  
- [ ] Production monitoring for satellite placeholder rate by region  

---

## 13. How to verify

```bash
# Terminal 1 — repo root
npm run dev   # API :3000, CRM UI :5173

# Terminal 2
cd proposal-engine/frontend && npm run dev   # PE :5174
```

See [docs/SMOKE_CHECKLIST.md](./docs/SMOKE_CHECKLIST.md) — AI roof layout section (generate, override URL, multi-facet, save/reopen, delete, badges, proposal embed).

Unit tests: `proposal-engine/frontend` (`roofLayoutGeometry.test.ts`, etc.); root `src/utils/mapGpsValidation.test.ts`.

---

## 14. Session log (implementation history)

| Date | Notes |
|------|--------|
| 2026-05 (early) | Phase 1 pipeline: `satelliteFetcher`, `layoutGenerationWorker`, `roofLayout` routes, `AIRoofLayout`, proposal embed |
| 2026-05-16 | P0/P1 slices: stepper, undo, keepouts, `geometryJson`, status strip, edge measure, satellite opacity, Cloudinary + Prisma persist |
| 2026-05-16 | Plan marked superseded by [ai-roof-layout-2d-roadmap.md](./docs/ai-roof-layout-2d-roadmap.md) for ongoing prioritisation |
| 2026-05-18–20 | 3D view, save 3D, embed preference; PE help Quick Start |
| 2026-05-22 | **Phase 4 v1:** Multi-facet (≤3), v2 geometry (PE + `src/types`), azimuth, refill-all, aggregated metrics |
| 2026-05-23 | Customers: **Map GPS** + **Roof layout** badges, **5** artifact dots; Kerala GPS validation (CRM + API + PE); **Delete layout** + `ConfirmDangerModal`; satellite/URL fixes; help docs updated |
| 2026-05-20 | **Track C:** 90°/parallel vertex snap on polygon drag; circle keepouts (geometry JSON v2, panel packing, cross-device hydrate) |

---

## 15. Related documents

| Doc | Use |
|-----|-----|
| [docs/ai-roof-layout-2d-roadmap.md](./docs/ai-roof-layout-2d-roadmap.md) | P0/P1/P2 priorities, SaaS acceptance bar, mobile rules |
| [docs/MODERNIZATION_PROGRESS.md](./docs/MODERNIZATION_PROGRESS.md) | PE refactor phases (api split, etc.) |
| [docs/SMOKE_CHECKLIST.md](./docs/SMOKE_CHECKLIST.md) | Manual regression |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | CRM + PE system architecture |
| [README.md](./README.md) | PE local quick start, env vars |
| `docs/pe-image-storage-migration-plan.md` (repo root) | When to migrate PE images to Cloudinary at scale |

---

## Appendix A — Original step-by-step plan (archived)

The sections below describe the **initial 2026 design** before implementation. They are kept for historical context; **§3–§7** reflect what was actually built.

<details>
<summary>Original Steps 1–10, dependencies, and file list (click to expand)</summary>

### Original Step 1 — Fetch Google Maps satellite image

- Planned: `src/services/roof/roofImageFetcher.ts`, env `GOOGLE_MAPS_KEY`
- **Built as:** `src/services/satelliteFetcher.ts`, env `GOOGLE_MAPS_API_KEY`

### Original Step 2 — Roof detection (OpenCV)

- Planned: Canny/contours or Phase 1 rectangle fallback  
- **Built:** Rectangle seed only in `layoutGenerationWorker`; user edits in Konva; **no OpenCV**

### Original Steps 3–4 — Panel layout + rendering

- Planned: `panelLayoutEngine.ts`, `layoutRenderer.ts` on server only  
- **Built:** Server `layoutRenderer` for AI preview PNG; **primary** panel layout in PE Konva + geometry on save

### Original Step 5 — API

- Planned: `POST .../roof-layout/generate` with cache key on kW + wattage  
- **Built:** `POST /api/roof/ai-layout` + save/load/delete routes; cache = per-project files + DB row

### Original Steps 6–7 — Proposal + UI

- Planned: `RoofLayoutGenerator.tsx`  
- **Built:** `AIRoofLayout.tsx` + `ProposalPreview` embed

### Original Step 8 — Background worker

- **Not implemented** — synchronous generation remains

### Original Steps 9–10 — Errors + caching

- Partially: warnings for bad satellite; Kerala GPS validation added later  
- Caching: overwrite/regenerate per project, not original multi-param filename scheme

### Original dependencies

| Package | Planned | Used |
|---------|---------|------|
| axios | Yes | Yes |
| sharp / canvas | Yes | Partial (renderer path) |
| opencv4nodejs | Phase 2 | No |
| react-konva / use-image | Not listed | Yes (PE) |

</details>

---

*When resuming product work, start from [docs/ai-roof-layout-2d-roadmap.md](./docs/ai-roof-layout-2d-roadmap.md). When resuming “what did we ship?”, use **§1–§14** above.*
