import { describe, expect, it } from 'vitest';
import {
  hasValidMapCoordinates,
  mapApiProjectToProjectOption,
  formatRoofLayoutCardSummary,
  formatRoofLayoutModuleLabel,
} from './customerHelpers';
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

  it('maps roofLayoutSummary and module fields from API', () => {
    const p = mapApiProjectToProjectOption({
      id: 'proj-3',
      panelCapacityW: 550,
      panelBrand: 'Waaree',
      roofLayoutSummary: { panelCount: 24, placedKw: 13.2 },
      customer: { id: 'c' },
    } as ProposalEngineProjectFromApi);
    expect(p.roofLayoutSummary?.panelCount).toBe(24);
    expect(p.panelBrand).toBe('Waaree');
    expect(p.panelCapacityW).toBe(550);
  });
});

describe('formatRoofLayoutModuleLabel', () => {
  it('combines brand and watts', () => {
    expect(formatRoofLayoutModuleLabel({ panelBrand: 'Waaree', panelCapacityW: 550 })).toBe(
      'Waaree · 550 W',
    );
  });
});

describe('formatRoofLayoutCardSummary', () => {
  it('includes module label when present', () => {
    expect(
      formatRoofLayoutCardSummary({ panelCount: 20, placedKw: 11 }, 'Waaree · 550 W'),
    ).toBe('20 panels · 11.00 kW · Waaree · 550 W');
  });
});
