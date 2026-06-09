import { describe, expect, it, vi } from 'vitest';
import type { CustomerRecord } from './customerStore';
import type { ProposalEngineProjectDetailResponse } from './api/projectDetail';
import { loadProjectFromServer, type LoadPipelineDeps } from './projectLoadPipeline';

function makeRecord(overrides: Partial<CustomerRecord> = {}): CustomerRecord {
  return {
    id: 'rec-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    master: {
      name: 'Local',
      location: 'Kochi',
      contactPerson: '',
      phone: '',
      email: '',
      crmProjectId: 'crm-proj-1',
    },
    costing: null,
    bom: null,
    roi: null,
    roofLayout: null,
    proposal: null,
    ...overrides,
  };
}

const apiDetail: ProposalEngineProjectDetailResponse = {
  project: {
    id: 'crm-proj-1',
    systemCapacity: 6,
    customer: { id: 'cust-1', customerName: 'Server Name' },
  } as ProposalEngineProjectDetailResponse['project'],
  artifacts: {
    costing: null,
    bom: null,
    roi: null,
    proposal: null,
  },
};

function makeDeps(record: CustomerRecord, overrides: Partial<LoadPipelineDeps> = {}): LoadPipelineDeps {
  let stored = record;
  const upsert = vi.fn((r: CustomerRecord) => {
    stored = r;
  });
  return {
    getCustomer: () => stored,
    upsertCustomer: upsert,
    switchActiveCustomer: vi.fn(),
    fetchProjectWithArtifacts: vi.fn().mockResolvedValue(apiDetail),
    applyProposalEngineProjectDetail: (existing, detail) => ({
      ...existing,
      master: { ...existing.master, name: detail.project.customer?.customerName ?? existing.master.name },
      updatedAt: new Date().toISOString(),
    }),
    markServerSynced: vi.fn(),
    ...overrides,
  };
}

describe('loadProjectFromServer', () => {
  it('returns error when record is missing', async () => {
    const deps = makeDeps(makeRecord(), { getCustomer: () => null });
    const result = await loadProjectFromServer('rec-1', {}, deps);
    expect(result.ok).toBe(false);
    expect(result.record).toBeNull();
  });

  it('returns local record when crmProjectId is missing', async () => {
    const local = makeRecord({ master: { ...makeRecord().master, crmProjectId: undefined } });
    const deps = makeDeps(local);
    const result = await loadProjectFromServer('rec-1', {}, deps);
    expect(result.ok).toBe(true);
    expect(result.localOnly).toBe(true);
    expect(deps.fetchProjectWithArtifacts).not.toHaveBeenCalled();
  });

  it('fetches, merges, upserts, and marks server synced', async () => {
    const deps = makeDeps(makeRecord());
    const result = await loadProjectFromServer('rec-1', {}, deps);
    expect(result.ok).toBe(true);
    expect(result.localOnly).toBe(false);
    expect(deps.fetchProjectWithArtifacts).toHaveBeenCalledWith('crm-proj-1');
    expect(deps.upsertCustomer).toHaveBeenCalled();
    expect(deps.markServerSynced).toHaveBeenCalledWith('rec-1');
    expect(result.record?.master.name).toBe('Server Name');
  });

  it('calls switchActiveCustomer when activate is true', async () => {
    const deps = makeDeps(makeRecord());
    await loadProjectFromServer('rec-1', { activate: true }, deps);
    expect(deps.switchActiveCustomer).toHaveBeenCalledWith('rec-1');
  });

  it('does not call switchActiveCustomer by default', async () => {
    const deps = makeDeps(makeRecord());
    await loadProjectFromServer('rec-1', {}, deps);
    expect(deps.switchActiveCustomer).not.toHaveBeenCalled();
  });

  it('uses preloadedDetail without calling fetch again', async () => {
    const fetch = vi.fn();
    const deps = makeDeps(makeRecord(), {
      fetchProjectWithArtifacts: fetch,
    });
    const preloaded: ProposalEngineProjectDetailResponse = {
      project: {
        id: 'crm-proj-1',
        customer: { id: 'cust-1', customerName: 'Preloaded' },
      } as ProposalEngineProjectDetailResponse['project'],
      artifacts: { costing: null, bom: null, roi: null, proposal: null },
    };
    const result = await loadProjectFromServer('rec-1', { preloadedDetail: preloaded }, deps);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.record?.master.name).toBe('Preloaded');
  });

  it('returns existing record on fetch failure', async () => {
    const local = makeRecord();
    const deps = makeDeps(local, {
      fetchProjectWithArtifacts: vi.fn().mockRejectedValue(new Error('timeout')),
    });
    const result = await loadProjectFromServer('rec-1', {}, deps);
    expect(result.ok).toBe(false);
    expect(result.record).toEqual(local);
    expect(result.errorMessage).toContain('timeout');
  });
});
