# AI Roof Layout — 2D roadmap (bookmark)

**Status:** P1 complete; **P2 item 15 (SKU dimensions)** shipped (2026-05-20); **next** P2 yield hints / India copy or Track B slice 3 refactor  
**Last updated:** 2026-05-20  
**Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)  
**Scope:** 2D layout only (3D deferred until 2D reaches SaaS bar)  
**Primary UI:** `proposal-engine/frontend/src/pages/AIRoofLayout.tsx`  
**Backend:** `src/routes/roofLayout.ts`, `src/workers/layoutGenerationWorker.ts`, related services  

Use this doc as the single source of truth when resuming work. Compare targets: **Photonik** (speed/clarity), **SolarEdge Designer** (imagery + placement), **HelioScope / Aurora** (segments, keepouts, engineering credibility).

---

## Product positioning

| Competitor | Their strength | Rayenna wedge |
|------------|----------------|---------------|
| Photonik | Fast draw → panel count → proposal | CRM-native; India workflows; quote in one product |
| SolarEdge Designer | Auto roof detect, module placement, ecosystem | Layout embedded in Rayenna proposal, not separate export |
| HelioScope / Aurora | Facets, keepouts, shade, NEC, production | Sales-ready 2D in minutes; deep C&I later |

Win on **workflow integration** first; match **design-studio feel** in P0/P1.

---

## Current baseline (honest)

| Area | Today | Pro-tool norm |
|------|--------|----------------|
| Imagery | Single Google static satellite (~2048×2048, zoom 19) | HD tiles, layers |
| Roof outline | **Centered rectangle** seeded in worker; user drags corners | AI trace or CAD/LIDAR facets |
| Panels | Multi-facet grid fill; density + orientation; **edge setback band** (0–0.6 m) | Multi-facet arrays, keepouts, setbacks |
| Obstacles | Backend stub (`detectObstaclesM2`); **keepouts in 2D UI** (rect + circle) | Shade, setbacks, auto-detect |
| Roofs | **Up to 3 facets** + azimuth per section (v2 geometry) | Multiple facets + azimuth each |
| Electrical | None in 2D | Stringing, MPPT (out of 2D scope for now) |
| Output | Cropped JPEG + m² / panel count → proposal | Site plan PDF, BOM tie-in |
| UX | Konva; stepper/status/undo; keepouts; xl sidebar export; mobile sticky Save/PDF (2026-06) | Multi-facet, PDF site plan, shortcuts |
| Scale | **`src/constants/roofLayoutScale.ts`** ↔ PE `roofLayoutConstants.ts` (parity tests) | Single source across worker + editor |

Backend note: seed polygon uses `computeSeedRoofPolygonCoords` from `roofLayoutScale.ts`. Real segmentation replaces rectangle coords when added.

---

## Target workflow (2D)

```text
Locate site (CRM) → Outline roof → Define keepouts (P1) → Auto-fill panels → Adjust & validate → Save to proposal
```

Principles:

- One primary action per step (Photonik-style).
- Controls in sidebars / toolbars — **not on the map** (mobile toolbar above map is OK).
- Every metric is explainable (tap panel count → kW target, module W, usable m², fill %).
- Geometry JSON on server is source of truth; JPEG is export artifact (cross-device rule).

---

## Phased roadmap

### P0 — Trust & clarity (≈4–6 weeks, highest ROI)

| # | Item | Notes |
|---|------|--------|
| 1 | **Guided stepper** | Steps: Locate → Outline → Place panels → Review & save |
| 2 | **Honest roof outline** | Ship segmentation **or** label as “Draw roof outline” until AI trace is real |
| 3 | **Canvas chrome** | North arrow; legend; status strip (panels · kW · m² · saved at) |
| 4 | **Undo / redo** | Polygon moves, vertex drags |
| 5 | **Panel styling** | Module gap/stroke; optional row labels; hover/tap detail |
| 6 | **Draft vs saved** | Clear states; version line on server (user, timestamp) |
| 7 | **Desktop layout** | Left: steps + metrics · Center: full-height canvas · Right: context tools |

