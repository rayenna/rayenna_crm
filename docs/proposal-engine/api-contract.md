# Proposal Engine — API contract (PE frontend ↔ CRM API)

**Base URL:** `{VITE_API_BASE_URL}` in production, or `/api` via Vite proxy locally.  
**Auth:** `Authorization: Bearer <pe_jwt>` on all routes except public share.  
**Implementation:** `src/routes/proposalEngine.ts`, `src/routes/roofLayout.ts`.

This document describes shapes the PE UI depends on. When changing the API, update `apiClient.ts` and the Vitest tests under `frontend/src/lib/*.test.ts`.

---

## `GET /api/proposal-engine/projects/:id`

**Response:**

```json
{
  "project": { "id": "...", "systemCapacity": 5, "customer": { "latitude": 12.97, ... }, ... },
  "artifacts": {
    "costing": { "sheetName", "items", "showGst", "marginPct", "grandTotal", "systemSizeKw", "savedAt" } | null,
    "bom": { "rows", "savedAt" } | null,
    "roi": { "result", "savedAt" } | null,
    "proposal": {
      "refNumber", "generatedAt", "summary", "bomComments", "editedHtml",
      "textOverrides", "customSectionsBeforeBoq", "proposalView",
      "includeRoofLayout", "roofLayout", "savedAt"
    } | null
  }
}
```

Frontend mapping: `mapApiArtifactsToRecord()` — `marginPct` → `marginPercent`, non-array `items` → `[]`.

---

## Artifact sync (PUT)

All require project write access (sales assigned, or Admin). Successful writes clear `pe_removed_projects` for that project.

### `PUT /api/proposal-engine/projects/:id/costing`

| Field | Type | Required |
|-------|------|----------|
| `sheetName` | string | yes |
| `items` | array | yes (max rows enforced server-side) |
| `grandTotal` | number | yes |
| `showGst` | boolean | optional |
| `marginPct` | number | optional |
| `systemSizeKw` | number | optional |

**Errors:** `413` + `code: COSTING_TOO_LARGE` when row count exceeds limit.

### `PUT /api/proposal-engine/projects/:id/bom`

| Field | Type | Required |
|-------|------|----------|
| `rows` | array | yes |

### `PUT /api/proposal-engine/projects/:id/roi`

| Field | Type | Required |
|-------|------|----------|
| `result` | object | yes (ROI calculator output) |

### `PUT /api/proposal-engine/projects/:id/proposal`

| Field | Type | Required |
|-------|------|----------|
| `refNumber` | string | yes |
| `generatedAt` | ISO string | yes |
| `summary` | string | optional |
| `bomComments` | object | optional |
| `editedHtml` | string | optional |
| `textOverrides` | object | optional |
| `customSectionsBeforeBoq` | array | optional |
| `proposalView` | object | optional |
| `includeRoofLayout` | boolean | optional |

Persists to `pe_proposals` (latest row per project).

---

## Roof layout (`/api/roof`)

### `POST /api/roof/ai-layout`

**Body:** `{ projectId, latitude, longitude, systemSizeKw, panelWattage }`

**Response:**

```json
{
  "roof_area_m2": 0,
  "usable_area_m2": 0,
  "panel_count": 0,
  "layout_image_url": "/api/generated_layouts/{id}_ai_layout.png",
  "satellite_image_url": "/api/generated_layouts/{id}_satellite.png",
  "resolved_latitude": 0,
  "resolved_longitude": 0,
  "roof_polygon_coordinates": [{ "x", "y" }]
}
```

Regenerate clears `geometryJson` on `project_roof_layouts`.

### `POST /api/roof/save-layout-image`

**Body:** `{ projectId, dataUrl, roof_area_m2?, usable_area_m2?, panel_count?, geometry? }`

`geometry` must pass `parseRoofLayoutGeometry` (version `1`, ≥3 roof points). Stored in `project_roof_layouts.geometryJson`.

### `GET /api/roof/manual-layout/:projectId`

Returns DB row or legacy JSON file; includes `geometry`, `roof_polygon_coordinates`, `panel_coordinates` when geometry exists.

---

## Public share

### `POST /api/proposal-engine/share`

Authenticated. Creates `pe_shared_proposals` token (+ optional password).

### `GET /api/proposal-engine/share/:token`

No auth. Query `?password=` when required. Returns `{ html, refNumber }` for `SharedProposalViewer`.

---

## Access control (summary)

| Role | View | Edit artifacts |
|------|------|----------------|
| Sales | Assigned project/customer | Assigned only |
| Operations, Management, Finance | All | Read-only |
| Admin | All | All (+ delete PE project / clear list) |

Exact messages: `PE_ACCESS_DENIED_*` in `proposalEngine.ts`.

---

## Related

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md)
