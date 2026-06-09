import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CustomerRecord } from './customerStore';
import {
  mergeRoofLayoutIntoCustomerRecord,
} from './roofLayout/roofLayoutCustomerSync';
import {
  persistRoofLayoutPatch,
  roofLayoutArtifactFromSave,
  saveRoofLayoutViaPipeline,
} from './projectSaveRoofLayout';

vi.mock('./roofLayout/roofLayoutSaveExport', () => ({
  saveRoofLayoutForProposal: vi.fn(),
}));

import { saveRoofLayoutForProposal } from './roofLayout/roofLayoutSaveExport';

function makeRecord(overrides: Partial<CustomerRecord> = {}): CustomerRecord {
  return {
    id: 'rec-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    master: {
      name: 'Test',
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

const stores = vi.hoisted(() => {
  let record: CustomerRecord | null = null;
  return {
    get: () => record,
    set: (r: CustomerRecord | null) => {
      record = r;
    },
  };
});

vi.mock('./customerStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./customerStore')>();
  return {
    ...actual,
    getCustomer: (id: string) => (stores.get()?.id === id ? stores.get() : null),
    upsertCustomer: (r: CustomerRecord) => {
      stores.set(r);
    },
    getActiveCustomer: () => stores.get(),
  };
});

describe('mergeRoofLayoutIntoCustomerRecord', () => {
  it('sets roofLayout on record', () => {
    const base = makeRecord();
    const artifact = {
      savedAt: '2026-06-01T00:00:00.000Z',
      roof_area_m2: 120,
      usable_area_m2: 100,
      panel_count: 20,
      layout_image_url: '/layout.jpg',
    };
    const merged = mergeRoofLayoutIntoCustomerRecord(base, artifact);
    expect(merged.roofLayout).toEqual(artifact);
  });

  it('mirrors into proposal when includeRoofLayout is true', () => {
    const base = makeRecord({
      proposal: {
        refNumber: 'R1',
        generatedAt: '2026-01-01T00:00:00.000Z',
        summary: '',
        includeRoofLayout: true,
        roofLayout: null,
      },
    });
    const artifact = {
      savedAt: '2026-06-01T00:00:00.000Z',
      roof_area_m2: 120,
      usable_area_m2: 100,
      panel_count: 20,
      layout_image_url: '/layout.jpg',
    };
    const merged = mergeRoofLayoutIntoCustomerRecord(base, artifact);
    expect(merged.proposal?.roofLayout?.panel_count).toBe(20);
  });
});

describe('roofLayoutArtifactFromSave', () => {
  it('prefers saved metrics over previous result', () => {
    const artifact = roofLayoutArtifactFromSave(
      {
        ok: true,
        layout_image_url: '/new.jpg',
        prefer_3d_for_proposal: false,
        metrics: { panel_count: 15, roof_area_m2: 90, usable_area_m2: 70 },
      },
      {
        crmProjectId: 'crm-proj-1',
        layoutMode: 'editing',
        captureRefs: {} as never,
        stageRef: { current: null },
        solar3dRef: { current: null },
        result: { panel_count: 10, roof_area_m2: 50, usable_area_m2: 40, layout_image_url: '/old.jpg' },
        facets: [],
        activePolygon: null,
        allPanelsFlat: [],
        imageSize: { width: 100, height: 100 },
        keepouts: [],
        panelOrientation: 'portrait',
        panelSpacingMultiplier: 1,
        effectiveWattage: 550,
        resolvedModule: { widthM: 1.1, heightM: 2.2, source: 'default' },
        metersPerPixel: 0.05,
        roofViewTab: '2d',
        proposalImageSource: '2d',
        last3dPngDataUrl: null,
      },
      '2026-06-01T00:00:00.000Z',
    );
    expect(artifact.panel_count).toBe(15);
    expect(artifact.layout_image_url).toBe('/new.jpg');
  });
});

describe('saveRoofLayoutViaPipeline', () => {
  beforeEach(() => {
    stores.set(makeRecord());
    vi.mocked(saveRoofLayoutForProposal).mockReset();
  });

  it('returns server error without merging local record', async () => {
    vi.mocked(saveRoofLayoutForProposal).mockResolvedValue({
      ok: false,
      error: 'Geometry required',
    });
    const result = await saveRoofLayoutViaPipeline('rec-1', {} as never);
    expect(result.ok).toBe(false);
    expect(stores.get()?.roofLayout).toBeNull();
  });

  it('merges artifact after successful server save', async () => {
    vi.mocked(saveRoofLayoutForProposal).mockResolvedValue({
      ok: true,
      layout_image_url: '/saved.jpg',
      prefer_3d_for_proposal: false,
      metrics: { panel_count: 12, roof_area_m2: 80, usable_area_m2: 60 },
    });
    const result = await saveRoofLayoutViaPipeline('rec-1', {
      crmProjectId: 'crm-proj-1',
      result: null,
    } as never);
    expect(result.ok).toBe(true);
    expect(stores.get()?.roofLayout?.layout_image_url).toBe('/saved.jpg');
    expect(stores.get()?.roofLayout?.panel_count).toBe(12);
  });
});

describe('persistRoofLayoutPatch', () => {
  beforeEach(() => {
    stores.set(makeRecord());
    vi.mocked(saveRoofLayoutForProposal).mockClear();
  });

  it('updates local record without server call', () => {
    const merged = persistRoofLayoutPatch('rec-1', {
      roof_area_m2: 50,
      usable_area_m2: 40,
      panel_count: 8,
      layout_image_url: '/local.jpg',
    });
    expect(merged?.roofLayout?.panel_count).toBe(8);
    expect(saveRoofLayoutForProposal).not.toHaveBeenCalled();
  });
});
