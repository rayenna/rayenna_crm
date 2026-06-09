/**
 * Central save pipeline (Phase 3b).
 *
 * Merges artifact patches into customerStore, optionally syncs to CRM API.
 * Pages migrate here incrementally (3b-2+); default deps use production helpers.
 */
import type {
  BomArtifact,
  CostingArtifact,
  CustomerRecord,
  ProposalArtifact,
  RoiArtifact,
  RoofLayoutArtifact,
} from './customerStore';
import {
  deriveProposalStatusFromArtifacts,
  getCustomer,
  upsertCustomer,
} from './customerStore';
import {
  syncProjectBom,
  syncProjectCosting,
  syncProjectProposal,
  syncProjectRoi,
} from './api/proposalEngine';
import { markServerSynced } from './serverSyncStatus';

export type SaveArtifactKind = 'costing' | 'bom' | 'roi' | 'proposal' | 'roofLayout';

export type SaveArtifactsPatch = {
  costing?: CostingArtifact | null;
  bom?: BomArtifact | null;
  roi?: RoiArtifact | null;
  proposal?: ProposalArtifact | null;
  roofLayout?: RoofLayoutArtifact | null;
};

export type SavePipelineOptions = {
  /** Default true when master.crmProjectId is set. */
  syncToServer?: boolean;
  /** Mark 3a banner after all server writes succeed. Default false. */
  markServerSynced?: boolean;
  /** Only sync these kinds; default = keys present on patch. */
  syncKinds?: SaveArtifactKind[];
};

/** Pass as third arg when save should refresh the Dashboard “Up to date” banner (3b-6). */
export const PIPELINE_MARK_SYNCED: Pick<SavePipelineOptions, 'markServerSynced'> = {
  markServerSynced: true,
};

export type ServerSyncResult =
  | { kind: SaveArtifactKind; ok: true; skipped?: boolean }
  | { kind: SaveArtifactKind; ok: false; error: string };

export type SavePipelineResult = {
  ok: boolean;
  localRecord: CustomerRecord | null;
  serverResults: ServerSyncResult[];
  /** True when saved locally but master.crmProjectId is missing. */
  localOnly: boolean;
  userMessage?: string;
  errorMessage?: string;
};

export type RoofLayoutServerSyncFn = (
  crmProjectId: string,
  artifact: RoofLayoutArtifact,
) => Promise<void>;

export type SavePipelineDeps = {
  getCustomer: (id: string) => CustomerRecord | null;
  upsertCustomer: (record: CustomerRecord) => void;
  syncProjectCosting: (projectId: string, artifact: CostingArtifact) => Promise<void>;
  syncProjectBom: (projectId: string, artifact: BomArtifact) => Promise<void>;
  syncProjectRoi: (projectId: string, artifact: RoiArtifact) => Promise<void>;
  syncProjectProposal: (projectId: string, artifact: ProposalArtifact) => Promise<void>;
  /** Slice 3b-5 wires saveRoofLayoutForProposal; until then roofLayout sync fails if invoked. */
  syncRoofLayout?: RoofLayoutServerSyncFn;
  markServerSynced?: (recordId: string) => void;
};

export const LOCAL_ONLY_SAVE_MESSAGE =
  'Saved locally only — link this customer to a CRM project (Select Project) so data syncs across devices.';

export function serverSyncFailureMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : 'Server sync failed';
  return `Saved on this device, but could not sync to the server: ${msg}. Open the project again after fixing the API connection.`;
}

/** Merge patch into record (same null semantics as saveAllArtifacts). */
export function mergeSavePatch(record: CustomerRecord, patch: SaveArtifactsPatch): CustomerRecord {
  const nextCosting =
    'costing' in patch ? (patch.costing ?? record.costing) : record.costing;
  const nextBom = 'bom' in patch ? (patch.bom ?? record.bom) : record.bom;
  const nextRoi = 'roi' in patch ? (patch.roi ?? record.roi) : record.roi;
  const nextProposal =
    'proposal' in patch ? (patch.proposal ?? record.proposal) : record.proposal;
  const nextRoofLayout =
    'roofLayout' in patch ? (patch.roofLayout ?? record.roofLayout) : record.roofLayout;

  const merged: CustomerRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
    costing: nextCosting,
    bom: nextBom,
    roi: nextRoi,
    proposal: nextProposal,
    roofLayout: nextRoofLayout,
    status: deriveProposalStatusFromArtifacts({
      costing: nextCosting,
      bom: nextBom,
      roi: nextRoi,
      proposal: nextProposal,
    }),
  };
  return merged;
}

