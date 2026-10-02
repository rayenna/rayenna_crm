import { setSessionStorageItem } from '../lib/safeLocalStorage'

export const PROJECTS_TABLE_DENSITY_KEY = 'rayenna_projects_table_density'
export const PROJECTS_HIDDEN_COLS_KEY = 'rayenna_projects_hidden_cols'
export const PROJECTS_LAST_PRESET_KEY = 'rayenna_projects_last_preset'

export type ProjectsTableDensity = 'comfortable' | 'compact'

/** Columns the user can hide. Project + Stage stay always visible. */
export type ProjectsOptionalCol =
  | 'dh'
  | 'segment'
  | 'capacity'
  | 'order'
  | 'payment'
  | 'lead'
  | 'confirm'

export const PROJECTS_OPTIONAL_COLS: ProjectsOptionalCol[] = [
  'dh',
  'segment',
  'capacity',
  'order',
  'payment',
  'lead',
  'confirm',
]

export const PROJECTS_OPTIONAL_COL_LABELS: Record<ProjectsOptionalCol, string> = {
  dh: 'Deal Health (DH)',
  segment: 'Segment',
  capacity: 'Capacity',
  order: 'Order value',
  payment: 'Payment',
  lead: 'Lead source',
  confirm: 'Confirmation date',
}

/** Phone table “Slim” preset — hide the widest secondary columns. */
export const PROJECTS_SLIM_HIDDEN_COLS: ProjectsOptionalCol[] = [
  'segment',
  'lead',
  'confirm',
]

/** Set once after seeding Slim on first mobile table visit (session). */
export const PROJECTS_MOBILE_TABLE_COLS_SEEDED_KEY = 'rayenna_projects_mobile_table_cols_seeded'

const OPTIONAL_COLS = PROJECTS_OPTIONAL_COLS

function orderedHidden(cols: Iterable<ProjectsOptionalCol>): ProjectsOptionalCol[] {
  const set = new Set(cols)
  return OPTIONAL_COLS.filter((c) => set.has(c))
}

/** True when Segment, Lead source, and Confirmation date are all hidden. */
export function isProjectsSlimCols(hidden: ProjectsOptionalCol[]): boolean {
  return PROJECTS_SLIM_HIDDEN_COLS.every((c) => hidden.includes(c))
}

/** Hide Segment / Lead / Confirm; keep any other already-hidden columns. */
export function applyProjectsSlimCols(hidden: ProjectsOptionalCol[]): ProjectsOptionalCol[] {
  return orderedHidden([...hidden, ...PROJECTS_SLIM_HIDDEN_COLS])
}

/** Show Segment / Lead / Confirm again; leave other hidden columns alone. */
export function clearProjectsSlimCols(hidden: ProjectsOptionalCol[]): ProjectsOptionalCol[] {
  const slim = new Set<ProjectsOptionalCol>(PROJECTS_SLIM_HIDDEN_COLS)
  return orderedHidden(hidden.filter((c) => !slim.has(c)))
}

/**
 * First time a phone opens Table view with no saved column prefs → Slim.
 * Does not override an existing hidden-cols preference.
 */
export function seedMobileTableSlimColsIfNeeded(
  isNarrow: boolean,
  listViewMode: 'cards' | 'table',
): ProjectsOptionalCol[] | null {
  if (!isNarrow || listViewMode !== 'table') return null
  try {
    if (sessionStorage.getItem(PROJECTS_MOBILE_TABLE_COLS_SEEDED_KEY) === '1') return null
    sessionStorage.setItem(PROJECTS_MOBILE_TABLE_COLS_SEEDED_KEY, '1')
    if (sessionStorage.getItem(PROJECTS_HIDDEN_COLS_KEY) != null) return null
    writeProjectsHiddenCols(PROJECTS_SLIM_HIDDEN_COLS)
    return [...PROJECTS_SLIM_HIDDEN_COLS]
  } catch {
    return null
  }
}

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
  let total = w.project + w.stage
  if (!hidden.includes('dh')) total += w.dh
  if (!hidden.includes('segment')) total += w.segment
  if (!hidden.includes('capacity')) total += w.capacity
  if (!hidden.includes('order')) total += w.order
  if (!hidden.includes('payment')) total += w.payment
  if (!hidden.includes('lead')) total += w.lead
  if (!hidden.includes('confirm')) total += w.confirm
  return total
}

/** Always-on Project + Stage, plus any optional cols not hidden. Viewport no longer overrides prefs. */
export function countProjectsTableVisibleCols(hidden: ProjectsOptionalCol[]): number {
  let n = 2
  for (const id of OPTIONAL_COLS) {
    if (!hidden.includes(id)) n += 1
  }
  return n
}
