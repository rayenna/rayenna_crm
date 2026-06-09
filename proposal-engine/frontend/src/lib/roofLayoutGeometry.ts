/** Editable 2D roof layout geometry — persisted server-side for cross-device sync. */

import { keepoutFromGeometryJson, keepoutToGeometryJson } from './roofLayout/keepoutGeometry';

export type RoofLayoutKeepoutGeometry =
  | { id: string; shape?: 'rect'; x: number; y: number; width: number; height: number }
  | { id: string; shape: 'circle'; cx: number; cy: number; radius: number };

export type RoofLayoutFacetGeometry = {
  id: string;
  label: string;
  azimuthDeg: number;
  roofPolygon: { x: number; y: number }[];
  panelRects: { x: number; y: number; width: number; height: number }[];
};

export type RoofLayoutGeometryV1 = {
  version: 1;
  imageWidth: number;
  imageHeight: number;
  metersPerPixel: number;
  roofPolygon: { x: number; y: number }[];
  panelRects: { x: number; y: number; width: number; height: number }[];
  keepouts: RoofLayoutKeepoutGeometry[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  panelWidthM: number;
  panelHeightM: number;
  edgeSetbackM?: number;
};

export type RoofLayoutGeometryV2 = {
  version: 2;
  imageWidth: number;
  imageHeight: number;
  metersPerPixel: number;
  facets: RoofLayoutFacetGeometry[];
  keepouts: RoofLayoutKeepoutGeometry[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  panelWidthM: number;
  panelHeightM: number;
  /** Uniform edge inset for module packing (metres). Optional; 0 = pack to outline. */
  edgeSetbackM?: number;
};

export type ParsedRoofLayoutGeometry = RoofLayoutGeometryV2;

const validPoint = (p: unknown) =>
  typeof p === 'object' &&
  p != null &&
  Number.isFinite(Number((p as { x: unknown }).x)) &&
  Number.isFinite(Number((p as { y: unknown }).y));

function parseKeepouts(raw: unknown): RoofLayoutKeepoutGeometry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((k) => keepoutFromGeometryJson(k))
    .filter((k) => k != null)
    .map((k) => keepoutToGeometryJson(k!) as RoofLayoutKeepoutGeometry);
}

function parsePanelRects(raw: unknown): { x: number; y: number; width: number; height: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r) =>
        r &&
        typeof r === 'object' &&
        Number.isFinite(Number((r as { x: number }).x)) &&
        Number.isFinite(Number((r as { width: number }).width)),
    )
    .map((r) => ({
      x: Number((r as { x: number }).x),
      y: Number((r as { y: number }).y),
      width: Number((r as { width: number }).width),
      height: Number((r as { height: number }).height),
    }));
}

function parseSharedFields(o: Record<string, unknown>) {
  return {
    imageWidth: Number(o.imageWidth) || 2048,
    imageHeight: Number(o.imageHeight) || 2048,
    metersPerPixel: Number(o.metersPerPixel) || 0.149,
    keepouts: parseKeepouts(o.keepouts),
    panelOrientation: o.panelOrientation === 'landscape' ? 'landscape' as const : 'portrait' as const,
    panelSpacingMultiplier: Number.isFinite(Number(o.panelSpacingMultiplier))
      ? Number(o.panelSpacingMultiplier)
      : 1.5,
    panelWidthM: Number.isFinite(Number(o.panelWidthM)) ? Number(o.panelWidthM) : 1.1,
    panelHeightM: Number.isFinite(Number(o.panelHeightM)) ? Number(o.panelHeightM) : 2.2,
    edgeSetbackM: Number.isFinite(Number(o.edgeSetbackM)) ? Math.max(0, Number(o.edgeSetbackM)) : 0,
  };
}

export function geometryV1ToV2(v1: RoofLayoutGeometryV1): RoofLayoutGeometryV2 {
  return {
    version: 2,
    ...parseSharedFields(v1 as unknown as Record<string, unknown>),
    facets: [
      {
        id: crypto.randomUUID(),
        label: 'Roof 1',
        azimuthDeg: 180,
        roofPolygon: v1.roofPolygon,
        panelRects: v1.panelRects,
      },
    ],
  };
}

function parseFacet(raw: unknown, index: number): RoofLayoutFacetGeometry | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  const roofPolygon = Array.isArray(f.roofPolygon) ? f.roofPolygon : [];
  if (roofPolygon.length < 3 || !roofPolygon.every(validPoint)) return null;
  return {
    id: String(f.id ?? `facet-${index}`),
    label: String(f.label ?? `Roof ${index + 1}`),
    azimuthDeg: Number.isFinite(Number(f.azimuthDeg)) ? Number(f.azimuthDeg) : 180,
    roofPolygon: roofPolygon.map((p) => ({
      x: Number((p as { x: number }).x),
      y: Number((p as { y: number }).y),
    })),
    panelRects: parsePanelRects(f.panelRects),
  };
}

export function parseRoofLayoutGeometry(raw: unknown): ParsedRoofLayoutGeometry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  if (o.version === 2) {
    const facetsRaw = Array.isArray(o.facets) ? o.facets : [];
    const facets = facetsRaw
      .map((f, i) => parseFacet(f, i))
      .filter((f): f is RoofLayoutFacetGeometry => f != null);
    if (facets.length === 0) return null;
    return { version: 2, ...parseSharedFields(o), facets };
  }

  if (o.version === 1) {
    const roofPolygon = Array.isArray(o.roofPolygon) ? o.roofPolygon : [];
    if (roofPolygon.length < 3 || !roofPolygon.every(validPoint)) return null;
    const v1: RoofLayoutGeometryV1 = {
      version: 1,
      ...parseSharedFields(o),
      roofPolygon: roofPolygon.map((p) => ({
        x: Number((p as { x: number }).x),
        y: Number((p as { y: number }).y),
      })),
      panelRects: parsePanelRects(o.panelRects),
    };
    return geometryV1ToV2(v1);
  }

  return null;
}

/** @deprecated Prefer parseRoofLayoutGeometry (returns v2). Kept for tests migrating from v1-only API. */
export function parseRoofLayoutGeometryV1(raw: unknown): RoofLayoutGeometryV1 | null {
  const parsed = parseRoofLayoutGeometry(raw);
  if (!parsed || parsed.facets.length !== 1) return null;
  const f = parsed.facets[0]!;
  return {
    version: 1,
    imageWidth: parsed.imageWidth,
    imageHeight: parsed.imageHeight,
    metersPerPixel: parsed.metersPerPixel,
    roofPolygon: f.roofPolygon,
    panelRects: f.panelRects,
    keepouts: parsed.keepouts,
    panelOrientation: parsed.panelOrientation,
    panelSpacingMultiplier: parsed.panelSpacingMultiplier,
    panelWidthM: parsed.panelWidthM,
    panelHeightM: parsed.panelHeightM,
  };
}

export function buildRoofLayoutGeometry(input: Omit<RoofLayoutGeometryV2, 'version'>): RoofLayoutGeometryV2 {
  return { version: 2, ...input };
}

/** Legacy v1 builder — single facet only. */
export function buildRoofLayoutGeometryV1(input: Omit<RoofLayoutGeometryV1, 'version'>): RoofLayoutGeometryV1 {
  return { version: 1, ...input };
}