export function inferSyncKindsFromPatch(patch: SaveArtifactsPatch): SaveArtifactKind[] {
  const kinds: SaveArtifactKind[] = [];
  if ('costing' in patch) kinds.push('costing');
  if ('bom' in patch) kinds.push('bom');
  if ('roi' in patch) kinds.push('roi');
  if ('proposal' in patch) kinds.push('proposal');
  if ('roofLayout' in patch) kinds.push('roofLayout');
  return kinds;
}

export function defaultSavePipelineDeps(): SavePipelineDeps {
  return {
    getCustomer,
    upsertCustomer,
    syncProjectCosting,
    syncProjectBom,
    syncProjectRoi,
    syncProjectProposal,
    markServerSynced,
  };
}

async function syncKindToServer(
  kind: SaveArtifactKind,
  crmProjectId: string,
  record: CustomerRecord,
  deps: SavePipelineDeps,
): Promise<ServerSyncResult> {
  switch (kind) {
    case 'costing': {
      if (!record.costing) return { kind, ok: true, skipped: true };
      try {
        await deps.syncProjectCosting(crmProjectId, record.costing);
        return { kind, ok: true };
      } catch (err) {
        return { kind, ok: false, error: serverSyncFailureMessage(err) };
      }
    }
    case 'bom': {
      if (!record.bom) return { kind, ok: true, skipped: true };
      try {
        await deps.syncProjectBom(crmProjectId, record.bom);
        return { kind, ok: true };
      } catch (err) {
        return { kind, ok: false, error: serverSyncFailureMessage(err) };
      }
    }
    case 'roi': {
      if (!record.roi) return { kind, ok: true, skipped: true };
      try {
        await deps.syncProjectRoi(crmProjectId, record.roi);
        return { kind, ok: true };
      } catch (err) {
        return { kind, ok: false, error: serverSyncFailureMessage(err) };
      }
    }
    case 'proposal': {
      if (!record.proposal) return { kind, ok: true, skipped: true };
      try {
        await deps.syncProjectProposal(crmProjectId, record.proposal);
        return { kind, ok: true };
      } catch (err) {
        return { kind, ok: false, error: serverSyncFailureMessage(err) };
      }
    }
    case 'roofLayout': {
      if (!record.roofLayout) return { kind, ok: true, skipped: true };
      if (!deps.syncRoofLayout) {
        return {
          kind,
          ok: false,
          error:
            'Roof layout server sync requires capture — use saveRoofLayoutViaPipeline on the AI Roof Layout page.',
        };
      }
      try {
        await deps.syncRoofLayout(crmProjectId, record.roofLayout);
        return { kind, ok: true };
      } catch (err) {
        return { kind, ok: false, error: serverSyncFailureMessage(err) };
      }
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export async function saveProjectArtifacts(
  recordId: string,
  patch: SaveArtifactsPatch,
  options: SavePipelineOptions = {},
  deps: SavePipelineDeps = defaultSavePipelineDeps(),
): Promise<SavePipelineResult> {
  const record = deps.getCustomer(recordId);
  if (!record) {
    return {
      ok: false,
      localRecord: null,
      serverResults: [],
      localOnly: false,
      errorMessage: 'Customer record not found.',
    };
  }

  const merged = mergeSavePatch(record, patch);
  deps.upsertCustomer(merged);

  const crmProjectId = merged.master.crmProjectId?.trim();
  const shouldSync = options.syncToServer !== false && !!crmProjectId;

  if (!crmProjectId) {
    return {
      ok: true,
      localRecord: merged,
      serverResults: [],
      localOnly: true,
      userMessage: LOCAL_ONLY_SAVE_MESSAGE,
    };
  }

  if (!shouldSync) {
    return {
      ok: true,
      localRecord: merged,
      serverResults: [],
      localOnly: false,
    };
  }

  const kinds = options.syncKinds ?? inferSyncKindsFromPatch(patch);
  const serverResults: ServerSyncResult[] = [];

  for (const kind of kinds) {
    serverResults.push(await syncKindToServer(kind, crmProjectId, merged, deps));
  }

  const failures = serverResults.filter((r) => !r.ok);
  const allOk = failures.length === 0;

  if (allOk && options.markServerSynced && deps.markServerSynced) {
    deps.markServerSynced(recordId);
  }

  if (!allOk) {
    const firstError = failures.find((f) => !f.ok)?.error ?? 'Server sync failed';
    return {
      ok: false,
      localRecord: merged,
      serverResults,
      localOnly: false,
      errorMessage: firstError,
    };
  }

  return {
    ok: true,
    localRecord: merged,
    serverResults,
    localOnly: false,
  };
}
