import { describe, expect, it } from 'vitest';
import {
  ROOF_LAYOUT_DEFAULT_TILT_DEG,
  estimateRoofLayoutYield,
  indiaFacetYieldFactor,
  yieldFacetsFromEditorState,
} from './estimateRoofLayoutYield';
import type { RoofFacetState } from '../roofLayoutFacets';

describe('indiaFacetYieldFactor', () => {
  it('returns 1.0 for south at default tilt', () => {
    expect(indiaFacetYieldFactor(180, ROOF_LAYOUT_DEFAULT_TILT_DEG)).toBeCloseTo(1.0, 2);
  });

  it('reduces yield for east-facing facets', () => {
    expect(indiaFacetYieldFactor(90, ROOF_LAYOUT_DEFAULT_TILT_DEG)).toBeCloseTo(0.86, 2);
  });

  it('reduces yield strongly for north-facing facets', () => {
    expect(indiaFacetYieldFactor(0, ROOF_LAYOUT_DEFAULT_TILT_DEG)).toBeCloseTo(0.58, 2);
  });

  it('interpolates between preset azimuths', () => {
    const mid = indiaFacetYieldFactor(157.5, ROOF_LAYOUT_DEFAULT_TILT_DEG);
    expect(mid).toBeGreaterThan(0.97);
    expect(mid).toBeLessThan(1.0);
  });
});

describe('estimateRoofLayoutYield', () => {
  it('returns null when no panels are placed', () => {
    expect(
      estimateRoofLayoutYield({
        facets: [{ azimuthDeg: 180, panelCount: 0 }],
        moduleWatts: 550,
      }),
    ).toBeNull();
  });

  it('matches nameplate kW for all-south panels', () => {
    const est = estimateRoofLayoutYield({
      facets: [{ azimuthDeg: 180, panelCount: 10, label: 'Roof 1' }],
      moduleWatts: 550,
    });
    expect(est).not.toBeNull();
    expect(est!.nameplateKw).toBeCloseTo(5.5, 2);
    expect(est!.effectiveKw).toBeCloseTo(5.5, 2);
    expect(est!.orientationLossPercent).toBeCloseTo(0, 1);
  });

  it('weights multi-facet effective kW by panel count', () => {
    const est = estimateRoofLayoutYield({
      facets: [
        { azimuthDeg: 180, panelCount: 10, label: 'South' },
        { azimuthDeg: 90, panelCount: 10, label: 'East' },
      ],
      moduleWatts: 550,
    });
    expect(est).not.toBeNull();
    expect(est!.nameplateKw).toBeCloseTo(11.0, 2);
    const expectedEffective = 5.5 + 5.5 * 0.86;
    expect(est!.effectiveKw).toBeCloseTo(expectedEffective, 2);
    expect(est!.orientationLossPercent).toBeGreaterThan(6);
    expect(est!.orientationLossPercent).toBeLessThan(8);
  });

  it('builds facet inputs from editor state', () => {
    const facets: RoofFacetState[] = [
      {
        id: 'a',
        label: 'Roof 1',
        azimuthDeg: 135,
        polygon: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
        panels: [{ x: 0, y: 0, w: 10, h: 20 }],
      },
      {
        id: 'b',
        label: 'Roof 2',
        azimuthDeg: 180,
        polygon: null,
        panels: [],
      },
    ];
    expect(yieldFacetsFromEditorState(facets)).toEqual([
      { label: 'Roof 1', azimuthDeg: 135, panelCount: 1 },
    ]);
  });
});
