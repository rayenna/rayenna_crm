import { describe, expect, it } from 'vitest';
import {
  ROOF_LAYOUT_METERS_PER_PIXEL,
  computeSeedPolygonHalfExtentsPx,
  computeSeedRoofPolygonCoords,
} from './roofLayoutScale';

describe('roofLayoutScale', () => {
  it('computeSeedRoofPolygonCoords returns a centred 4-point rectangle', () => {
    const coords = computeSeedRoofPolygonCoords({
      systemSizeKw: 5,
      panelWattage: 550,
    });
    expect(coords).toHaveLength(4);
    const xs = coords.map((p) => p.x);
    const ys = coords.map((p) => p.y);
    expect(Math.min(...xs)).toBeLessThan(1024);
    expect(Math.max(...xs)).toBeGreaterThan(1024);
    expect(Math.min(...ys)).toBeLessThan(1024);
    expect(Math.max(...ys)).toBeGreaterThan(1024);
  });

  it('matches known half-extents for 5 kW / 550 W at default scale', () => {
    const { halfWPx, halfHPx } = computeSeedPolygonHalfExtentsPx({
      systemSizeKw: 5,
      panelWattage: 550,
      imgCenter: 1024,
      metersPerPixel: ROOF_LAYOUT_METERS_PER_PIXEL,
    });
    expect(halfWPx).toBe(22);
    expect(halfHPx).toBe(20);
  });
});
