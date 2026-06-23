# Phase 3b — Central save pipeline

**Purpose:** One maintainable path for “save artifact locally + sync to CRM API” across Proposal Engine work pages.  
**Status:** **Phase 3b complete** (slices 3b-1 through 3b-7).  
**Next:** optional follow-ups (batch save endpoint deferred) or return to product backlog.  
**Prerequisite:** Phase 3a done (`ServerSyncBanner`, `fetchProjectWithArtifacts` hydrate).  
**Parent:** [MODERNIZATION_PROGRESS.md](./MODERNIZATION_PROGRESS.md)

---

## Goal

Replace scattered per-page “upsert `customerStore` → maybe call `syncProject*`” logic with a **single pipeline** that:

1. Updates the in-memory / `localStorage` record consistently  
2. Calls the correct server endpoint when `crmProjectId` is present  
3. Surfaces sync failures uniformly (toast + optional Sentry)  
4. Can mark server truth after successful save (extends 3a banner semantics)  
5. Keeps **WIP keys unchanged** — pipeline runs only on explicit Save actions  

**Non-goals:** merging `/api/roof/*` into `/api/proposal-engine/*`; changing debounce timing materially; auto-save WIP drafts.

---

## Current state (as built)

| Page / flow | Local persist | Server sync | Error handling |
|-------------|---------------|-------------|----------------|
| **CostingSheet** Save sheet | `upsertCustomer` (+ BOM artifact) | `await syncProjectCosting` + `syncProjectBom` | Toast on failure; blocks “success” UX |
| **BOMSheet** Save | `upsertCustomer` | `void syncProjectBom` | Silent (DEV console / Sentry only) |
| **ROICalculator** Save | `upsertCustomer` | `void syncProjectRoi` | Silent |
| **ProposalPreview** Save proposal | `saveAllArtifacts` | `void sync*` × up to 4 artifacts | Silent; re-syncs costing/BOM/ROI even if unchanged |
| **AIRoofLayout** Save to proposal | `upsertCustomer` (`roofLayout`) | `saveManualRoofLayoutImage` (+ optional 3D) via **`/api/roof/*`** | Inline error in page |
| **Hydrate** (Dashboard, Workspace, Customers) | `applyProposalEngineProjectDetail` | `GET /api/proposal-engine/projects/:id` | `markServerSynced` on success |

**Shared helpers today:**

- `lib/api/proposalEngine.ts` — `syncProjectCosting|Bom|Roi|Proposal` + `debounceSync` (600 ms) + `captureSyncError`  
- `lib/api/projectDetail.ts` — `fetchProjectWithArtifacts`, `mapApiArtifactsToRecord`, `applyProposalEngineProjectDetail`  
- `lib/roofLayout/roofLayoutSaveExport.ts` — `saveRoofLayoutForProposal` (capture + geometry + roof API)  
- `lib/serverSyncStatus.ts` — hydrate-only “Up to date” banner (3a)

---

## Problems to fix

1. **Inconsistent UX** — Costing warns on sync failure; BOM/ROI/Proposal often fail silently.  
2. **Duplicated orchestration** — Each page reimplements `if (crmProjectId) sync…` + status derivation.  
3. **Over-sync on proposal save** — ProposalPreview fires four debounced PUTs when only proposal metadata changed.  
4. **Two server namespaces** — Core artifacts use `/api/proposal-engine/...`; roof layout uses `/api/roof/...` (acceptable; pipeline should hide this).  
5. **Sync banner only on load** — Successful Save does not refresh “server truth” signal; user must reopen project to see 3a banner.  
6. **Testing gap** — No unit tests for cross-artifact save orchestration; regressions found manually.

---

## Target architecture

```text
Work page (Costing / BOM / ROI / Proposal / AI Roof)
        │
        ▼
  saveProjectArtifacts()          ← new: lib/projectSavePipeline.ts
        │
        ├─► validate + merge into CustomerRecord (customerStore helpers)
        ├─► deriveProposalStatusFromArtifacts
        ├─► upsertCustomer (localStorage cache)
        │
        └─► if crmProjectId:
              syncArtifactsToServer()  ← routes per kind; preserves debounceSync
                    ├─ costing  → PUT …/costing
                    ├─ bom      → PUT …/bom
                    ├─ roi      → PUT …/roi
                    ├─ proposal → PUT …/proposal
                    └─ roofLayout → POST …/roof/save-layout-image (+ 3D helpers)
        │
        ▼
  SavePipelineResult { localRecord, serverResults[], userMessage? }
        │
        └─► optional markServerSynced(recordId) on full success
```

