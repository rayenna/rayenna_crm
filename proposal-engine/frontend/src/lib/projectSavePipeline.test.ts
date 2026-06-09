import { describe, expect, it, vi } from 'vitest';
import type { CustomerRecord } from './customerStore';
import {
  inferSyncKindsFromPatch,
  mergeSavePatch,
  saveProjectArtifacts,
  LOCAL_ONLY_SAVE_MESSAGE,
  type SavePipelineDeps,
} from './projectSavePipeline';

function makeRecord(overrides: Partial<CustomerRecord> = {}): CustomerRecord {
  return {
    id: 'rec-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'not-started',
    master: {
      name: 'Test Co',
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

function makeDeps(
  record: CustomerRecord,
  overrides: Partial<SavePipelineDeps> = {},
): SavePipelineDeps {
  let stored = record;
  return {
    getCustomer: () => stored,
    upsertCustomer: (r) => {
      stored = r;
    },
    syncProjectCosting: vi.fn().mockResolvedValue(undefined),
    syncProjectBom: vi.fn().mockResolvedValue(undefined),
    syncProjectRoi: vi.fn().mockResolvedValue(undefined),
    syncProjectProposal: vi.fn().mockResolvedValue(undefined),
    markServerSynced: vi.fn(),
    ...overrides,
  };
}

describe('mergeSavePatch', () => {
  it('sets artifacts present in patch', () => {
    const base = makeRecord();
    const costing = {
      sheetName: 'Main',
      savedAt: '2026-06-01T00:00:00.000Z',
      items: [],
      showGst: true,
      marginPercent: 10,
      grandTotal: 100,
      totalGst: 0,
      systemSizeKw: 5,
    };
    const merged = mergeSavePatch(base, { costing });
    expect(merged.costing).toEqual(costing);
    expect(merged.status).toBe('draft');
  });

  it('keeps existing artifact when patch value is null (saveAllArtifacts semantics)', () => {
    const existingCosting = {
      sheetName: 'Keep',
      savedAt: '2026-01-01T00:00:00.000Z',
      items: [],
      showGst: false,
      marginPercent: 0,
      grandTotal: 0,
      totalGst: 0,
      systemSizeKw: 3,
    };
    const base = makeRecord({ costing: existingCosting });
    const merged = mergeSavePatch(base, { costing: null });
    expect(merged.costing).toEqual(existingCosting);
  });

  it('does not change fields omitted from patch', () => {
    const bom = { savedAt: '2026-06-01T00:00:00.000Z', rows: [] };
    const base = makeRecord({ bom });
    const merged = mergeSavePatch(base, {
      costing: {
        sheetName: 'X',
        savedAt: '2026-06-01T00:00:00.000Z',
        items: [],
        showGst: true,
        marginPercent: 0,
        grandTotal: 0,
        totalGst: 0,
        systemSizeKw: 1,
      },
    });
    expect(merged.bom).toEqual(bom);
  });
});

describe('inferSyncKindsFromPatch', () => {
  it('returns only keys present on patch', () => {
    expect(inferSyncKindsFromPatch({ bom: { savedAt: '', rows: [] } })).toEqual(['bom']);
    expect(
      inferSyncKindsFromPatch({
        costing: null,
        bom: { savedAt: '', rows: [] },
      }),
    ).toEqual(['costing', 'bom']);
  });
});

describe('saveProjectArtifacts', () => {
  it('returns error when record is missing', async () => {
    const deps = makeDeps(makeRecord(), {
      getCustomer: () => null,
    });
    const result = await saveProjectArtifacts('missing', { bom: { savedAt: '', rows: [] } }, {}, deps);
    expect(result.ok).toBe(false);
    expect(result.localRecord).toBeNull();
  });

  it('saves locally only when crmProjectId is missing', async () => {
    const base = makeRecord({ master: { ...makeRecord().master, crmProjectId: undefined } });
    const deps = makeDeps(base);
    const bom = { savedAt: '2026-06-01T00:00:00.000Z', rows: [] };
    const result = await saveProjectArtifacts('rec-1', { bom }, {}, deps);
    expect(result.ok).toBe(true);
    expect(result.localOnly).toBe(true);
    expect(result.userMessage).toBe(LOCAL_ONLY_SAVE_MESSAGE);
    expect(deps.syncProjectBom).not.toHaveBeenCalled();
    expect(result.localRecord?.bom).toEqual(bom);
  });

  it('syncs kinds inferred from patch', async () => {
    const base = makeRecord();
    const deps = makeDeps(base);
    const costing = {
      sheetName: 'S',
      savedAt: '2026-06-01T00:00:00.000Z',
      items: [],
      showGst: true,
      marginPercent: 5,
      grandTotal: 50,
      totalGst: 0,
      systemSizeKw: 2,
    };
    const bom = { savedAt: '2026-06-01T00:00:00.000Z', rows: [] };

    const result = await saveProjectArtifacts('rec-1', { costing, bom }, {}, deps);

    expect(result.ok).toBe(true);
    expect(deps.syncProjectCosting).toHaveBeenCalledWith('crm-proj-1', costing);
    expect(deps.syncProjectBom).toHaveBeenCalledWith('crm-proj-1', bom);
    expect(deps.syncProjectRoi).not.toHaveBeenCalled();
  });

  it('respects syncKinds filter', async () => {
    const base = makeRecord();
    const deps = makeDeps(base);
    const costing = {
      sheetName: 'S',
      savedAt: '2026-06-01T00:00:00.000Z',
      items: [],
      showGst: true,
      marginPercent: 5,
      grandTotal: 50,
      totalGst: 0,
      systemSizeKw: 2,
    };
    const bom = { savedAt: '2026-06-01T00:00:00.000Z', rows: [] };

    await saveProjectArtifacts(
      'rec-1',
      { costing, bom },
      { syncKinds: ['bom'] },
      deps,
    );

    expect(deps.syncProjectCosting).not.toHaveBeenCalled();
    expect(deps.syncProjectBom).toHaveBeenCalledOnce();
  });

  it('skips server sync when syncToServer is false', async () => {
    const deps = makeDeps(makeRecord());
    await saveProjectArtifacts(
      'rec-1',
      { bom: { savedAt: '', rows: [] } },
      { syncToServer: false },
      deps,
    );
    expect(deps.syncProjectBom).not.toHaveBeenCalled();
  });

  it('aggregates server failure', async () => {
    const deps = makeDeps(makeRecord(), {
      syncProjectBom: vi.fn().mockRejectedValue(new Error('Network down')),
    });
    const result = await saveProjectArtifacts(
      'rec-1',
      { bom: { savedAt: '', rows: [] } },
      {},
      deps,
    );
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain('Network down');
    expect(result.localRecord?.bom).toBeTruthy();
  });

  it('marks server synced when requested and all syncs succeed', async () => {
    const mark = vi.fn();
    const deps = makeDeps(makeRecord(), { markServerSynced: mark });
    await saveProjectArtifacts(
      'rec-1',
      { bom: { savedAt: '', rows: [] } },
      { markServerSynced: true },
      deps,
    );
    expect(mark).toHaveBeenCalledWith('rec-1');
  });

  it('does not mark server synced when a sync fails', async () => {
    const mark = vi.fn();
    const deps = makeDeps(makeRecord(), {
      markServerSynced: mark,
      syncProjectBom: vi.fn().mockRejectedValue(new Error('fail')),
    });
    await saveProjectArtifacts(
      'rec-1',
      { bom: { savedAt: '', rows: [] } },
      { markServerSynced: true },
      deps,
    );
    expect(mark).not.toHaveBeenCalled();
  });

  it('reports error when roofLayout sync requested without adapter', async () => {
    const deps = makeDeps(makeRecord(), {
      syncRoofLayout: undefined,
    });
    const result = await saveProjectArtifacts(
      'rec-1',
      {
        roofLayout: {
          savedAt: '2026-06-01T00:00:00.000Z',
          roof_area_m2: 100,
          usable_area_m2: 80,
          panel_count: 10,
          layout_image_url: '/layout.jpg',
        },
      },
      {},
      deps,
    );
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain('saveRoofLayoutViaPipeline');
  });
});
