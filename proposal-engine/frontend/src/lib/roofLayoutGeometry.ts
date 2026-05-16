/** Editable 2D roof layout geometry — persisted server-side for cross-device sync. */
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
  const roofPolygon = Array.isArray(o.roofPolygon) ? o.roofPolygon : [];
  if (roofPolygon.length < 3) return null;
  const validPoint = (p: unknown) =>
    typeof p === 'object' &&
    p != null &&
    Number.isFinite(Number((p as { x: unknown }).x)) &&
    Number.isFinite(Number((p as { y: unknown }).y));

  if (!roofPolygon.every(validPoint)) return null;

  return {
    version: 1,
    imageWidth: Number(o.imageWidth) || 2048,
    imageHeight: Number(o.imageHeight) || 2048,
    metersPerPixel: Number(o.metersPerPixel) || 0.149,
    roofPolygon: roofPolygon.map((p) => ({
      x: Number((p as { x: number }).x),
      y: Number((p as { y: number }).y),
    })),
    panelRects: Array.isArray(o.panelRects)
      ? o.panelRects
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
          }))
      : [],
    keepouts: Array.isArray(o.keepouts)
      ? o.keepouts
          .filter(
            (k) =>
              k &&
              typeof k === 'object' &&
              Number.isFinite(Number((k as { width: number }).width)),
          )
          .map((k) => ({
            id: String((k as { id?: string }).id ?? crypto.randomUUID()),
            x: Number((k as { x: number }).x),
            y: Number((k as { y: number }).y),
            width: Number((k as { width: number }).width),
            height: Number((k as { height: number }).height),
          }))
      : [],
    panelOrientation: o.panelOrientation === 'landscape' ? 'landscape' : 'portrait',
    panelSpacingMultiplier: Number.isFinite(Number(o.panelSpacingMultiplier))
      ? Number(o.panelSpacingMultiplier)
      : 1.5,
    panelWidthM: Number.isFinite(Number(o.panelWidthM)) ? Number(o.panelWidthM) : 1.1,
    panelHeightM: Number.isFinite(Number(o.panelHeightM)) ? Number(o.panelHeightM) : 2.2,
  };
}

export function buildRoofLayoutGeometry(input: Omit<RoofLayoutGeometryV1, 'version'>): RoofLayoutGeometryV1 {
  return { version: 1, ...input };
}
