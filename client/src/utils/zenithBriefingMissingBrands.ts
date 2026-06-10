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

export type LifecycleBrandMissingKind = 'panel' | 'inverter' | 'both'

/** Which lifecycle brand fields are still empty. */
export function lifecycleBrandMissingKind(
  p: Pick<ZenithExplorerProject, 'panel_brand' | 'inverter_brand'>,
): LifecycleBrandMissingKind {
  const panelOk = brandEntered(p.panel_brand)
  const invOk = brandEntered(p.inverter_brand)
  if (!panelOk && !invOk) return 'both'
  if (!panelOk) return 'panel'
  return 'inverter'
}

export function lifecycleBrandMissingLabel(kind: LifecycleBrandMissingKind): string {
  if (kind === 'both') return 'Panel & inverter'
  if (kind === 'panel') return 'Panel brand'
  return 'Inverter brand'
}

export function projectDisplayLabel(
  p: Pick<ZenithExplorerProject, 'customer_name' | 'project_serial_number'>,
): string {
  const name = (p.customer_name ?? '').trim() || 'Unknown'
  if (p.project_serial_number != null) return `#${p.project_serial_number} ${name}`.trim()
  return name
}

export function myDayTaskContentForLifecycleGap(
  p: Pick<ZenithExplorerProject, 'customer_name' | 'panel_brand' | 'inverter_brand'>,
): string {
  const name = (p.customer_name ?? '').trim() || 'project'
  const kind = lifecycleBrandMissingKind(p)
  if (kind === 'both') return `Enter panel & inverter brands — ${name}`
  if (kind === 'panel') return `Enter panel brand — ${name}`
  return `Enter inverter brand — ${name}`
}

/** Comma-separated customer names; truncates with “and N more”. */
export function formatBriefingCustomerNameList(rows: ZenithExplorerProject[]): string {
  const names = rows.map((r) => (r.customer_name ?? '').trim() || 'Unknown').filter(Boolean)
  if (names.length === 0) return ''
  const shown = names.slice(0, MAX_NAMES_IN_BRIEFING)
  const rest = names.length - shown.length
  if (rest <= 0) return shown.join(', ')
  return `${shown.join(', ')} and ${rest} more`
}
