import { ROOF_LAYOUT_PANEL_SPACING_M } from '../roofLayoutConstants';

/** Gap between module edges in the packer (metres), before row spacing factor. */
export function moduleEdgeGapMetres(panelSpacingMultiplier: number): number {
  const mult =
    Number.isFinite(panelSpacingMultiplier) && panelSpacingMultiplier > 0
      ? panelSpacingMultiplier
      : 1.5;
  return ROOF_LAYOUT_PANEL_SPACING_M * mult;
}

export function formatModuleEdgeGapHint(panelSpacingMultiplier: number): string {
  const gapMm = Math.round(moduleEdgeGapMetres(panelSpacingMultiplier) * 1000);
  return `This layout uses ≈ ${gapMm} mm between module edges (Medium ≈ 300 mm).`;
}

export const INDIA_ROOF_LAYOUT_HINTS = {
  panelTitle: 'India layout notes',
  disclaimer:
    'Informational only — not a compliance check. Confirm final layout on site with DISCOM and state requirements.',
  edgeSetback:
    'Typical rooftop practice in India: leave about 0.3–0.6 m from parapet or wall edges for maintenance access and wind. Use the setback slider above, then Refill panels. Steeper pitches or local bylaws may need more clearance.',
  moduleGap:
    'Module frames often sit with ~15–20 mm between neighbours; flat roofs commonly use ~300–500 mm between rows for cleaning and drainage. Wider Panel density gaps help maintenance paths — tighter gaps fit more modules but leave less walk space.',
} as const;
