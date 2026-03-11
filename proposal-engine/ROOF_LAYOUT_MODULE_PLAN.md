# AI Roof Detection & Solar Layout — Implementation Plan

> **Status: PENDING — To be revisited later.** Plan is complete; implementation deferred.

**Goal:** Automatically generate a rooftop solar panel layout image from coordinates and insert it into the Proposal Engine customer proposal.

**Scope:** This module lives inside the Proposal Engine product. The **UI and proposal integration** are in `proposal-engine/frontend/`. The **API, services, worker, and image storage** live in the **shared CRM backend** (`src/`) under the existing Proposal Engine API prefix, so the feature stays logically “inside” Proposal Engine and reuses the same auth and project context.

---

## 1. Constraints & Clarifications

| Constraint | Interpretation |
|------------|----------------|
| Module runs inside Proposal Engine | PE frontend: new UI + proposal insertion. Backend: new routes under `/api/proposal-engine/roof-layout/*` in the existing Node server (`src/`). |
| Coordinates from CRM | Fetched from **Customer** (`latitude`, `longitude`) and **Project** (`systemCapacity`). Project is linked to Customer; PE already gets project+customer via `GET /api/proposal-engine/projects/:id`. |
| Manual fallback if CRM fails | Roof layout UI allows manual entry of lat/long, system_size_kw, panel_wattage when CRM data is missing or user wants to override. |
| Input data | `customer_id`, `project_id` from CRM; `latitude`, `longitude` from Customer (or manual); `system_size_kw` from Project (or manual); `panel_wattage` default **550** (CRM has no `panelWattage` today; optional: add to Project later). |

**CRM schema (current):**
- **Customer:** `latitude`, `longitude` (Float?)
- **Project:** `systemCapacity` (Float?, kW), `panelType` (String?). No `panelWattage` → use **550** as default.

---

## 2. Where Things Live (Repo Map)

| Component | Location | Notes |
|-----------|----------|--------|
| API routes | `src/routes/roofLayout.ts` | Mounted as `apiRouter.use('/proposal-engine/roof-layout', roofLayoutRoutes)` (or nested under proposalEngine router). |
| Services | `src/services/roof/` | roofImageFetcher.ts, roofDetector.ts, panelLayoutEngine.ts, layoutRenderer.ts |
| Worker | `src/workers/roofLayoutWorker.ts` | Background job runner (see §6). |
| Generated images | Server disk: e.g. `generated_layouts/` (or `uploads/roof-layouts/`) | Path must be configurable (env); served via static route or GET endpoint. |
| Static serving | `src/server.ts` | e.g. `app.use('/generated_layouts', express.static(path.join(__dirname, '../generated_layouts')))` so frontend can use URL like `{API_BASE}/generated_layouts/{projectId}_roof_layout.png`. |
| PE frontend UI | `proposal-engine/frontend/src/components/RoofLayoutGenerator.tsx` (or `pages/`) | Button, preview, manual override form. |
| Proposal integration | `proposal-engine/frontend/src/pages/ProposalPreview.tsx` | New section “Proposed Rooftop Solar Layout” + image when layout exists. |
| PE API client | `proposal-engine/frontend/src/lib/apiClient.ts` | `generateRoofLayout(projectId, payload)`, `getRoofLayoutUrl(projectId)`. |

---

## 3. Input / Output Contract

**POST /api/proposal-engine/roof-layout/generate**

- **Request body:**  
  `{ project_id: string, latitude: number, longitude: number, system_size_kw: number, panel_wattage?: number }`  
  - `panel_wattage` optional; default **550**.
- **Response:**  
  `{ layout_image_url: string, panel_count: number, warning?: string }`  
  - `layout_image_url`: path or URL the frontend can use to display/save (e.g. `/generated_layouts/{project_id}_roof_layout.png` or full URL if served from same origin).  
  - `warning`: e.g. `"Roof detection failed. Layout generated using default rectangle."`

