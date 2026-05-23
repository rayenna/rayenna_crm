/** Multi-roof-section state (SolarEdge Designer–style facets on one site image). */

export const MAX_ROOF_FACETS = 3;

export type RoofFacetState = {
  id: string;
  label: string;
  /** Roof face azimuth in degrees (180 ≈ south in northern hemisphere). */
  azimuthDeg: number;
  polygon: { x: number; y: number }[] | null;
  panels: { x: number; y: number; w: number; h: number }[];
};

export const ROOF_AZIMUTH_PRESETS: { label: string; deg: number }[] = [
  { label: 'S', deg: 180 },
  { label: 'SE', deg: 135 },
  { label: 'E', deg: 90 },
  { label: 'NE', deg: 45 },
  { label: 'N', deg: 0 },
  { label: 'NW', deg: 315 },
  { label: 'W', deg: 270 },
  { label: 'SW', deg: 225 },
];

export function createRoofFacet(index: number, id = crypto.randomUUID()): RoofFacetState {
  return {
    id,
    label: `Roof ${index}`,
    azimuthDeg: 180,
    polygon: null,
    panels: [],
  };
}

/** Offset a copy of the active outline so a second facet does not stack on the first. */
export function offsetPolygonForNewFacet(
  poly: { x: number; y: number }[],
  imageSize: { width: number; height: number },
  facetIndex: number,
): { x: number; y: number }[] {
  const shiftX = (imageSize.width * 0.08 * facetIndex) % (imageSize.width * 0.25);
  const shiftY = (imageSize.height * 0.06 * facetIndex) % (imageSize.height * 0.2);
  const clamp = (v: number, max: number) => Math.max(40, Math.min(max - 40, v));
  return poly.map((p) => ({
    x: clamp(p.x + shiftX, imageSize.width),
    y: clamp(p.y + shiftY, imageSize.height),
  }));
}

export function flattenFacetPanels(facets: RoofFacetState[]): { x: number; y: number; w: number; h: number }[] {
  return facets.flatMap((f) => f.panels);
}

export function totalFacetPanelCount(facets: RoofFacetState[]): number {
  return facets.reduce((n, f) => n + f.panels.length, 0);
}

export function splitTargetKwAcrossFacets(
  targetKw: number | null,
  facetCount: number,
): number | null {
  if (targetKw == null || !Number.isFinite(targetKw) || facetCount < 1) return null;
  return targetKw / facetCount;
}
