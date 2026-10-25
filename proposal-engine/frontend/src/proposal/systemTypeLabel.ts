/**
 * CRM Project.systemType (Sales & Commercial) → the adjective in
 * “Proposal For … Solar Power Plant”.
 *
 * Labels match the CRM radio: Off-Grid, On-Grid, Hybrid.
 * When the project has no system type, the heading stays “On-Grid”.
 */
export function systemTypeHeadingTerm(systemType: string | null | undefined): string {
  const raw = (systemType ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (raw === 'OFF_GRID' || raw === 'OFFGRID') return 'Off-Grid';
  if (raw === 'HYBRID') return 'Hybrid';
  if (raw === 'ON_GRID' || raw === 'ONGRID') return 'On-Grid';
  return 'On-Grid';
}

export function proposalForHeading(
  systemSizeKw: number,
  systemType?: string | null,
): string {
  const size = systemSizeKw > 0 ? `${systemSizeKw} kW ` : '';
  return `${size}${systemTypeHeadingTerm(systemType)} Solar Power Plant`;
}
