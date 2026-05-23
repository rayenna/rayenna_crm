/** Server-side mirror of proposal-engine/frontend/src/lib/roofLayoutGeometry.ts */

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
  keepouts: { id: string; x: number; y: number; width: number; height: number }[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  panelWidthM: number;
  panelHeightM: number;
};

export type RoofLayoutGeometryV2 = {
  version: 2;
  imageWidth: number;
  imageHeight: number;
  metersPerPixel: number;
  facets: RoofLayoutFacetGeometry[];
  keepouts: { id: string; x: number; y: number; width: number; height: number }[];
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  panelWidthM: number;
  panelHeightM: number;
};

export type ParsedRoofLayoutGeometry = RoofLayoutGeometryV2;

/** Flatten v2 facets for API fields legacy clients expect (primary outline + all panels). */
export function legacyCoordinatesFromGeometry(geom: ParsedRoofLayoutGeometry): {
  roof_polygon_coordinates: { x: number; y: number }[];
  panel_coordinates: { x: number; y: number; width: number; height: number }[];
} {
  const primary = geom.facets[0]!;
  return {
    roof_polygon_coordinates: primary.roofPolygon,
    panel_coordinates: geom.facets.flatMap((facet) => facet.panelRects),
  };
}

export function parseRoofLayoutGeometry(raw: unknown): ParsedRoofLayoutGeometry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  if (o.version === 2 && Array.isArray(o.facets) && o.facets.length > 0) {
    const facets = o.facets.filter(
      (f) =>
        f &&
        typeof f === 'object' &&
        Array.isArray((f as { roofPolygon?: unknown }).roofPolygon) &&
        ((f as { roofPolygon: unknown[] }).roofPolygon.length ?? 0) >= 3,
    );
    if (facets.length === 0) return null;
    return o as ParsedRoofLayoutGeometry;
  }

  if (o.version === 1 && Array.isArray(o.roofPolygon) && o.roofPolygon.length >= 3) {
    return {
      version: 2,
      imageWidth: Number(o.imageWidth) || 2048,
      imageHeight: Number(o.imageHeight) || 2048,
      metersPerPixel: Number(o.metersPerPixel) || 0.149,
      facets: [
        {
          id: 'legacy-1',
          label: 'Roof 1',
          azimuthDeg: 180,
          roofPolygon: o.roofPolygon as { x: number; y: number }[],
          panelRects: Array.isArray(o.panelRects)
            ? (o.panelRects as { x: number; y: number; width: number; height: number }[])
            : [],
        },
      ],
      keepouts: Array.isArray(o.keepouts)
        ? (o.keepouts as ParsedRoofLayoutGeometry['keepouts'])
        : [],
      panelOrientation: o.panelOrientation === 'landscape' ? 'landscape' : 'portrait',
      panelSpacingMultiplier: Number(o.panelSpacingMultiplier) || 1.5,
      panelWidthM: Number(o.panelWidthM) || 1.1,
      panelHeightM: Number(o.panelHeightM) || 2.2,
    };
  }

  return null;
}
