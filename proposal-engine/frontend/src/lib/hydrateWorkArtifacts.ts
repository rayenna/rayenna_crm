/**
 * Open / Dashboard load a light project payload. Work pages pull full blobs
 * from the dedicated GET endpoints when local items/rows/HTML are empty.
 */
import type { CustomerRecord } from './customerStore';
import { deriveProposalStatusFromArtifacts, getCustomer, upsertCustomer } from './customerStore';
import {
  fetchProjectBomSheet,
  fetchProjectCostingSheet,
  fetchProjectProposalArtifact,
  fetchProjectRoiResult,
  mapApiArtifactsToRecord,
  mergeProposalArtifactPreservingDocumentFields,
  mergeProposalArtifactPreferringServerDocument,
} from './api/projectDetail';

function withStatus(record: CustomerRecord): CustomerRecord {
  return { ...record, status: deriveProposalStatusFromArtifacts(record) };
}

function persist(record: CustomerRecord): CustomerRecord {
  const next = withStatus(record);
  upsertCustomer(next);
  return getCustomer(next.id) ?? next;
}

export async function hydrateCostingIfNeeded(record: CustomerRecord): Promise<CustomerRecord> {
  const projectId = record.master.crmProjectId?.trim();
  if (!projectId) return record;
  if ((record.costing?.items?.length ?? 0) > 0) return record;
  const row = await fetchProjectCostingSheet(projectId);
  if (!row) return record;
  const costing = mapApiArtifactsToRecord({
    costing: row,
    bom: null,
    roi: null,
    proposal: null,
  }).costing;
  return persist({ ...record, costing });
}

export async function hydrateBomIfNeeded(record: CustomerRecord): Promise<CustomerRecord> {
  const projectId = record.master.crmProjectId?.trim();
  if (!projectId) return record;
  if ((record.bom?.rows?.length ?? 0) > 0) return record;
  const row = await fetchProjectBomSheet(projectId);
  if (!row) return record;
  const bom = mapApiArtifactsToRecord({
    costing: null,
    bom: row,
    roi: null,
    proposal: null,
  }).bom;
  return persist({ ...record, bom });
}

export async function hydrateRoiIfNeeded(record: CustomerRecord): Promise<CustomerRecord> {
  const projectId = record.master.crmProjectId?.trim();
  if (!projectId) return record;
  if ((record.roi?.result?.yearlyBreakdown?.length ?? 0) > 0) return record;
  const row = await fetchProjectRoiResult(projectId);
  if (!row) return record;
  const roi = mapApiArtifactsToRecord({
    costing: null,
    bom: null,
    roi: row,
    proposal: null,
  }).roi;
  return persist({ ...record, roi });
}

/** True when local proposal is a light stub (meta only) and needs GET /proposal. */
export function proposalNeedsFullHydrate(record: CustomerRecord): boolean {
  const p = record.proposal;
  if (!p?.refNumber?.trim()) return false;
  if (p.proposalView || p.editedHtml) return false;
  if (p.textOverrides && Object.keys(p.textOverrides).length > 0) return false;
  if ((p.customSectionsBeforeBoq?.length ?? 0) > 0) return false;
  if (p.bomComments && Object.keys(p.bomComments).length > 0) return false;
  return true;
}

/**
 * Pull the full proposal artifact from the server.
 * @param force When true (Proposal page open), always GET /proposal so Dashboard
 *   light reloads cannot leave us on a stub that skipped hydrate because proposalView existed.
 * @param skipPersistIf When true after the GET returns (e.g. user Saved mid-flight),
 *   do not write the response into the store — return the latest local record instead.
 */
export async function hydrateProposalIfNeeded(
  record: CustomerRecord,
  options?: { force?: boolean; skipPersistIf?: () => boolean },
): Promise<CustomerRecord> {
  const projectId = record.master.crmProjectId?.trim();
  if (!projectId) return record;
  if (!options?.force && !proposalNeedsFullHydrate(record)) return record;
  const row = await fetchProjectProposalArtifact(projectId);
  if (!row) return record;
  // Save may have completed while we awaited — never clobber that with this GET.
  if (options?.skipPersistIf?.()) {
    return getCustomer(record.id) ?? record;
  }
  const fromServer = mapApiArtifactsToRecord({
    costing: null,
    bom: null,
    roi: null,
    proposal: row,
  }).proposal;
  if (!fromServer) return record;
  // Re-read after await: local Edit→Save may have upserted a newer proposal blob.
  const latest = getCustomer(record.id) ?? record;
  if (options?.skipPersistIf?.()) {
    return latest;
  }
  // Force open (Proposal page): server document is authoritative (cross-device).
  // Save-in-flight races are handled by skipPersistIf above — do not local-win here
  // or a stale localStorage blob will hide a successful PUT forever.
  const proposal = options?.force
    ? mergeProposalArtifactPreferringServerDocument(latest.proposal, fromServer)
    : mergeProposalArtifactPreservingDocumentFields(latest.proposal, fromServer);
  return persist({ ...latest, proposal });
}

/**
 * Project detail returns light costing/BOM (counts only). Pre-flight and exports
 * need full line items — pull them before checking for "missing" artifacts.
 */
export async function hydrateArtifactsForPreflight(
  record: CustomerRecord,
): Promise<CustomerRecord> {
  let next = record;
  next = await hydrateCostingIfNeeded(next);
  next = await hydrateBomIfNeeded(next);
  next = await hydrateRoiIfNeeded(next);
  return next;
}
