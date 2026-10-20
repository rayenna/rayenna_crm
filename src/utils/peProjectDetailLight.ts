/** Light GET /projects/:id payload — summaries for Dashboard/open, no document blobs. */

export const PE_PROPOSAL_LIGHT_SELECT = {
  id: true,
  projectId: true,
  createdById: true,
  refNumber: true,
  generatedAt: true,
  summary: true,
  includeRoofLayout: true,
  savedAt: true,
  updatedAt: true,
} as const;

/** Roof metrics/URLs for list + detail chrome. Roof editor loads geometry separately. */
export const PE_ROOF_LAYOUT_METRICS_SELECT = {
  roofAreaM2: true,
  usableAreaM2: true,
  panelCount: true,
  layoutImageUrl: true,
  layoutImage3dUrl: true,
  satelliteImageUrl: true,
  prefer3dForProposal: true,
  savedAt: true,
} as const;

export function jsonArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/** Drop the 25-year table; keep payback / savings / inputs for Dashboard tiles and CRM summary. */
export function slimRoiResultForClient(result: unknown): unknown {
  if (result == null || typeof result !== 'object') return result;
  return { ...(result as Record<string, unknown>), yearlyBreakdown: [] };
}
