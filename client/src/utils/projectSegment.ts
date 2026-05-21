import { ProjectType } from '../types'

export const PROJECT_SEGMENT_LABELS: Record<ProjectType, string> = {
  [ProjectType.SUBSIDY]: 'Subsidy',
  [ProjectType.NON_SUBSIDY]: 'Non-Subsidy',
}

const LEGACY_SUBSIDY = 'RESIDENTIAL_SUBSIDY'
const LEGACY_NON_SUBSIDY = new Set(['RESIDENTIAL_NON_SUBSIDY', 'COMMERCIAL_INDUSTRIAL'])

export function getProjectSegmentLabel(type: string): string {
  if (type in PROJECT_SEGMENT_LABELS) {
    return PROJECT_SEGMENT_LABELS[type as ProjectType]
  }
  if (type === LEGACY_SUBSIDY) return 'Subsidy'
  if (LEGACY_NON_SUBSIDY.has(type)) return 'Non-Subsidy'
  return type.replace(/_/g, ' ')
}

export function isSubsidyProjectType(type: string): boolean {
  return type === ProjectType.SUBSIDY || type === LEGACY_SUBSIDY
}

export function defaultPanelTypeForProjectSegment(type: string): 'DCR' | 'Non-DCR' {
  return isSubsidyProjectType(type) ? 'DCR' : 'Non-DCR'
}

export const PROJECT_SEGMENT_FILTER_OPTIONS = Object.values(ProjectType).map((value) => ({
  value,
  label: getProjectSegmentLabel(value),
}))

export function getProjectSegmentPillClasses(type: string): string {
  if (type === ProjectType.SUBSIDY || type === LEGACY_SUBSIDY) {
    return 'border border-[color:var(--accent-red-border)] bg-[color:color-mix(in srgb,var(--accent-red) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
  }
  if (
    type === ProjectType.NON_SUBSIDY ||
    LEGACY_NON_SUBSIDY.has(type)
  ) {
    return 'border border-[color:var(--accent-blue-border)] bg-[color:color-mix(in srgb,var(--accent-blue) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
  }
  return 'border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)]'
}

export function projectSegmentLabels(type: string): { full: string; compact: string } {
  const full = getProjectSegmentLabel(type)
  const compact =
    type === ProjectType.SUBSIDY || type === LEGACY_SUBSIDY
      ? 'Subsidy'
      : type === ProjectType.NON_SUBSIDY || LEGACY_NON_SUBSIDY.has(type)
        ? 'Non-subs.'
        : full
  return { full, compact }
}
