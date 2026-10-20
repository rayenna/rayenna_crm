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

export async function hydrateProposalIfNeeded(record: CustomerRecord): Promise<CustomerRecord> {
  const projectId = record.master.crmProjectId?.trim();
  if (!projectId) return record;
  if (record.proposal?.proposalView || record.proposal?.editedHtml) return record;
  const row = await fetchProjectProposalArtifact(projectId);
  if (!row) return record;
  const proposal = mapApiArtifactsToRecord({
    costing: null,
    bom: null,
    roi: null,
    proposal: row,
  }).proposal;
  return persist({ ...record, proposal });
}
