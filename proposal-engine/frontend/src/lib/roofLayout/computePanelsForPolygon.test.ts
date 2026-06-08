import { describe, expect, it } from 'vitest';
import { panelOverlapsKeepout } from './keepoutGeometry';
import { computePanelsForPolygon } from './computePanelsForPolygon';

describe('computePanelsForPolygon', () => {
  it('returns empty panels for empty polygon', () => {
    const result = computePanelsForPolygon([], {
      panelOrientation: 'portrait',
      panelSpacingMultiplier: 1.5,
      panelWatts: 550,
    });
    expect(result.panels).toEqual([]);
    expect(result.panelCount).toBe(0);
  });

  it('places panels inside a square polygon', () => {
    const poly = [
      { x: 100, y: 100 },
      { x: 900, y: 100 },
      { x: 900, y: 900 },
      { x: 100, y: 900 },
    ];
    const result = computePanelsForPolygon(poly, {
      panelOrientation: 'portrait',
      panelSpacingMultiplier: 1.5,
      panelWatts: 550,
      maxPanelsCap: 50,
    });
    expect(result.panelCount).toBeGreaterThan(0);
    expect(result.roofAreaM2).toBeGreaterThan(0);
    expect(result.usableAreaM2).toBeLessThan(result.roofAreaM2);
  });

  it('skips panels overlapping a circle keepout', () => {
    const poly = [
      { x: 100, y: 100 },
      { x: 900, y: 100 },
      { x: 900, y: 900 },
      { x: 100, y: 900 },
    ];
    const baseOpts = {
      panelOrientation: 'portrait' as const,
      panelSpacingMultiplier: 1.5,
      panelWatts: 550,
      maxPanelsCap: 120,
    };
    const keepout = { id: 'c1', shape: 'circle' as const, cx: 500, cy: 500, r: 200 };
    const withCircle = computePanelsForPolygon(poly, {
      ...baseOpts,
      keepoutRects: [keepout],
    });
    expect(withCircle.panelCount).toBeGreaterThan(0);
    expect(
      withCircle.panels.some((p) => panelOverlapsKeepout(p, keepout)),
    ).toBe(false);
  });
});