### P1 — Designer-grade editing (≈6–10 weeks)

| # | Item | Notes |
|---|------|--------|
| 8 | **Keepouts** | Rect/circle obstructions; optional edge setback band | ✅ Rect + circle keepouts (May 2026); edge setback band (Jun 2026) |
| 9 | **Multi-facet (2–3)** | Multiple polygons; azimuth per facet; rolled-up kW |
| 10 | **Smarter fill** | Target kW from CRM; respect keepouts; Fill / Clear / Refill |
| 11 | **Measurements** | Edge length (m) on hover; snap 90° / parallel | ✅ Vertex snap on drag (May 2026) |
| 12 | **Imagery** | Opacity; optional contrast; proper pan/zoom viewport on mobile | ✅ Opacity + mobile scroll buffer + Center (Jun 2026); contrast deferred |
| 13 | **Export** | PNG + PDF site plan (logo, customer, scale, north) | ✅ Site plan PDF (browser print, May 2026) |

Align backend `computePanelPacking` with **polygon geometry**, not only `usableAreaM2`.

### P2 — Credibility (2D-only, selective)

| # | Item | Notes |
|---|------|--------|
| 14 | **Simplified yield** | Azimuth/tilt factor per facet (India table); % loss badge | ✅ Panel-weighted effective kW + `−N% orient.` badge (`estimateRoofLayoutYield.ts`, May 2026) |
| 15 | **Equipment truth** | Panel dimensions from CRM module SKU (not hardcoded 1.1×2.2 m) | ✅ Costing/BOM spec → brand catalog → wattage table (`resolveModuleDimensions.ts`, May 2026) |
| 16 | **India hints** | Informational spacing/setback copy (not full rule engine) | ✅ Adjust panel callout (`RoofLayoutIndiaHints`, May 2026) |

**Defer (not 2D v1):** stringing, inverter design, LIDAR, DXF import.

---

## Suggested first implementation slice

**“2D Design Studio v1”** (≈2–3 weeks)

1. Guided stepper + desktop 3-column layout  
2. Undo/redo + north arrow + live kW status strip  
3. Persist `roof_polygon_coordinates` + `panel_coordinates` on every save (not JPEG-only)  
4. ~~Panel dimensions from CRM (`panelWattage` / module spec)~~ ✅ May 2026  
5. Keepouts v1 (rectangles only)  

Pick-up options when resuming:

- **A)** UX polish only (stepper, layout, undo, styling)  
- **B)** Geometry truth (segmentation or multi-facet + keepouts)  
- **C)** A then B (recommended)  

---

## Quick wins (anytime)

- [x] Copy: “AI-assisted draft” / “Draw roof outline” — not auto-traced (May 2026)
- [x] Centralize `METERS_PER_PIXEL`, seed polygon math (shared with backend worker) — Jun 2026 (`roofLayoutScale.ts` + parity tests)  
- [x] Save full geometry JSON on manual layout API every time — enforced on Save to Proposal in editing mode (May 2026)
- [x] Split UI slice 1: `RoofLayoutKonvaStage`, `lib/roofLayout/*` (page utils, capture, panel packing, customer sync) — May 2026
- [x] Split UI slice 2: generate/hydrate/save/export libs + header/banner/override/export chrome — May 2026 (`AIRoofLayout.tsx` ~2k lines)
- [ ] Split UI slice 3: scroll/viewport effects, 3D tab shell, editor-state hook
- [x] Keyboard: `Esc` pan, `E` edit, `K` keepouts, `Ctrl+Z` / `Ctrl+Y` undo — hints in UI (May 2026)

---

## Key files

