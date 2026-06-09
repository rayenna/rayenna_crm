import type { ParsedRoofLayoutGeometry } from '../roofLayoutGeometry';
import { ROOF_LAYOUT_METERS_PER_PIXEL } from '../roofLayoutConstants';
import type { RoofFacetState } from '../roofLayoutFacets';
import { buildSavedRoofLayoutGeometry } from './roofLayoutGeometrySave';
import type { RoofLayoutKeepout } from './roofLayoutTypes';

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Stable JSON for comparing editable layout content (ignores image dimensions / scale). */
export function normalizeRoofLayoutGeometryFingerprint(
  geom: Pick<
    ParsedRoofLayoutGeometry,
    'facets' | 'keepouts' | 'panelOrientation'
    | 'panelSpacingMultiplier'
    | 'panelWidthM'
    | 'panelHeightM'
    | 'edgeSetbackM'
  >,
): string {
  const facets = [...geom.facets]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((f) => ({
      id: f.id,
      label: f.label,
      azimuthDeg: roundCoord(f.azimuthDeg),
      roofPolygon: f.roofPolygon.map((p) => ({ x: roundCoord(p.x), y: roundCoord(p.y) })),
      panelRects: f.panelRects
        .map((r) => ({
          x: roundCoord(r.x),
          y: roundCoord(r.y),
          width: roundCoord(r.width),
          height: roundCoord(r.height),
        }))
        .sort((a, b) => a.x - b.x || a.y - b.y || a.width - b.width),
    }));

  const keepouts = [...geom.keepouts]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((k) => {
      if (k.shape === 'circle') {
        return {
          id: k.id,
          shape: 'circle' as const,
          cx: roundCoord(k.cx),
          cy: roundCoord(k.cy),
          radius: roundCoord(k.radius),
        };
      }
      return {
        id: k.id,
        shape: 'rect' as const,
        x: roundCoord(k.x),
        y: roundCoord(k.y),
        width: roundCoord(k.width),
        height: roundCoord(k.height),
      };
    });

  return JSON.stringify({
    facets,
    keepouts,
    panelOrientation: geom.panelOrientation,
    panelSpacingMultiplier: roundCoord(geom.panelSpacingMultiplier),
    panelWidthM: roundCoord(geom.panelWidthM),
    panelHeightM: roundCoord(geom.panelHeightM),
    edgeSetbackM: roundCoord(geom.edgeSetbackM ?? 0),
  });
}

export function fingerprintParsedRoofLayoutGeometry(geom: ParsedRoofLayoutGeometry): string {
  return normalizeRoofLayoutGeometryFingerprint(geom);
}

export function fingerprintRoofLayoutEditorState(params: {
  facets: RoofFacetState[];
  keepouts: RoofLayoutKeepout[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  panelWatts: number;
  imageSize: { width: number; height: number } | null;
  metersPerPixel?: number;
  edgeSetbackM?: number;
}): string | null {
  if (!params.imageSize) return null;

  const built = buildSavedRoofLayoutGeometry({
    imageSize: params.imageSize,
    metersPerPixel: params.metersPerPixel ?? ROOF_LAYOUT_METERS_PER_PIXEL,
    facets: params.facets,
    keepouts: params.keepouts,
    panelOrientation: params.panelOrientation,
    panelSpacingMultiplier: params.panelSpacingMultiplier,
    panelWatts: params.panelWatts,
    edgeSetbackM: params.edgeSetbackM ?? 0,
  });
  if (!built) return null;

  return normalizeRoofLayoutGeometryFingerprint(built);
}