**Caching (Step 10):**  
- Key: `project_id` + `system_size_kw` (+ optionally `panel_wattage`).  
- If file already exists for that key and is recent, return cached image URL and panel count without recomputing.  
- Store metadata (panel_count, path) in memory or in a small JSON/DB table so we don’t need to re-read the image.

---

## 4. Step-by-Step Implementation Plan

### Step 1 — Fetch Google Maps satellite image

- **Service:** `src/services/roof/roofImageFetcher.ts`
- **Input:** `lat`, `lng`, optional `zoom` (default 20), `size` (default 1024x1024).
- **Process:** Build Google Static Maps URL; use `axios` (or node `https`) to GET image; save to temp file (e.g. `tmp/roof_{projectId}_satellite.png` or similar).
- **Env:** `GOOGLE_MAPS_KEY` or `GOOGLE_STATIC_MAP_API_KEY` (required for this step).
- **Error:** If key missing or request fails, return clear error so caller can fallback (e.g. to default rectangle layout).

### Step 2 — Roof detection (OpenCV)

- **Service:** `src/services/roof/roofDetector.ts`
- **Input:** Path to satellite image file.
- **Process:**  
  1. Load image; convert to grayscale.  
  2. Canny edge detection.  
  3. Contour detection; filter by area/shape to get “roof-like” polygons.  
  4. Pick largest suitable polygon; return as `{ roof_polygon: [[x1,y1], ...] }`.
- **Dependency risk:** `opencv4nodejs` has native bindings and requires OpenCV installed on the host (and can be painful on Windows/CI). **Recommendation:**  
  - **Phase 1:** Implement a **simple fallback only** (no OpenCV): e.g. use a default rectangle (e.g. 80% of image center) and set `warning: "Roof detection failed. Layout generated using default rectangle."`  
  - **Phase 2:** Add optional OpenCV path: if `opencv4nodejs` is available and detection runs, use it; otherwise fallback.  
  - **Alternative:** Use `sharp` for basic operations (grayscale, etc.) and a simple heuristic (e.g. largest contour by area with `sharp` or a lightweight JS lib) to avoid OpenCV on the server; quality will be lower but no native deps.
- **Output:** `{ roof_polygon, success: boolean }` so renderer can draw polygon or fallback.

### Step 3 — Panel layout algorithm

- **Service:** `src/services/roof/panelLayoutEngine.ts`
- **Input:** `roof_polygon`, `system_size_kw`, `panel_wattage`, image dimensions.
- **Logic:**  
  - `panels_required = ceil((system_size_kw * 1000) / panel_wattage)`.  
  - Panel aspect: 2.2m x 1.1m for 550W → scale to pixel size relative to image (e.g. 1024px image → panel width/height in px).  
  - Grid packing inside polygon: place rectangles (panels) in rows; clip to polygon boundary; add small gap between panels; stop when `panels_required` is reached.
- **Output:** `{ panels: [{ x, y, w, h }, ...], panel_count }`.

### Step 4 — Layout rendering

- **Service:** `src/services/roof/layoutRenderer.ts`
- **Input:** Satellite image path, `roof_polygon`, `panels`, labels (panel count, system size).
- **Process:** Use `canvas` (node-canvas) or `sharp` (composite) to:  
  - Draw satellite image as base.  
  - Draw roof polygon outline.  
  - Draw panel rectangles.  
  - Draw text: “Proposed {system_size_kw} kW Solar PV Layout”, panel count, system size.
- **Output:** Save to `generated_layouts/{project_id}_roof_layout.png` (or env-configured dir). Create directory if missing.

### Step 5 — API endpoint

