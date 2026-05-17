import { describe, expect, it } from 'vitest';
import {
  buildRoofLayoutGeometry,
  parseRoofLayoutGeometry,
  type RoofLayoutGeometryV1,
} from './roofLayoutGeometry';

const validGeom: RoofLayoutGeometryV1 = {
  version: 1,
  imageWidth: 2048,
  imageHeight: 2048,
  metersPerPixel: 0.149,
  roofPolygon: [
    { x: 100, y: 100 },
    { x: 900, y: 100 },
    { x: 900, y: 900 },
  ],
  panelRects: [{ x: 200, y: 200, width: 50, height: 100 }],
  keepouts: [{ id: 'k1', x: 400, y: 400, width: 80, height: 80 }],
  panelOrientation: 'portrait',
  panelSpacingMultiplier: 1.5,
  panelWidthM: 1.1,
  panelHeightM: 2.2,
};

describe('parseRoofLayoutGeometry', () => {
  it('round-trips valid geometry', () => {
    expect(parseRoofLayoutGeometry(validGeom)).toEqual(validGeom);
  });

  it('returns null for wrong version or too few polygon points', () => {
    expect(parseRoofLayoutGeometry({ ...validGeom, version: 2 })).toBeNull();
    expect(
      parseRoofLayoutGeometry({
        ...validGeom,
        roofPolygon: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      }),
    ).toBeNull();
  });

  it('returns null for non-objects', () => {
    expect(parseRoofLayoutGeometry(null)).toBeNull();
    expect(parseRoofLayoutGeometry('x')).toBeNull();
  });

  it('applies defaults for missing numeric fields', () => {
    const parsed = parseRoofLayoutGeometry({
      version: 1,
      roofPolygon: validGeom.roofPolygon,
    });
    expect(parsed?.imageWidth).toBe(2048);
    expect(parsed?.metersPerPixel).toBe(0.149);
    expect(parsed?.panelOrientation).toBe('portrait');
  });

  it('filters invalid panel rects', () => {
    const parsed = parseRoofLayoutGeometry({
      ...validGeom,
      panelRects: [{ x: 1, y: 2, width: 10, height: 20 }, { x: 'bad' }],
    });
    expect(parsed?.panelRects).toHaveLength(1);
  });
});

describe('buildRoofLayoutGeometry', () => {
  it('sets version 1', () => {
    const { version, ...rest } = validGeom;
    void version;
    const built = buildRoofLayoutGeometry(rest);
    expect(built.version).toBe(1);
    expect(built.roofPolygon).toEqual(validGeom.roofPolygon);
  });
});
