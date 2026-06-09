/**
 * Phase 3b roof layout save adapter.
 *
 * Server capture + geometry via saveRoofLayoutForProposal (/api/roof/*).
 * Local customer record merge via mergeRoofLayoutIntoCustomerRecord.
 */
import type { CustomerRecord, RoofLayoutArtifact } from './customerStore';
import { getCustomer, upsertCustomer } from './customerStore';
import { markServerSynced } from './serverSyncStatus';
import {
  saveRoofLayoutForProposal,
  type SaveRoofLayoutForProposalParams,
  type SaveRoofLayoutForProposalResult,
} from './roofLayout/roofLayoutSaveExport';
import { mergeRoofLayoutIntoCustomerRecord } from './roofLayout/roofLayoutCustomerSync';

export type SaveRoofLayoutPipelineOptions = {
  savedAt?: string;
  /** Default true — successful roof save always hits the server. Set false to skip banner. */
  markServerSynced?: boolean;
};

export type SaveRoofLayoutPipelineResult =
  | { ok: false; error: string }
  | (Extract<SaveRoofLayoutForProposalResult, { ok: true }> & {
      localRecord: CustomerRecord;
    });

export function roofLayoutArtifactFromSave(
  saved: Extract<SaveRoofLayoutForProposalResult, { ok: true }>,
  params: SaveRoofLayoutForProposalParams,
  savedAt: string,
): RoofLayoutArtifact {
  const m = saved.metrics;
  const prev = params.result;
  return {
    savedAt,
    roof_area_m2: m.roof_area_m2 ?? prev?.roof_area_m2 ?? 0,
    usable_area_m2: m.usable_area_m2 ?? prev?.usable_area_m2 ?? 0,
    panel_count: m.panel_count ?? prev?.panel_count ?? 0,
    layout_image_url: saved.layout_image_url,
    ...(saved.layout_image_3d_url != null && saved.layout_image_3d_url.trim()
      ? { layout_image_3d_url: saved.layout_image_3d_url }
      : {}),
    prefer_3d_for_proposal: saved.prefer_3d_for_proposal,
  };
}

/** Local-only merge (hydrate, 3D export metadata) — no server call. */
export function persistRoofLayoutPatch(
  recordId: string,
  params: Omit<RoofLayoutArtifact, 'savedAt'> & { savedAt?: string },
): CustomerRecord | null {
  const record = getCustomer(recordId);
  if (!record) return null;
  const artifact: RoofLayoutArtifact = {
    savedAt: params.savedAt ?? new Date().toISOString(),
    roof_area_m2: Number(params.roof_area_m2),
    usable_area_m2: Number(params.usable_area_m2),
    panel_count: Number(params.panel_count),
    layout_image_url: String(params.layout_image_url),
    ...(params.layout_image_3d_url != null && String(params.layout_image_3d_url).trim()
      ? { layout_image_3d_url: String(params.layout_image_3d_url) }
      : {}),
    ...(typeof params.prefer_3d_for_proposal === 'boolean'
      ? { prefer_3d_for_proposal: params.prefer_3d_for_proposal }
      : {}),
  };
  const merged = mergeRoofLayoutIntoCustomerRecord(record, artifact);
  upsertCustomer(merged);
  return merged;
}

/**
 * Save roof layout to server (capture + geometry) and merge into customerStore.
 * Replaces direct saveRoofLayoutForProposal + persistRoofLayoutToActiveCustomer on Save to Proposal.
 */
export async function saveRoofLayoutViaPipeline(
  recordId: string,
  params: SaveRoofLayoutForProposalParams,
  options: SaveRoofLayoutPipelineOptions = {},
): Promise<SaveRoofLayoutPipelineResult> {
  const saved = await saveRoofLayoutForProposal(params);
  if (!saved.ok) {
    return saved;
  }

  const record = getCustomer(recordId);
  if (!record) {
    return { ok: false, error: 'Customer record not found.' };
  }

  const savedAt = options.savedAt ?? new Date().toISOString();
  const artifact = roofLayoutArtifactFromSave(saved, params, savedAt);
  const merged = mergeRoofLayoutIntoCustomerRecord(record, artifact);
  upsertCustomer(merged);

  if (options.markServerSynced !== false) {
    markServerSynced(recordId);
  }

  return { ...saved, localRecord: merged };
}
