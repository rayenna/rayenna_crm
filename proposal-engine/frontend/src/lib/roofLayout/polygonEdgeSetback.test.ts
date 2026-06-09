import { describe, expect, it } from 'vitest';
import { computePanelsForPolygon } from './computePanelsForPolygon';
import { insetPolygonByDistance, setbackMetersToPixels } from './polygonEdgeSetback';

const square = [
  { x: 100, y: 100 },
  { x: 900, y: 100 },
  { x: 900, y: 900 },
  { x: 100, y: 900 },
];

describe('insetPolygonByDistance', () => {
  it('returns a copy when inset is zero', () => {
    const result = insetPolygonByDistance(square, 0);
    expect(result).toEqual(square);
  });

  it('shrinks a square inward', () => {
    const inset = insetPolygonByDistance(square, 50);
    expect(inset).not.toBeNull();
    expect(inset!.every((p) => p.x > 100 && p.x < 900 && p.y > 100 && p.y < 900)).toBe(true);
  });

  it('returns null when setback collapses the polygon', () => {
    expect(insetPolygonByDistance(square, 399)).toBeNull();
  });
});

describe('setbackMetersToPixels', () => {
  it('converts metres using scale', () => {
    expect(setbackMetersToPixels(0.149, 0.149)).toBeCloseTo(1, 5);
    expect(setbackMetersToPixels(0, 0.149)).toBe(0);
  });
});

describe('computePanelsForPolygon edge setback', () => {
  it('places fewer panels with a positive edge setback', () => {
    const baseOpts = {
      panelOrientation: 'portrait' as const,
      panelSpacingMultiplier: 1.5,
      panelWatts: 550,
      maxPanelsCap: 9999,
      targetKw: null as number | null,
      metersPerPixel: 0.149,
    };
    const without = computePanelsForPolygon(square, baseOpts);
    const withSetback = computePanelsForPolygon(square, {
      ...baseOpts,
      edgeSetbackM: 1.5,
    });
    expect(without.panelCount).toBeGreaterThan(10);
    expect(withSetback.panelCount).toBeGreaterThan(0);
    expect(withSetback.panelCount).toBeLessThan(without.panelCount);
  });
});
