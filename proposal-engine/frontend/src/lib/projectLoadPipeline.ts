/**
 * Central load/hydrate pipeline (Phase 3b).
 *
 * Wraps fetchProjectWithArtifacts + applyProposalEngineProjectDetail + optional markServerSynced.
 * Pages migrate here in slice 3b-7.
 */
import type { CustomerRecord } from './customerStore';
import { getCustomer, switchActiveCustomer, upsertCustomer } from './customerStore';
import {
  applyProposalEngineProjectDetail,
  fetchProjectWithArtifacts,
  type ProposalEngineProjectDetailResponse,
} from './api/projectDetail';
import { markServerSynced } from './serverSyncStatus';

export type LoadPipelineOptions = {
  /** Call markServerSynced after successful merge. Default true. */
  markServerSynced?: boolean;
  /** Call switchActiveCustomer (sets active id + WIP restore). Default false. */
  activate?: boolean;
  /** Skip GET when detail was already fetched (e.g. Customers deep link). */
  preloadedDetail?: ProposalEngineProjectDetailResponse;
};

export type LoadPipelineResult = {
  ok: boolean;
  record: CustomerRecord | null;
  /** Local record returned when crmProjectId is missing (no network). */
  localOnly: boolean;
  errorMessage?: string;
};

export type LoadPipelineDeps = {
  getCustomer: (id: string) => CustomerRecord | null;
  upsertCustomer: (record: CustomerRecord) => void;
  switchActiveCustomer?: (id: string) => void;
  fetchProjectWithArtifacts: (projectId: string) => Promise<ProposalEngineProjectDetailResponse>;
  applyProposalEngineProjectDetail: (
    existing: CustomerRecord,
    detail: ProposalEngineProjectDetailResponse,
  ) => CustomerRecord;
  markServerSynced?: (recordId: string) => void;
};

export function defaultLoadPipelineDeps(): LoadPipelineDeps {
  return {
    getCustomer,
    upsertCustomer,
    switchActiveCustomer,
    fetchProjectWithArtifacts,
    applyProposalEngineProjectDetail,
    markServerSynced,
  };
}

export async function loadProjectFromServer(
  recordId: string,
  options: LoadPipelineOptions = {},
  deps: LoadPipelineDeps = defaultLoadPipelineDeps(),
): Promise<LoadPipelineResult> {
  const existing = deps.getCustomer(recordId);
  if (!existing) {
    return {
      ok: false,
      record: null,
      localOnly: false,
      errorMessage: 'Customer record not found.',
    };
  }

  const projectId = existing.master.crmProjectId?.trim();
  if (!projectId) {
    return {
      ok: true,
      record: existing,
      localOnly: true,
    };
  }

  try {
    const detail =
      options.preloadedDetail ?? (await deps.fetchProjectWithArtifacts(projectId));
    const latest = deps.getCustomer(recordId) ?? existing;
    const merged = deps.applyProposalEngineProjectDetail(latest, detail);
    deps.upsertCustomer(merged);

    if (options.activate === true && deps.switchActiveCustomer) {
      deps.switchActiveCustomer(merged.id);
    }

    const shouldMark = options.markServerSynced !== false;
    if (shouldMark && deps.markServerSynced) {
      deps.markServerSynced(recordId);
    }

    const out = deps.getCustomer(recordId) ?? merged;
    return {
      ok: true,
      record: out,
      localOnly: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load project from server';
    return {
      ok: false,
      record: existing,
      localOnly: false,
      errorMessage: msg,
    };
  }
}
