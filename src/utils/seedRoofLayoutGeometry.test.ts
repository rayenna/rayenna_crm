import { describe, expect, it } from 'vitest';
import { buildSeedRoofLayoutGeometry } from './seedRoofLayoutGeometry';
import { parseRoofLayoutGeometry } from '../types/roofLayoutGeometry';
import { ROOF_LAYOUT_SATELLITE_IMAGE_PX } from '../constants/roofLayoutScale';

describe('buildSeedRoofLayoutGeometry', () => {
  it('returns null for short polygons', () => {
    expect(buildSeedRoofLayoutGeometry({ roofPolygon: [{ x: 1, y: 1 }] })).toBeNull();
  });

  it('builds parseable v1 seed geometry with empty panels', () => {
    const seed = buildSeedRoofLayoutGeometry({
      roofPolygon: [
        { x: 10, y: 10 },
        { x: 100, y: 10 },
        { x: 100, y: 80 },
        { x: 10, y: 80 },
      ],
    });
    expect(seed).not.toBeNull();
    expect(seed!.imageWidth).toBe(ROOF_LAYOUT_SATELLITE_IMAGE_PX);
    expect(seed!.panelRects).toEqual([]);

    const parsed = parseRoofLayoutGeometry(seed);
    expect(parsed?.facets[0]?.roofPolygon).toHaveLength(4);
    expect(parsed?.facets[0]?.panelRects).toEqual([]);
  });
});
