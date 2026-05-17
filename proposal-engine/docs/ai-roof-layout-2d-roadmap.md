# AI Roof Layout — 2D roadmap (bookmark)

**Status:** In progress — P0 largely started (see session log); 3D secondary  
**Last updated:** 2026-05-16  
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
| Panels | One polygon; grid fill; density + orientation | Multi-facet arrays, keepouts, setbacks |
| Obstacles | Backend stub (`detectObstaclesM2`); **keepouts in 2D UI** (rect) | Shade, setbacks, auto-detect |
| Roofs | Single polygon | Multiple facets + azimuth each |
| Electrical | None in 2D | Stringing, MPPT (out of 2D scope for now) |
| Output | Cropped JPEG + m² / panel count → proposal | Site plan PDF, BOM tie-in |
| UX | Konva; stepper/status/undo; keepouts; mobile toolbar (2026-05) | Multi-facet, PDF site plan, shortcuts |

Backend note: `layoutGenerationWorker.ts` comment says real segmentation replaces rectangle coords when added.

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
| 8 | **Keepouts** | Rect/circle obstructions; optional edge setback band |
| 9 | **Multi-facet (2–3)** | Multiple polygons; azimuth per facet; rolled-up kW |
| 10 | **Smarter fill** | Target kW from CRM; respect keepouts; Fill / Clear / Refill |
| 11 | **Measurements** | Edge length (m) on hover; snap 90° / parallel |
| 12 | **Imagery** | Opacity; optional contrast; proper pan/zoom viewport on mobile |
| 13 | **Export** | PNG + PDF site plan (logo, customer, scale, north) |

Align backend `computePanelPacking` with **polygon geometry**, not only `usableAreaM2`.

### P2 — Credibility (2D-only, selective)

| # | Item | Notes |
|---|------|--------|
| 14 | **Simplified yield** | Azimuth/tilt factor per facet (India table); % loss badge |
| 15 | **Equipment truth** | Panel dimensions from CRM module SKU (not hardcoded 1.1×2.2 m) |
| 16 | **India hints** | Informational spacing/setback copy (not full rule engine) |

**Defer (not 2D v1):** stringing, inverter design, LIDAR, DXF import.

---

## Suggested first implementation slice

**“2D Design Studio v1”** (≈2–3 weeks)

1. Guided stepper + desktop 3-column layout  
2. Undo/redo + north arrow + live kW status strip  
3. Persist `roof_polygon_coordinates` + `panel_coordinates` on every save (not JPEG-only)  
4. Panel dimensions from CRM (`panelWattage` / module spec)  
5. Keepouts v1 (rectangles only)  

Pick-up options when resuming:

- **A)** UX polish only (stepper, layout, undo, styling)  
- **B)** Geometry truth (segmentation or multi-facet + keepouts)  
- **C)** A then B (recommended)  

---

## Quick wins (anytime)

- [ ] Copy: “AI-assisted draft” OK; don’t imply auto-traced roof while rectangle seed remains  
- [ ] Centralize `METERS_PER_PIXEL`, panel size (shared with backend worker)  
- [ ] Save full geometry JSON on manual layout API every time  
- [ ] Split UI: `RoofLayoutCanvas`, `RoofLayoutToolbar`, `RoofLayoutMetrics`  
- [ ] Keyboard: `Esc` pan, `E` edit, `Ctrl+Z` / `Ctrl+Y` undo  

---

## Key files

| Layer | Path |
|-------|------|
| Page | `proposal-engine/frontend/src/pages/AIRoofLayout.tsx` |
| API client | `proposal-engine/frontend/src/lib/apiClient.ts` |
| Proposal embed | `proposal-engine/frontend/src/pages/ProposalPreview.tsx` |
| Routes | `src/routes/roofLayout.ts` |
| Job worker | `src/workers/layoutGenerationWorker.ts` |
| Satellite | `src/services/satelliteFetcher.ts` |
| Segmentation / area | `src/services/roofSegmentationService.ts` |
| Packing | `src/services/panelPackingEngine.ts` |
| PE image storage threshold | `docs/pe-image-storage-migration-plan.md` |

---

## Mobile (done 2026-05 — don’t regress)

- Map-first column order; summary below  
- Scroll / Edit / Zoom **above** map (not overlaid)  
- Collapsible “Adjust layout (density, orientation)” **above** map, expands in place  
- Sticky bottom **Save to Proposal** with safe-area padding  

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
| | | |

---

*When starting a Cursor chat: “Continue from `proposal-engine/docs/ai-roof-layout-2d-roadmap.md`, slice A/B/C.”*