- **File:** `src/routes/roofLayout.ts` (or add to `proposalEngine.ts` as a sub-router).
- **POST /generate:**  
  - Validate body (project_id, latitude, longitude, system_size_kw; panel_wattage optional).  
  - Auth: reuse `authenticate` and project access (same as PE: ensure user can access this project).  
  - **Caching:** If cache hit (same project_id + system_size_kw + panel_wattage), return existing `layout_image_url` and `panel_count`.  
  - **Sync or async:** Phase 1 can be **synchronous** (generate in request, return when done; may need longer timeout for Render). Phase 2: queue job, return 202 + job id; frontend polls or uses webhook.  
  - Call services in order: fetch image → detect roof (or fallback) → panel layout → render → save; return URL and panel_count.
- **GET /image/:projectId** (optional): Serve the generated image if you don’t expose `generated_layouts` as static; or rely on static middleware and return 302 to file path.

### Step 6 — Proposal integration (frontend)

- **ProposalPreview.tsx:**  
  - When building the proposal document (e.g. docx or HTML), if a roof layout exists for the current project:  
    - Add a section “Proposed Rooftop Solar Layout”.  
    - Include image (same way as existing diagram/logo: ImageRun from URL or embedded; if image is from API origin, fetch as blob and embed).  
    - Show panel count and system capacity.  
  - Data source: either from “last generate” response stored in component/context, or GET endpoint that returns `{ layout_image_url, panel_count }` for project.

### Step 7 — UI component (frontend)

- **RoofLayoutGenerator.tsx:**  
  - Props: `projectId`, optional initial data (lat, lng, system_size_kw, panel_wattage) from project/customer.  
  - “Generate Roof Layout” button; on click call POST `/api/proposal-engine/roof-layout/generate` with payload (from CRM data or manual form).  
  - Show loading state; on success show preview image (e.g. `<img src={layout_image_url} />`) and panel count.  
  - “Regenerate” if user changes system size (or manual params).  
  - Place this component where it makes sense in the PE flow (e.g. Customer Workspace or a step before Proposal, or inside Proposal page as an optional block).

### Step 8 — Background worker

- **File:** `src/workers/roofLayoutWorker.ts`
- **Options:**  
  - **A. In-process queue:** Simple in-memory queue; a setInterval or `process.nextTick` loop processes one job at a time; job payload = same as POST body. API enqueues and returns 202 with job id; frontend polls GET `/roof-layout/status/:jobId` until done.  
  - **B. External queue:** Bull/BullMQ + Redis; API pushes job; worker in same process or separate; same polling or webhook.  
  - **C. Defer worker to Phase 2:** Keep generation synchronous in API (with timeout ~60s); add worker later when needed.  
- **Recommendation:** Start with **synchronous** generation in the API (Step 5). If timeouts or load become an issue, introduce worker (A or B) and change API to enqueue + return 202.

### Step 9 — Error handling

- **Roof detection failure:** As in Step 2, fallback to default rectangle; set `warning` in response.  
- **Google Maps failure:** Return 4xx/5xx with message; UI shows “Unable to fetch satellite image; check coordinates and API key.”  
- **Rendering failure:** Log; return 500; optional retry or fallback (e.g. text-only placeholder in proposal).

### Step 10 — Caching

- **Key:** `project_id` + `system_size_kw` + `panel_wattage` (normalized).  
- **Storage:** File path `generated_layouts/{project_id}_{system_size_kw}_{panel_wattage}_roof_layout.png` (or include hash of params). Before generating, check if file exists and is valid; if yes, return its URL and stored `panel_count`.  
- **Metadata:** Optional: small JSON file next to image or a DB table (e.g. `PERoofLayoutCache`: projectId, systemSizeKw, panelWattage, filePath, panelCount, generatedAt) for quick lookup without filesystem scan.

---

## 5. Dependencies

| Package | Where | Purpose | Note |
|---------|--------|--------|------|
| axios | Backend (likely already present) | Fetch Google Static Map image | - |
| sharp | Backend | Image processing (resize, composite, draw) | Lighter than OpenCV; can do fallback rendering. |
| canvas (node-canvas) | Backend | Draw polygon, panels, text on image | Native deps (Cairo); may need install notes for Render/Windows. |
| opencv4nodejs | Backend (optional, Phase 2) | Roof detection (Canny, contours) | **Optional;** heavy native dep; consider Phase 2 or alternative. |
| react-image or plain img | Frontend | Display layout preview | Or use native `<img>`; `react-image` only if you need loading/error states. |

