import { describe, expect, it } from 'vitest';
import { buildSavedRoofLayoutGeometry } from './roofLayoutGeometrySave';

describe('buildSavedRoofLayoutGeometry', () => {
  const imageSize = { width: 2048, height: 2048 };
  const square = [
    { x: 100, y: 100 },
    { x: 900, y: 100 },
    { x: 900, y: 900 },
    { x: 100, y: 900 },
  ];

  it('returns undefined when no facet has a valid polygon', () => {
    expect(
      buildSavedRoofLayoutGeometry({
        imageSize,
        metersPerPixel: 0.149,
        facets: [{ id: 'a', label: 'Roof 1', azimuthDeg: 180, polygon: null, panels: [] }],
        keepouts: [],
        panelOrientation: 'portrait',
        panelSpacingMultiplier: 1.5,
        panelWatts: 550,
      }),
    ).toBeUndefined();
  });

  it('persists v2 geometry with facets, panels, rect and circle keepouts', () => {
    const geom = buildSavedRoofLayoutGeometry({
      imageSize,
      metersPerPixel: 0.149,
      facets: [
        {
          id: 'f1',
          label: 'Roof 1',
          azimuthDeg: 180,
          polygon: square,
          panels: [{ x: 200, y: 200, w: 40, h: 80 }],
        },
      ],
      keepouts: [
        { id: 'r1', shape: 'rect', x: 400, y: 400, w: 50, h: 50 },
        { id: 'c1', shape: 'circle', cx: 600, cy: 600, r: 30 },
      ],
      panelOrientation: 'landscape',
      panelSpacingMultiplier: 1.2,
      panelWatts: 550,
    });

    expect(geom?.version).toBe(2);
    expect(geom?.facets).toHaveLength(1);
    expect(geom?.facets[0]?.panelRects).toHaveLength(1);
    expect(geom?.keepouts).toHaveLength(2);
    expect(geom?.keepouts[1]).toMatchObject({ shape: 'circle', cx: 600, cy: 600, radius: 30 });
  });
});
