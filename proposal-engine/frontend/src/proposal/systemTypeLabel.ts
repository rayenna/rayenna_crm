/**
 * CRM Project.systemType (Sales & Commercial) → labels used across the proposal.
 *
 * Labels match the CRM radio: Off-Grid, On-Grid, Hybrid.
 * When the project has no system type, copy stays “On-Grid”.
 */
export function systemTypeHeadingTerm(systemType: string | null | undefined): string {
  const raw = (systemType ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (raw === 'OFF_GRID' || raw === 'OFFGRID') return 'Off-Grid';
  if (raw === 'HYBRID') return 'Hybrid';
  if (raw === 'ON_GRID' || raw === 'ONGRID') return 'On-Grid';
  return 'On-Grid';
}

/** “a” / “an” before the system-type adjective when no kW is shown. */
export function systemTypeArticle(systemType: string | null | undefined): 'a' | 'an' {
  const term = systemTypeHeadingTerm(systemType);
  return /^[aeiou]/i.test(term) ? 'an' : 'a';
}

/** e.g. “15 kW Hybrid Solar Power Plant” or “Hybrid Solar Power Plant”. */
export function proposalForHeading(
  systemSizeKw: number,
  systemType?: string | null,
): string {
  const size = systemSizeKw > 0 ? `${systemSizeKw} kW ` : '';
  return `${size}${systemTypeHeadingTerm(systemType)} Solar Power Plant`;
}

/** Default Commercials line description (editable via `commercials-desc`). */
export function commercialsDescription(
  systemSizeKw: number,
  systemType?: string | null,
): string {
  if (systemSizeKw > 0) {
    return `Design, Supply, Installation & Commissioning of ${proposalForHeading(systemSizeKw, systemType)} including all electrical and structural work`;
  }
  return `Design, Supply, Installation & Commissioning of the ${systemTypeHeadingTerm(systemType)} Solar Power Plant including all electrical and structural work`;
}

/** e.g. “15 kW Hybrid Solar PV” for capacity chips. */
export function systemTypeCapacityChip(
  systemSizeKw: number,
  systemType?: string | null,
): string {
  return `${systemSizeKw} kW ${systemTypeHeadingTerm(systemType)} Solar PV`;
}

/**
 * Supply-of-equipment inverter line for Scope of Work.
 * On-Grid → string inverters; Off-Grid / Hybrid → matching inverter wording.
 */
export function systemTypeInverterSupplyLabel(systemType?: string | null): string {
  const term = systemTypeHeadingTerm(systemType);
  if (term === 'Off-Grid') return 'Off-grid inverter(s)';
  if (term === 'Hybrid') return 'Hybrid inverter(s)';
  return 'On-grid string inverter(s)';
}

/**
 * Keep saved inline edits (e.g. scope-intro) aligned with the live CRM system type.
 * Only rewrites plant / inverter phrases — leaves company copy like
 * “On-Grid, Off-Grid, and Hybrid Solar Power Plants” alone.
 */
export function rewriteSystemTypeMentions(
  text: string,
  systemType?: string | null,
): string {
  const term = systemTypeHeadingTerm(systemType);
  const inverter = systemTypeInverterSupplyLabel(systemType);
  return text
    .replace(/\b(Off-Grid|On-Grid|Hybrid)\s+Solar Power Plant\b/gi, `${term} Solar Power Plant`)
    .replace(/\b(Off-Grid|On-Grid|Hybrid)\s+Solar Photovoltaic\b/gi, `${term} Solar Photovoltaic`)
    .replace(/\b(Off-Grid|On-Grid|Hybrid)\s+Solar PV\b/gi, `${term} Solar PV`)
    // No trailing \b — ")" is non-word, so \b after "(s)" never matches.
    .replace(/\b(On-grid string|Off-grid|Hybrid)\s+inverter\(s\)/gi, inverter);
}

export function rewriteSystemTypeInOverrides(
  map: Record<string, string | undefined>,
  systemType?: string | null,
): Record<string, string | undefined> {
  let changed = false;
  const next: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(map)) {
    if (value == null || value === '') {
      next[key] = value;
      continue;
    }
    const rewritten = rewriteSystemTypeMentions(value, systemType);
    if (rewritten !== value) changed = true;
    next[key] = rewritten;
  }
  return changed ? next : map;
}
