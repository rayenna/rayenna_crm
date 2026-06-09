/**
 * Simplified orientation yield for India rooftops (informational only).
 * Uses preset azimuth factors at ~10°N latitude with default 10° tilt (matches 3D preview).
 * Not a production guarantee — sales credibility hint for P2.
 */

import type { RoofFacetState } from '../roofLayoutFacets';

/** Default tilt assumed in 2D layout (2D editor has no tilt control; matches Solar3DView). */
export const ROOF_LAYOUT_DEFAULT_TILT_DEG = 10;

/** ROI calculator default — kWh per kW per year for much of India. */
export const ROOF_LAYOUT_DEFAULT_GENERATION_FACTOR_KWH_KW = 1500;

/** Relative annual yield vs optimal south-facing at reference tilt (~10° for Kerala). */
const INDIA_AZIMUTH_YIELD_TABLE: { deg: number; factor: number }[] = [
  { deg: 0, factor: 0.58 },
  { deg: 45, factor: 0.8 },
  { deg: 90, factor: 0.86 },
  { deg: 135, factor: 0.97 },
  { deg: 180, factor: 1.0 },
  { deg: 225, factor: 0.97 },
  { deg: 270, factor: 0.86 },
  { deg: 315, factor: 0.8 },
];

/** Tilt factor at south azimuth; reference tilt 10° = 1.0. */
const INDIA_TILT_YIELD_SOUTH_TABLE: { deg: number; factor: number }[] = [
  { deg: 0, factor: 0.92 },
  { deg: 5, factor: 0.98 },
  { deg: 10, factor: 1.0 },
  { deg: 15, factor: 0.99 },
  { deg: 20, factor: 0.97 },
  { deg: 25, factor: 0.94 },
  { deg: 30, factor: 0.9 },
];

function interpolateCircularTable(deg: number, table: { deg: number; factor: number }[]): number {
  const d = ((deg % 360) + 360) % 360;
  const pts = [...table].sort((a, b) => a.deg - b.deg);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const start = a.deg;
    let end = b.deg;
    if (i === pts.length - 1 && end < start) end += 360;
    let test = d;
    if (i === pts.length - 1 && d < start) test += 360;
    if (test >= start && test <= end) {
      const span = end - start || 360;
      const t = span > 0 ? (test - start) / span : 0;
      return a.factor + t * (b.factor - a.factor);
    }
  }
  return pts[0]?.factor ?? 1;
}

function interpolateLinearTable(deg: number, table: { deg: number; factor: number }[]): number {
  const d = Math.max(0, Math.min(90, deg));
  const pts = [...table].sort((a, b) => a.deg - b.deg);
  if (d <= pts[0]!.deg) return pts[0]!.factor;
  if (d >= pts[pts.length - 1]!.deg) return pts[pts.length - 1]!.factor;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (d >= a.deg && d <= b.deg) {
      const span = b.deg - a.deg;
      const t = span > 0 ? (d - a.deg) / span : 0;
      return a.factor + t * (b.factor - a.factor);
    }
  }
  return 1;
}

/** Combined orientation factor for one roof face (0–1). */
export function indiaFacetYieldFactor(
  azimuthDeg: number,
  tiltDeg: number = ROOF_LAYOUT_DEFAULT_TILT_DEG,
): number {
  const azFactor = interpolateCircularTable(azimuthDeg, INDIA_AZIMUTH_YIELD_TABLE);
  const tiltFactor = interpolateLinearTable(tiltDeg, INDIA_TILT_YIELD_SOUTH_TABLE);
  return Math.max(0.5, Math.min(1, azFactor * tiltFactor));
}

export type RoofLayoutYieldFacetInput = {
  azimuthDeg: number;
  panelCount: number;
  label?: string;
  tiltDeg?: number;
};

export type RoofLayoutYieldEstimate = {
  nameplateKw: number;
  effectiveKw: number;
  /** Percent loss from nameplate due to orientation (0–100). */
  orientationLossPercent: number;
  /** Effective kW × generation factor (informational). */
  estimatedAnnualKwh: number;
  defaultTiltDeg: number;
  generationFactorKwhPerKw: number;
  facetBreakdown: Array<{
    label?: string;
    azimuthDeg: number;
    panelCount: number;
    yieldFactor: number;
    nameplateKw: number;
    effectiveKw: number;
  }>;
};

export type EstimateRoofLayoutYieldInput = {
  facets: RoofLayoutYieldFacetInput[];
  moduleWatts: number;
  tiltDeg?: number;
  generationFactorKwhPerKw?: number;
};

/**
 * Panel-weighted effective kW from facet azimuths.
 * Returns null when there are no placed panels.
 */
export function estimateRoofLayoutYield(
  input: EstimateRoofLayoutYieldInput,
): RoofLayoutYieldEstimate | null {
  const moduleWatts =
    Number.isFinite(input.moduleWatts) && input.moduleWatts > 0 ? input.moduleWatts : 550;
  const tiltDeg = input.tiltDeg ?? ROOF_LAYOUT_DEFAULT_TILT_DEG;
  const generationFactorKwhPerKw =
    input.generationFactorKwhPerKw ?? ROOF_LAYOUT_DEFAULT_GENERATION_FACTOR_KWH_KW;

  const placed = input.facets.filter((f) => f.panelCount > 0);
  const totalPanels = placed.reduce((n, f) => n + f.panelCount, 0);
  if (totalPanels <= 0) return null;

  const facetBreakdown = placed.map((f) => {
    const yieldFactor = indiaFacetYieldFactor(f.azimuthDeg, f.tiltDeg ?? tiltDeg);
    const nameplateKw = (f.panelCount * moduleWatts) / 1000;
    return {
      label: f.label,
      azimuthDeg: f.azimuthDeg,
      panelCount: f.panelCount,
      yieldFactor,
      nameplateKw,
      effectiveKw: nameplateKw * yieldFactor,
    };
  });

  const nameplateKw = (totalPanels * moduleWatts) / 1000;
  const effectiveKw = facetBreakdown.reduce((sum, f) => sum + f.effectiveKw, 0);
  const orientationLossPercent =
    nameplateKw > 0 ? Math.max(0, ((nameplateKw - effectiveKw) / nameplateKw) * 100) : 0;

  return {
    nameplateKw,
    effectiveKw,
    orientationLossPercent,
    estimatedAnnualKwh: effectiveKw * generationFactorKwhPerKw,
    defaultTiltDeg: tiltDeg,
    generationFactorKwhPerKw,
    facetBreakdown,
  };
}

/** Build facet inputs from editor state (only sections with a drawn outline). */
export function yieldFacetsFromEditorState(facets: RoofFacetState[]): RoofLayoutYieldFacetInput[] {
  return facets
    .filter((f) => f.polygon && f.polygon.length >= 3)
    .map((f) => ({
      label: f.label,
      azimuthDeg: f.azimuthDeg,
      panelCount: f.panels.length,
    }));
}

export function roofLayoutYieldTooltip(estimate: RoofLayoutYieldEstimate): string {
  const loss = estimate.orientationLossPercent.toFixed(0);
  return (
    `Simplified India estimate at ${estimate.defaultTiltDeg}° tilt. ` +
    `Effective ${estimate.effectiveKw.toFixed(2)} kW vs ${estimate.nameplateKw.toFixed(2)} kW nameplate` +
    (estimate.orientationLossPercent >= 0.5 ? ` (−${loss}% orientation).` : '.') +
    ` ≈ ${Math.round(estimate.estimatedAnnualKwh).toLocaleString()} kWh/yr at ${estimate.generationFactorKwhPerKw} kWh/kW. Not a production guarantee.`
  );
}