**Recommendation:**  
- **Phase 1:** `axios`, `sharp`, `canvas` (or `sharp`-only rendering if canvas is problematic). No OpenCV; use rectangular fallback and `warning` message.  
- **Phase 2:** Add `opencv4nodejs` (or Python microservice) for real roof detection if needed.

---

## 6. Data Flow Summary

1. **PE frontend** loads project (and customer) via existing `GET /api/proposal-engine/projects/:id` → gets `customer.latitude`, `customer.longitude`, `project.systemCapacity`.  
2. User optionally edits (manual fallback) and clicks “Generate Roof Layout”.  
3. **Frontend** calls `POST /api/proposal-engine/roof-layout/generate` with `project_id`, `latitude`, `longitude`, `system_size_kw`, `panel_wattage` (default 550).  
4. **Backend** checks cache → if miss: fetch satellite image → roof detection (or fallback) → panel layout → render → save to `generated_layouts/` → return `layout_image_url` and `panel_count`.  
5. **Frontend** shows preview; proposal generator includes this image and labels in the document when layout exists.

---

## 7. Phased Delivery Suggestion

| Phase | Scope | Delivers |
|-------|--------|----------|
| **Phase 1** | No OpenCV; rectangular fallback; sync API; cache by project_id + system_size_kw + panel_wattage | End-to-end: button → generate → preview → insert into proposal. All steps 1–7 and 9–10; Step 8 (worker) deferred. |
| **Phase 2** | Optional OpenCV roof detection; background worker if needed | Better roof shape; offload long runs to worker. |
| **Phase 3** | Optional: store layout URL in PE artifact or DB; panel_wattage in CRM Project | Persist “last layout” per project; avoid re-fetching from CRM. |

---

## 8. Checklist Before Coding

- [ ] Confirm **Google Static Maps API** key (and enable Static Map API in Google Cloud).  
- [ ] Decide **Phase 1 vs Phase 2** for OpenCV (recommend Phase 1 without OpenCV).  
- [ ] Decide **sync vs async** for generate (recommend sync for Phase 1 with 60s timeout).  
- [ ] Add **panelWattage** to Project in Prisma (optional) or keep default 550 in API.  
- [ ] Ensure **generated_layouts** (or chosen dir) is writable and not committed to git; document in .gitignore.  
- [ ] Serve generated images (static route or GET) so PE frontend (and docx export) can load them (same-origin or CORS).

---

## 9. File Summary (Phase 1)

**Backend (src/):**
- `src/services/roof/roofImageFetcher.ts`
- `src/services/roof/roofDetector.ts` (fallback polygon only in Phase 1)
- `src/services/roof/panelLayoutEngine.ts`
- `src/services/roof/layoutRenderer.ts`
- `src/routes/roofLayout.ts`
- Mount in `server.ts`: `apiRouter.use('/proposal-engine/roof-layout', roofLayoutRoutes)`
- Static serve: `app.use('/generated_layouts', express.static(...))` (or equivalent)
- Env: `GOOGLE_MAPS_KEY`, `ROOF_LAYOUT_OUTPUT_DIR` (optional, default `generated_layouts`)

**Frontend (proposal-engine/frontend/):**
- `src/components/RoofLayoutGenerator.tsx` (or under `pages/`)
- `src/lib/apiClient.ts`: `generateRoofLayout`, optional `getRoofLayoutStatus`
- `ProposalPreview.tsx`: section “Proposed Rooftop Solar Layout” + image when available

**Worker (Phase 2):**
- `src/workers/roofLayoutWorker.ts`

---

If you confirm this plan (and Phase 1 scope: no OpenCV, sync API, rectangular fallback), the next step is to implement Phase 1 in the order: backend services → route → static serve → frontend component → proposal integration.
