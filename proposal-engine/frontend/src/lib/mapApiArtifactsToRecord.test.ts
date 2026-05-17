import { describe, expect, it } from 'vitest';
import { mapApiArtifactsToRecord } from './apiClient';
import type { ProposalEngineProjectDetailResponse } from './apiClient';

function emptyArtifacts(): ProposalEngineProjectDetailResponse['artifacts'] {
  return { costing: null, bom: null, roi: null, proposal: null };
}

describe('mapApiArtifactsToRecord', () => {
  it('returns all null when API sends no artifacts', () => {
    expect(mapApiArtifactsToRecord(emptyArtifacts())).toEqual({
      costing: null,
      bom: null,
      roi: null,
      proposal: null,
    });
  });

  it('maps costing marginPct to marginPercent', () => {
    const out = mapApiArtifactsToRecord({
      ...emptyArtifacts(),
      costing: {
        sheetName: 'Main',
        items: [{ name: 'Panel' }],
        showGst: true,
        marginPct: 12.5,
        grandTotal: 100000,
        systemSizeKw: 5,
        savedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(out.costing?.marginPercent).toBe(12.5);
    expect(out.costing?.totalGst).toBe(0);
    expect(out.costing?.items).toHaveLength(1);
  });

  it('coerces non-array costing items to empty array', () => {
    const out = mapApiArtifactsToRecord({
      ...emptyArtifacts(),
      costing: {
        sheetName: 'X',
        items: 'not-an-array',
        showGst: false,
        marginPct: 0,
        grandTotal: 0,
        systemSizeKw: 0,
        savedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(out.costing?.items).toEqual([]);
  });

  it('maps proposal roof layout and includeRoofLayout flag', () => {
    const out = mapApiArtifactsToRecord({
      ...emptyArtifacts(),
      proposal: {
        refNumber: 'REY/2026/05/00001',
        generatedAt: '2026-05-01T12:00:00.000Z',
        summary: 'Test',
        includeRoofLayout: true,
        roofLayout: {
          roof_area_m2: 120,
          usable_area_m2: 100,
          panel_count: 10,
          layout_image_url: '/api/generated_layouts/p1_ai_layout.png',
          prefer_3d_for_proposal: false,
        },
        savedAt: '2026-05-01T12:00:00.000Z',
      },
    });
    expect(out.proposal?.includeRoofLayout).toBe(true);
    expect(out.proposal?.roofLayout?.panel_count).toBe(10);
  });

  it('normalizes proposal generatedAt Date to ISO string', () => {
    const d = new Date('2026-05-01T12:00:00.000Z');
    const out = mapApiArtifactsToRecord({
      ...emptyArtifacts(),
      proposal: {
        refNumber: 'R1',
        generatedAt: d as unknown as string,
        savedAt: '2026-05-01T00:00:00.000Z',
      },
    });
    expect(out.proposal?.generatedAt).toBe(d.toISOString());
  });
});
