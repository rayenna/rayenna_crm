import { describe, expect, it } from 'vitest';
import {
  artifactSummary,
  deriveProposalStatusFromArtifacts,
  hasSavedRoofLayout,
  normalizeProposalStatus,
  PE_ARTIFACT_COUNT,
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