| Layer | Path |
|-------|------|
| Page | `proposal-engine/frontend/src/pages/AIRoofLayout.tsx` |
| API client | `proposal-engine/frontend/src/lib/apiClient.ts` |
| Proposal embed | `proposal-engine/frontend/src/pages/ProposalPreview.tsx` |
| Routes | `src/routes/roofLayout.ts` |
| Job worker | `src/workers/layoutGenerationWorker.ts` |
| Scale constants | `src/constants/roofLayoutScale.ts` (CRM); `lib/roofLayoutConstants.ts` (PE mirror) |
| Preview toolbar | `components/roofLayout/RoofLayoutPreviewToolbar.tsx` |
| Satellite | `src/services/satelliteFetcher.ts` |
| Segmentation / area | `src/services/roofSegmentationService.ts` |
| Packing | `src/services/panelPackingEngine.ts` |
| PE image storage threshold | `docs/pe-image-storage-migration-plan.md` |

---

## Mobile (done 2026-06 — don’t regress)

- Map-first column order; status strip above preview  
- Preview row: **2D Layout | 3D View** + **Undo/Redo** (text labels; only after polygon edit)  
- Below map: **Scroll map** / **Edit polygon** / **Keepouts** + zoom + **Center**  
- Collapsible **Layout tools (panels, density, keepouts)** — accordion with 44px controls  
- Sticky bottom **Site plan PDF** + **Save to Proposal**; page padding clears footer + safe area  
- Map legend hidden on xs; export only in sticky bar (not duplicated under preview)  

## Desktop xl (done 2026-06 — don’t regress)

- Centre column: preview toolbar (2D/3D + undo only) → map  
- Right sidebar: **Proposal export** (stacked PDF + Save) → panel actions → layout tools  
- No export buttons crowding the map chrome  

---

## Acceptance bar (“SaaS standard” for 2D)

A salesperson on a phone or laptop can:

1. Open CRM-linked project → generate layout in &lt;2 minutes  
2. Outline roof and hit target panel count without reading code comments  
3. Save → see same layout on another device after login  
4. Proposal shows a crisp site image with believable metrics  
5. Understand what changed after “Regenerate” vs “Save”  

---

## Session log (append when you resume)

| Date | Branch / commit | Notes |
|------|-----------------|-------|
| 2026-05-16 | — | Roadmap bookmark created; mobile UX pass on `AIRoofLayout.tsx` |
| 2026-05-16 | — | **Slice A started:** stepper, status strip, undo/redo, north arrow/legend, panel styling, 2-col desktop layout |
| 2026-05-16 | — | **Slice B:** `geometryJson` on `ProjectRoofLayout`; save/load geometry; keepouts UI + panel fill skips keepouts; module dims from CRM wattage; target kW cap; hydrate editing session from server geometry + satellite |
| 2026-05-16 | — | **Slice C:** Refill/clear panels; desktop 3-col tools sidebar; edge length on hover; satellite opacity; fill % + kW vs target in status strip; honest copy (not auto-traced) |
| 2026-05-22 | — | **Phase 4 v1:** Multi-facet (≤3 roofs), azimuth presets, v2 `geometryJson`, Refill all sections, aggregated kW/m² status strip (SolarEdge Designer benchmark) |
| 2026-06-09 | `e34d67a` | **Saved — unsaved changes** fingerprint after Save to Proposal |
| 2026-06-09 | `5163656` | Edge setback (0–0.6 m), mobile scroll margin, Center map |
| 2026-06-09 | `40c6e4e` | Preview toolbar redesign; xl sidebar export; mobile a11y/touch targets |
| 2026-06-09 | `a1bdec8`, `4174f6a` | `METERS_PER_PIXEL` centralisation + seed polygon parity tests; prod smoke pass |

---

*When starting a Cursor chat: “Continue from `proposal-engine/docs/ai-roof-layout-2d-roadmap.md` — next P2 SKU dimensions or Track B slice 3.”*
