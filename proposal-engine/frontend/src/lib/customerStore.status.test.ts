import { describe, expect, it } from 'vitest';
import {
  artifactSummary,
  bomLineCount,
  costingLineCount,
  deriveProposalStatusFromArtifacts,
  hasSavedRoofLayout,
  normalizeProposalStatus,
  PE_ARTIFACT_COUNT,
  stripInactiveCustomerBlobs,
} from './customerStore';
import type { CustomerRecord } from './customerStore';

describe('deriveProposalStatusFromArtifacts', () => {
  const empty = { costing: null, bom: null, roi: null, proposal: null };

  it('returns not-started when no artifacts', () => {
    expect(deriveProposalStatusFromArtifacts(empty)).toBe('not-started');
  });

  it('returns draft when some artifacts exist', () => {
    expect(
      deriveProposalStatusFromArtifacts({ ...empty, costing: { items: [] } }),
    ).toBe('draft');
    expect(
      deriveProposalStatusFromArtifacts({ ...empty, bom: { rows: [] } }),
    ).toBe('draft');
  });

  it('returns proposal-ready when all four exist', () => {
    expect(
      deriveProposalStatusFromArtifacts({
        costing: {},
        bom: {},
        roi: {},
        proposal: {},
      }),
    ).toBe('proposal-ready');
  });
});

describe('artifactSummary', () => {
  const shell = {
    id: 'x',
    createdAt: '',
    updatedAt: '',
    status: 'draft' as const,
    master: { name: 'T' },
    costing: null,
    bom: null,
    roi: null,
    proposal: null,
    roofLayout: null,
  } satisfies CustomerRecord;

  it(`counts roof layout toward ${PE_ARTIFACT_COUNT} artifacts`, () => {
    const withRoof: CustomerRecord = {
      ...shell,
      roofLayout: {
        savedAt: '2026-01-01',
        roof_area_m2: 100,
        usable_area_m2: 80,
        panel_count: 10,
        layout_image_url: 'https://example.com/layout.jpg',
      },
    };
    expect(hasSavedRoofLayout(withRoof)).toBe(true);
    expect(artifactSummary(withRoof)).toBe('1 / 5 artifacts');
  });
});

describe('stripInactiveCustomerBlobs', () => {
  const fat: CustomerRecord = {
    id: 'keep-me',
    createdAt: '',
    updatedAt: '',
    status: 'draft',
    master: { name: 'A', location: '', contactPerson: '', phone: '', email: '' },
    costing: {
      sheetName: 'S',
      savedAt: '2026-01-01',
      items: [{ itemName: 'Panel' }] as CustomerRecord['costing'] extends { items: infer I } ? I : never,
      showGst: true,
      marginPercent: 10,
      grandTotal: 1,
      totalGst: 0,
      systemSizeKw: 5,
    },
    bom: {
      savedAt: '2026-01-01',
      rows: [{ itemName: 'Inv' }] as CustomerRecord['bom'] extends { rows: infer I } ? I : never,
    },
    roi: {
      savedAt: '2026-01-01',
      result: {
        inputs: {
          systemSizeKw: 5,
          tariff: 8.2,
          generationFactor: 1500,
          escalationPercent: 5,
          projectCost: 1,
        },
        annualGeneration: 1,
        annualSavings: 1,
        paybackYears: 4,
        totalSavings25Years: 10,
        roiPercent: 20,
        lcoe: 1,
        co2OffsetTons: 1,
        yearlyBreakdown: [
          {
            year: 1,
            generation: 1,
            tariffRate: 8.2,
            savings: 1,
            cumulativeSavings: 1,
            paybackReached: false,
          },
        ],
      },
    },
    proposal: {
      refNumber: 'R-1',
      generatedAt: '2026-01-01',
      summary: 'ok',
      editedHtml: '<p>x</p>',
      proposalView: { foo: 1 },
      customSectionsBeforeBoq: [{ id: 's', title: 'T', bodyHtml: '<img src="data:image/png;base64,xx">' }],
    },
    roofLayout: null,
  };

  it('keeps blobs on the active record and strips others', () => {
    const other: CustomerRecord = { ...fat, id: 'other' };
    const { records, changed } = stripInactiveCustomerBlobs([fat, other], new Set(['keep-me']));
    expect(changed).toBe(true);
    expect(records[0]?.costing?.items).toHaveLength(1);
    expect(records[0]?.proposal?.editedHtml).toBe('<p>x</p>');
    expect(records[1]?.costing?.items).toEqual([]);
    expect(records[1]?.costing?.itemCount).toBe(1);
    expect(records[1]?.bom?.rows).toEqual([]);
    expect(records[1]?.bom?.rowCount).toBe(1);
    expect(records[1]?.roi?.result.yearlyBreakdown).toEqual([]);
    expect(records[1]?.proposal?.editedHtml).toBeUndefined();
    expect(records[1]?.proposal?.proposalView).toBeUndefined();
    expect(records[1]?.proposal?.customSectionsBeforeBoq).toBeUndefined();
    expect(records[1]?.proposal?.refNumber).toBe('R-1');
  });

  it('reports no change when records are already slim', () => {
    const slim: CustomerRecord = {
      ...fat,
      costing: { ...fat.costing!, items: [], itemCount: 1 },
      bom: { savedAt: '2026-01-01', rows: [], rowCount: 1 },
      roi: { ...fat.roi!, result: { ...fat.roi!.result, yearlyBreakdown: [] } },
      proposal: { refNumber: 'R-1', generatedAt: '2026-01-01', summary: 'ok' },
    };
    const { changed } = stripInactiveCustomerBlobs([slim], new Set());
    expect(changed).toBe(false);
  });
});

describe('costingLineCount / bomLineCount', () => {
  it('falls back to stored counts when arrays were pruned', () => {
    expect(
      costingLineCount({
        sheetName: 'S',
        savedAt: '',
        items: [],
        itemCount: 12,
        showGst: true,
        marginPercent: 0,
        grandTotal: 0,
        totalGst: 0,
        systemSizeKw: 0,
      }),
    ).toBe(12);
    expect(bomLineCount({ savedAt: '', rows: [], rowCount: 7 })).toBe(7);
  });
});

describe('normalizeProposalStatus', () => {
  it('maps known API strings', () => {
    expect(normalizeProposalStatus('PE Draft')).toBe('draft');
    expect(normalizeProposalStatus('proposal-ready')).toBe('proposal-ready');
    expect(normalizeProposalStatus('not-yet-created')).toBe('not-started');
  });

  it('maps legacy sent/won/lost', () => {
    expect(normalizeProposalStatus('sent')).toBe('proposal-ready');
    expect(normalizeProposalStatus('won')).toBe('proposal-ready');
    expect(normalizeProposalStatus('lost')).toBe('draft');
  });

  it('defaults unknown to not-started', () => {
    expect(normalizeProposalStatus('random')).toBe('not-started');
    expect(normalizeProposalStatus(null)).toBe('not-started');
  });
});