**Companion (thin):** `loadProjectFromServer()` — wrap existing `fetchProjectWithArtifacts` + `applyProposalEngineProjectDetail` + `markServerSynced` (Dashboard/Workspace/Customers already duplicate this).

---

## Internal API (draft)

```typescript
/** Which artifacts to write in one user Save action. */
export type SaveArtifactKind = 'costing' | 'bom' | 'roi' | 'proposal' | 'roofLayout';

export type SaveArtifactsPatch = {
  costing?: CostingArtifact | null;
  bom?: BomArtifact | null;
  roi?: RoiArtifact | null;
  proposal?: ProposalArtifact | null;
  roofLayout?: RoofLayoutArtifact | null; // maps to record.roofLayout + server geometry
};

export type SavePipelineOptions = {
  /** Default true when crmProjectId set. */
  syncToServer?: boolean;
  /** Default true for explicit Save buttons. */
  showErrorToast?: boolean;
  /** Mark 3a banner after all server writes succeed. */
  markServerSynced?: boolean;
  /** Only sync these kinds (default: keys present in patch). */
  syncKinds?: SaveArtifactKind[];
};

export async function saveProjectArtifacts(
  recordId: string,
  patch: SaveArtifactsPatch,
  options?: SavePipelineOptions,
): Promise<SavePipelineResult>;
```

**Roof layout adapter:** `saveRoofLayoutForProposal` stays the implementation for capture/geometry; pipeline calls it and then merges the returned URLs/metrics into `CustomerRecord.roofLayout` — same as `AIRoofLayout` does today.

**Debounce:** Keep existing `debounceSync` inside `syncProject*` wrappers; pipeline must not double-debounce.

---

## Implementation slices (recommended order)

| Slice | Scope | Risk | Verify |
|-------|--------|------|--------|
| **3b-1** | Add `projectSavePipeline.ts` + `projectLoadPipeline.ts` + unit tests (mock apiFetch) | Low | ✅ Done Jun 2026 — no page changes yet |
| **3b-2** | Migrate **CostingSheet** | Low | ✅ Done Jun 2026 — `saveProjectArtifacts({ costing, bom })` |
| **3b-3** | Migrate **BOMSheet** + **ROICalculator** (visible sync errors via AlertCard) | Low | ✅ Done Jun 2026 |
| **3b-4** | Migrate **ProposalPreview** — proposal-only sync on Save; full sync on Generate | Medium | ✅ Done Jun 2026 |
| **3b-5** | Wire **AIRoofLayout** through `saveRoofLayoutViaPipeline` | Medium | ✅ Done Jun 2026 |
| **3b-6** | `markServerSynced` after successful pipeline save | Low | ✅ Done Jun 2026 — `PIPELINE_MARK_SYNCED`; Dashboard reads flag on navigate |
| **3b-7** | Deduplicate hydrate blocks → `loadProjectFromServer` | Low | ✅ Done Jun 2026 |

**Estimated effort:** 2–4 focused days (one slice per PR).

---

## Acceptance criteria

- [ ] No intentional product behaviour change (same endpoints, same payloads).  
- [ ] All explicit Save paths use `saveProjectArtifacts` (or documented exceptions).  
- [ ] Sync failure always surfaces a user-visible message when `crmProjectId` is set (match CostingSheet tone).  
- [ ] Projects **without** `crmProjectId` still save locally with clear “link to CRM project” copy.  
- [ ] Cross-device: save on machine A → open on machine B → artifacts match (SMOKE_CHECKLIST).  
- [ ] `npm test` + `npm run build` in `proposal-engine/frontend`.  
- [ ] PE-only git commits.

---

## Testing strategy

| Layer | What |
|-------|------|
| Unit | Pipeline merges patch, skips server when no `crmProjectId`, aggregates errors, `syncKinds` filter |
| Unit | Roof adapter mocked — geometry required in editing mode |
| Integration | Optional: one Vitest test with mocked `apiFetch` sequencing costing+bom |
| Manual | [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) — Costing→BOM→ROI, proposal save, AI roof, second browser |

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| ProposalPreview regression (large file) | Slice 3b-4 alone; keep `saveAllArtifacts` signature; diff network calls |
| debounceSync race when saving many artifacts | Preserve 600 ms debounce per key; pipeline awaits `Promise.all` only for kinds user saved |
| Roof capture async complexity | Do not inline capture into pipeline — delegate to `saveRoofLayoutForProposal` |
| Scope creep (backend batch endpoint) | Defer; frontend-only pipeline first |

---

## Resume prompt

*“Continue Phase 3b from `proposal-engine/docs/PHASE_3B_SAVE_PIPELINE.md` — start slice 3b-1 (pipeline module + tests).”*
