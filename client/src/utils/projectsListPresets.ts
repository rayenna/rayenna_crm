import { ProjectStatus, UserRole } from '../types'

export type ProjectsPresetId =
  | 'open-pipeline'
  | 'needs-review'
  | 'availing-loan'
  | 'pending-subsidy'
  | 'outstanding-payment'

export type ProjectsPresetDef = {
  id: ProjectsPresetId
  label: string
  description: string
  /** Hide for Operations when early-stage pipeline is out of scope */
  roles?: UserRole[]
}

export const PROJECTS_PRESET_DEFS: ProjectsPresetDef[] = [
  {
    id: 'open-pipeline',
    label: 'Open pipeline',
    description: 'Active deals before completion (excludes Completed and Lost)',
  },
  {
    id: 'needs-review',
    label: 'Needs review',
    description: 'Projects flagged for dates, payments, or capacity mismatches',
  },
  {
    id: 'availing-loan',
    label: 'Availing loan',
    description: 'Financing / loan marked Yes',
  },
  {
    id: 'pending-subsidy',
    label: 'Pending subsidy',
    description: 'Subsidy segment + Completed, awaiting subsidy credit',
  },
  {
    id: 'outstanding-payment',
    label: 'Outstanding payment',
    description: 'Partial or pending payment',
  },
]

export function projectsPresetsForRole(role: UserRole | undefined): ProjectsPresetDef[] {
  return PROJECTS_PRESET_DEFS.filter((p) => {
    if (!p.roles) return true
    return role != null && p.roles.includes(role)
  })
}

/** Pre-completion stages for “Open pipeline”. Intersect with role-allowed statuses. */
export function openPipelineStatusValues(allowedStatusValues: string[]): string[] {
  const open = new Set<string>([
    ProjectStatus.LEAD,
    ProjectStatus.SITE_SURVEY,
    ProjectStatus.PROPOSAL,
    ProjectStatus.CONFIRMED,
    ProjectStatus.UNDER_INSTALLATION,
  ])
  return allowedStatusValues.filter((s) => open.has(s))
}

export type ProjectsPresetFilterPatch = {
  status: string[]
  paymentStatus: string[]
  hasDocuments: boolean
  availingLoan: boolean
  pendingSubsidy: boolean
  dataSenseNeedsReview: boolean
  dataSenseRule: null
  peBucket: null
  type: string[]
  financingBank: string[]
  zenithClosedFrom: null
  zenithClosedTo: null
  salespersonUnassigned: boolean
  leadSourceIsNull: boolean
  zenithSlice: null
  zenithFyProfit: boolean
  panelBrand: string
  inverterBrand: string
  lifecycleSpecsComplete: boolean
  lifecycleSpecsIncomplete: boolean
}

/**
 * Build filter overrides for a preset. Caller merges onto current filters
 * (keeps search, sales, lead source, dates unless cleared separately).
 */
export function buildProjectsPresetPatch(
  id: ProjectsPresetId,
  opts: {
    defaultStatusValues: string[]
    allowedStatusValues: string[]
  },
): ProjectsPresetFilterPatch {
  const base: ProjectsPresetFilterPatch = {
    status: [...opts.defaultStatusValues],
    paymentStatus: [],
    hasDocuments: false,
    availingLoan: false,
    pendingSubsidy: false,
    dataSenseNeedsReview: false,
    dataSenseRule: null,
    peBucket: null,
    type: [],
    financingBank: [],
    zenithClosedFrom: null,
    zenithClosedTo: null,
    salespersonUnassigned: false,
    leadSourceIsNull: false,
    zenithSlice: null,
    zenithFyProfit: false,
    panelBrand: '',
    inverterBrand: '',
    lifecycleSpecsComplete: false,
    lifecycleSpecsIncomplete: false,
  }

  switch (id) {
    case 'open-pipeline': {
      const open = openPipelineStatusValues(opts.allowedStatusValues)
      return { ...base, status: open.length > 0 ? open : [...opts.defaultStatusValues] }
    }
    case 'needs-review':
      return { ...base, dataSenseNeedsReview: true }
    case 'availing-loan':
      return { ...base, availingLoan: true }
    case 'pending-subsidy':
      return { ...base, pendingSubsidy: true }
    case 'outstanding-payment':
      return { ...base, paymentStatus: ['PARTIAL', 'PENDING'] }
    default:
      return base
  }
}
