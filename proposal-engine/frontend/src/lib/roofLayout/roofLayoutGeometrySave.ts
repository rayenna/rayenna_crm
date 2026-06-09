import { buildRoofLayoutGeometry, type RoofLayoutKeepoutGeometry } from '../roofLayoutGeometry';
import {
  orientModuleDimensions,
  resolveModuleDimensions,
  type ResolvedModuleDimensions,
} from './resolveModuleDimensions';
import type { RoofFacetState } from '../roofLayoutFacets';
import { keepoutToGeometryJson } from './keepoutGeometry';
import type { RoofLayoutKeepout, RoofLayoutPoint } from './roofLayoutTypes';

export function pickPrimaryCropPolygon(
  facets: RoofFacetState[],
  activePolygon: RoofLayoutPoint[] | null,
): RoofLayoutPoint[] | null {
  const fromFacet = facets.find((f) => f.polygon && f.polygon.length >= 3)?.polygon;
  return fromFacet ?? activePolygon;
}

export function buildSavedRoofLayoutGeometry(params: {
  imageSize: { width: number; height: number };
  metersPerPixel: number;
  facets: RoofFacetState[];
  keepouts: RoofLayoutKeepout[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  panelWatts: number;
  edgeSetbackM?: number;
  resolvedModule?: ResolvedModuleDimensions;
}) {
  const {
    imageSize,
    facets,
    keepouts,
    panelOrientation,
    panelSpacingMultiplier,
    panelWatts,
    metersPerPixel,
    edgeSetbackM = 0,
    resolvedModule,
  } = params;
  if (!facets.some((f) => f.polygon && f.polygon.length >= 3)) return undefined;

  const resolved =
    resolvedModule ?? resolveModuleDimensions({ panelWattage: panelWatts });
  const moduleSize = orientModuleDimensions(resolved, panelOrientation);
  return buildRoofLayoutGeometry({
    imageWidth: imageSize.width,
    imageHeight: imageSize.height,
    metersPerPixel,
    facets: facets
      .filter((f) => f.polygon && f.polygon.length >= 3)
      .map((f) => ({
        id: f.id,
        label: f.label,
        azimuthDeg: f.azimuthDeg,
        roofPolygon: f.polygon!,
        panelRects: f.panels.map((p) => ({
          x: p.x,
          y: p.y,
          width: p.w,
          height: p.h,
        })),
      })),
    keepouts: keepouts.map((k) => keepoutToGeometryJson(k) as RoofLayoutKeepoutGeometry),
    panelOrientation,
    panelSpacingMultiplier,
    panelWidthM: moduleSize.widthM,
    panelHeightM: moduleSize.heightM,
    edgeSetbackM: Math.max(0, edgeSetbackM),
  });
}
