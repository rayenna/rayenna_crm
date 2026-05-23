import { describe, expect, it } from 'vitest';
import { hasValidMapCoordinates, mapApiProjectToProjectOption } from './customerHelpers';
import type { ProposalEngineProjectFromApi } from '../lib/apiClient';

describe('hasValidMapCoordinates', () => {
  it('accepts valid India-ish coordinates', () => {
    expect(hasValidMapCoordinates(12.97, 77.59)).toBe(true);
  });

  it('rejects null, NaN, and 0,0', () => {
    expect(hasValidMapCoordinates(null, 77)).toBe(false);
    expect(hasValidMapCoordinates(12, NaN)).toBe(false);
    expect(hasValidMapCoordinates(0, 0)).toBe(false);
  });
});

describe('mapApiProjectToProjectOption', () => {
  it('sets hasMapCoordinates from CRM customer lat/lng', () => {
    const p = mapApiProjectToProjectOption({
      id: 'proj-1',
      customer: {
        id: 'cust-1',
        latitude: 10.5,
        longitude: 76.2,
      },
    } as ProposalEngineProjectFromApi);
    expect(p.hasMapCoordinates).toBe(true);
  });

  it('maps peArtifacts from API (server truth for list cards)', () => {
    const p = mapApiProjectToProjectOption({
      id: 'proj-2',
      peArtifacts: {
        hasCosting: true,
        hasBom: true,
        hasRoi: false,
        hasProposal: false,
        hasRoofLayout: true,
      },
      customer: { id: 'c' },
    } as ProposalEngineProjectFromApi);
    expect(p.peArtifacts.hasRoofLayout).toBe(true);
    expect(p.peArtifacts.hasCosting).toBe(true);
  });
});
