import { ProjectStatus } from '../types'
import type { ZenithExplorerProject } from '../types/zenithExplorer'

/** Stages where panel + inverter brand should be captured for reporting. */
const LIFECYCLE_BRAND_REMINDER_STATUSES = new Set<string>([
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
])

function brandEntered(v: string | null | undefined): boolean {
  return Boolean((v ?? '').trim())
}

/** Projects in target stages missing panel brand and/or inverter brand. */
export function zenithExplorerProjectsMissingLifecycleBrands(
  projects: ZenithExplorerProject[] | null | undefined,
): ZenithExplorerProject[] {
  if (!Array.isArray(projects) || projects.length === 0) return []
  return projects.filter((p) => {
    if (!LIFECYCLE_BRAND_REMINDER_STATUSES.has(String(p.projectStatus))) return false
    const panelOk = brandEntered(p.panel_brand)
    const invOk = brandEntered(p.inverter_brand)
    return !panelOk || !invOk
  })
}

const MAX_NAMES_IN_BRIEFING = 5

/** Comma-separated customer names; truncates with “and N more”. */
export function formatBriefingCustomerNameList(rows: ZenithExplorerProject[]): string {
  const names = rows.map((r) => (r.customer_name ?? '').trim() || 'Unknown').filter(Boolean)
  if (names.length === 0) return ''
  const shown = names.slice(0, MAX_NAMES_IN_BRIEFING)
  const rest = names.length - shown.length
  if (rest <= 0) return shown.join(', ')
  return `${shown.join(', ')} and ${rest} more`
}
