import { describe, expect, it } from 'vitest';
import type { ParsedRoofLayoutGeometry } from '../roofLayoutGeometry';
import {
  fingerprintParsedRoofLayoutGeometry,
  fingerprintRoofLayoutEditorState,
  normalizeRoofLayoutGeometryFingerprint,
} from './roofLayoutGeometryFingerprint';
import type { RoofFacetState } from '../roofLayoutFacets';

const baseGeom: ParsedRoofLayoutGeometry = {
  version: 2,
  imageWidth: 2048,
  imageHeight: 2048,
  metersPerPixel: 0.149,
  facets: [
    {
      id: 'f1',
      label: 'Roof 1',
      azimuthDeg: 180,
      roofPolygon: [
        { x: 100, y: 100 },
        { x: 500, y: 100 },
        { x: 500, y: 400 },
      ],
      panelRects: [{ x: 120, y: 120, width: 50, height: 90 }],
    },
  ],
  keepouts: [],
  panelOrientation: 'portrait',
  panelSpacingMultiplier: 1.5,
  panelWidthM: 1.134,
  panelHeightM: 2.278,
};

describe('roofLayoutGeometryFingerprint', () => {
  it('matches parsed geometry to editor state built from same data', () => {
    const facets: RoofFacetState[] = [
      {
        id: 'f1',
        label: 'Roof 1',
        azimuthDeg: 180,
        polygon: baseGeom.facets[0]!.roofPolygon.map((p) => ({ x: p.x, y: p.y })),
        panels: [{ x: 120, y: 120, w: 50, h: 90 }],
      },
    ];

    const fromParsed = fingerprintParsedRoofLayoutGeometry(baseGeom);
    const fromEditor = fingerprintRoofLayoutEditorState({
      facets,
      keepouts: [],
      panelOrientation: 'portrait',
      panelSpacingMultiplier: 1.5,
      panelWatts: 550,
      imageSize: { width: 2048, height: 2048 },
    });

    expect(fromEditor).toBe(fromParsed);
  });

  it('detects polygon vertex moves', () => {
    const a = normalizeRoofLayoutGeometryFingerprint(baseGeom);
    const b = normalizeRoofLayoutGeometryFingerprint({
      ...baseGeom,
      facets: [
        {
          ...baseGeom.facets[0]!,
          roofPolygon: [
            { x: 101, y: 100 },
            { x: 500, y: 100 },
            { x: 500, y: 400 },
          ],
        },
      ],
    });
    expect(a).not.toBe(b);
  });

  it('ignores sub-pixel float noise', () => {
    const a = normalizeRoofLayoutGeometryFingerprint(baseGeom);
    const b = normalizeRoofLayoutGeometryFingerprint({
      ...baseGeom,
      facets: [
        {
          ...baseGeom.facets[0]!,
          roofPolygon: [
            { x: 100.001, y: 100.002 },
            { x: 500, y: 100 },
            { x: 500, y: 400 },
          ],
        },
      ],
    });
    expect(a).toBe(b);
  });
});
