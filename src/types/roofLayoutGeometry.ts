/** Server-side mirror of proposal-engine/frontend/src/lib/roofLayoutGeometry.ts */
export type RoofLayoutGeometryV1 = {
  version: 1;
  imageWidth: number;
  imageHeight: number;
  metersPerPixel: number;
  roofPolygon: { x: number; y: number }[];
  panelRects: { x: number; y: number; width: number; height: number }[];
  keepouts: { id: string; x: number; y: number; width: number; height: number }[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  panelWidthM: number;
  panelHeightM: number;
};

export function parseRoofLayoutGeometry(raw: unknown): RoofLayoutGeometryV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  if (!Array.isArray(o.roofPolygon) || o.roofPolygon.length < 3) return null;
  return o as RoofLayoutGeometryV1;
}
