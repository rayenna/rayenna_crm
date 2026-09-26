import { setSessionStorageItem } from '../lib/safeLocalStorage'

export const PROJECTS_TABLE_DENSITY_KEY = 'rayenna_projects_table_density'
export const PROJECTS_HIDDEN_COLS_KEY = 'rayenna_projects_hidden_cols'
export const PROJECTS_LAST_PRESET_KEY = 'rayenna_projects_last_preset'

export type ProjectsTableDensity = 'comfortable' | 'compact'
export type ProjectsOptionalCol = 'segment' | 'lead' | 'confirm'

const OPTIONAL_COLS: ProjectsOptionalCol[] = ['segment', 'lead', 'confirm']

export function readProjectsTableDensity(): ProjectsTableDensity {
  try {
    const v = sessionStorage.getItem(PROJECTS_TABLE_DENSITY_KEY)
    return v === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

export function writeProjectsTableDensity(density: ProjectsTableDensity): void {
  setSessionStorageItem(PROJECTS_TABLE_DENSITY_KEY, density)
}

export function readProjectsHiddenCols(): ProjectsOptionalCol[] {
  try {
    const raw = sessionStorage.getItem(PROJECTS_HIDDEN_COLS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((c): c is ProjectsOptionalCol =>
      OPTIONAL_COLS.includes(c as ProjectsOptionalCol),
    )
  } catch {
    return []
  }
}

export function writeProjectsHiddenCols(cols: ProjectsOptionalCol[]): void {
  setSessionStorageItem(PROJECTS_HIDDEN_COLS_KEY, JSON.stringify(cols))
}

export function readProjectsLastPresetId(): string | null {
  try {
    return sessionStorage.getItem(PROJECTS_LAST_PRESET_KEY)
  } catch {
    return null
  }
}

export function writeProjectsLastPresetId(id: string | null): void {
  if (id == null) {
    try {
      sessionStorage.removeItem(PROJECTS_LAST_PRESET_KEY)
    } catch {
      // ignore
    }
    return
  }
  setSessionStorageItem(PROJECTS_LAST_PRESET_KEY, id)
}

/** Rem widths for fixed desktop table layout (lg+). */
export function projectsTableColRemWidths(density: ProjectsTableDensity): {
  project: number
  dh: number
  segment: number
  stage: number
  capacity: number
  order: number
  payment: number
  lead: number
  confirm: number
} {
  if (density === 'compact') {
    return {
      project: 14,
      dh: 4,
      segment: 9,
      stage: 9,
      capacity: 7.5,
      order: 9,
      payment: 8,
      lead: 7.5,
      confirm: 10,
    }
  }
  return {
    project: 16,
    dh: 4.5,
    segment: 11,
    stage: 11,
    capacity: 9,
    order: 11,
    payment: 10,
    lead: 9,
    confirm: 12,
  }
}

export function projectsTableTotalRemWidth(
  density: ProjectsTableDensity,
  hidden: ProjectsOptionalCol[],
): number {
  const w = projectsTableColRemWidths(density)
  let total = w.project + w.dh + w.stage + w.capacity + w.order + w.payment
  if (!hidden.includes('segment')) total += w.segment
  if (!hidden.includes('lead')) total += w.lead
  if (!hidden.includes('confirm')) total += w.confirm
  return total
}

export function countProjectsTableVisibleCols(
  viewportWidth: number,
  hidden: ProjectsOptionalCol[],
): number {
  // Always-on: Project, DH, Stage, Capacity, Order, Payment
  let n = 6
  const showSegment = !hidden.includes('segment') && viewportWidth >= 1024
  const showLead = !hidden.includes('lead') && viewportWidth >= 768
  const showConfirm = !hidden.includes('confirm') && viewportWidth >= 640
  if (showSegment) n += 1
  if (showLead) n += 1
  if (showConfirm) n += 1
  return n
}
