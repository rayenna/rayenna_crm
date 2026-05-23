import { describe, expect, it } from 'vitest';
import {
  buildRoofLayoutGeometry,
  geometryV1ToV2,
  parseRoofLayoutGeometry,
  parseRoofLayoutGeometryV1,
  type RoofLayoutGeometryV1,
} from './roofLayoutGeometry';

const validGeomV1: RoofLayoutGeometryV1 = {
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
  it('migrates v1 to v2 with one facet', () => {
    const parsed = parseRoofLayoutGeometry(validGeomV1);
    expect(parsed?.version).toBe(2);
    expect(parsed?.facets).toHaveLength(1);
    expect(parsed?.facets[0]?.roofPolygon).toEqual(validGeomV1.roofPolygon);
    expect(parsed?.facets[0]?.panelRects).toEqual(validGeomV1.panelRects);
  });

  it('parses native v2 multi-facet geometry', () => {
    const v2 = buildRoofLayoutGeometry({
      imageWidth: 2048,
      imageHeight: 2048,
      metersPerPixel: 0.149,
      facets: [
        {
          id: 'a',
          label: 'Roof 1',
          azimuthDeg: 180,
          roofPolygon: validGeomV1.roofPolygon,
          panelRects: [],
        },
        {
          id: 'b',
          label: 'Roof 2',
          azimuthDeg: 90,
          roofPolygon: [
            { x: 200, y: 200 },
            { x: 500, y: 200 },
            { x: 500, y: 500 },
          ],
          panelRects: [{ x: 220, y: 220, width: 40, height: 80 }],
        },
      ],
      keepouts: [],
      panelOrientation: 'portrait',
      panelSpacingMultiplier: 1.5,
      panelWidthM: 1.1,
      panelHeightM: 2.2,
    });
    const parsed = parseRoofLayoutGeometry(v2);
    expect(parsed?.facets).toHaveLength(2);
    expect(parsed?.facets[1]?.azimuthDeg).toBe(90);
  });

  it('returns null for wrong version or too few polygon points', () => {
    expect(parseRoofLayoutGeometry({ ...validGeomV1, version: 9 })).toBeNull();
    expect(
      parseRoofLayoutGeometry({
        version: 2,
        facets: [{ id: 'x', roofPolygon: [{ x: 0, y: 0 }] }],
      }),
    ).toBeNull();
  });

  it('returns null for non-objects', () => {
    expect(parseRoofLayoutGeometry(null)).toBeNull();
    expect(parseRoofLayoutGeometry('x')).toBeNull();
  });
});

describe('parseRoofLayoutGeometryV1', () => {
  it('round-trips single-facet v1 input', () => {
    expect(parseRoofLayoutGeometryV1(validGeomV1)?.roofPolygon).toEqual(validGeomV1.roofPolygon);
  });
});

describe('geometryV1ToV2', () => {
  it('preserves panel rects on the facet', () => {
    const v2 = geometryV1ToV2(validGeomV1);
    expect(v2.facets[0]?.panelRects).toHaveLength(1);
  });
});

describe('buildRoofLayoutGeometry', () => {
  it('sets version 2', () => {
    const built = buildRoofLayoutGeometry({
      imageWidth: 2048,
      imageHeight: 2048,
      metersPerPixel: 0.149,
      facets: [
        {
          id: '1',
          label: 'Roof 1',
          azimuthDeg: 180,
          roofPolygon: validGeomV1.roofPolygon,
          panelRects: [],
        },
      ],
      keepouts: [],
      panelOrientation: 'portrait',
      panelSpacingMultiplier: 1.5,
      panelWidthM: 1.1,
      panelHeightM: 2.2,
    });
    expect(built.version).toBe(2);
  });
});
