import { describe, expect, it } from 'vitest';
import {
  deriveProposalStatusFromArtifacts,
  normalizeProposalStatus,
} from './customerStore';

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
