/**
 * Projects list filters that typically arrive from Zenith / dashboard deep links
 * and have no matching control in the main filter panel.
 */
export const PROJECTS_DEEP_LINK_CHIP_IDS = new Set([
  'pe-bucket',
  'zenith-closed',
  'zenith-slice',
  'panel-brand',
  'inverter-brand',
  'lifecycle-incomplete',
  'lifecycle-complete',
  'sales-unassigned',
  'lead-null',
  'compliance-gap',
  'ask-panel-type',
  'ask-roof-type',
  'ask-status-indicator',
  'ask-project-stage',
  'ask-capacity',
  'ask-hub-plant',
  'ask-salesperson-name',
  'ask-ops-name',
  'ask-city',
  'ask-installation-status',
  'ask-payment-mode',
  'ask-not-loan',
  'ask-ids',
])

export function isProjectsDeepLinkChipId(id: string): boolean {
  if (PROJECTS_DEEP_LINK_CHIP_IDS.has(id)) return true
  return id.startsWith('bank-')
}

/** Patch that clears all deep-link-only filter fields (keeps panel filters intact). */
export type ProjectsDeepLinkFilterClearPatch = {
  peBucket: null
  financingBank: []
  zenithClosedFrom: null
  zenithClosedTo: null
  zenithSlice: null
  zenithFyProfit: false
  panelBrand: ''
  inverterBrand: ''
  lifecycleSpecsComplete: false
  lifecycleSpecsIncomplete: false
  salespersonUnassigned: false
  leadSourceIsNull: false
  complianceGap: null
  panelType: ''
  roofType: ''
  statusIndicator: ''
  projectStage: ''
  capacityMin: null
  capacityMax: null
  hubPlantLinked: null
  salespersonName: ''
  opsName: ''
  city: ''
  installationStatus: ''
  paymentMode: ''
  notAvailingLoan: false
  ids: []
}

export function projectsDeepLinkClearPatch(): ProjectsDeepLinkFilterClearPatch {
  return {
    peBucket: null,
    financingBank: [],
    zenithClosedFrom: null,
    zenithClosedTo: null,
    zenithSlice: null,
    zenithFyProfit: false,
    panelBrand: '',
    inverterBrand: '',
    lifecycleSpecsComplete: false,
    lifecycleSpecsIncomplete: false,
    salespersonUnassigned: false,
    leadSourceIsNull: false,
    complianceGap: null,
    panelType: '',
    roofType: '',
    statusIndicator: '',
    projectStage: '',
    capacityMin: null,
    capacityMax: null,
    hubPlantLinked: null,
    salespersonName: '',
    opsName: '',
    city: '',
    installationStatus: '',
    paymentMode: '',
    notAvailingLoan: false,
    ids: [],
  }
}

export function filtersHaveDeepLinkOnlyFields(filters: {
  peBucket: unknown
  financingBank: string[]
  zenithClosedFrom: string | null
  zenithClosedTo: string | null
  zenithSlice: unknown
  zenithFyProfit: boolean
  panelBrand: string
  inverterBrand: string
  lifecycleSpecsComplete: boolean
  lifecycleSpecsIncomplete: boolean
  salespersonUnassigned: boolean
  leadSourceIsNull: boolean
  complianceGap?: unknown
  panelType?: string
  roofType?: string
  statusIndicator?: string
  projectStage?: string
  capacityMin?: number | null
  capacityMax?: number | null
  hubPlantLinked?: boolean | null
  salespersonName?: string
  opsName?: string
  city?: string
  installationStatus?: string
  paymentMode?: string
  notAvailingLoan?: boolean
  ids?: string[]
}): boolean {
  return Boolean(
    filters.peBucket ||
      filters.financingBank.length > 0 ||
      filters.zenithClosedFrom ||
      filters.zenithClosedTo ||
      filters.zenithSlice ||
      filters.zenithFyProfit ||
      filters.panelBrand ||
      filters.inverterBrand ||
      filters.lifecycleSpecsComplete ||
      filters.lifecycleSpecsIncomplete ||
      filters.salespersonUnassigned ||
      filters.leadSourceIsNull ||
      filters.complianceGap ||
      filters.panelType ||
      filters.roofType ||
      filters.statusIndicator ||
      filters.projectStage ||
      filters.capacityMin != null ||
      filters.capacityMax != null ||
      filters.hubPlantLinked != null ||
      filters.salespersonName ||
      filters.opsName ||
      filters.city ||
      filters.installationStatus ||
      filters.paymentMode ||
      filters.notAvailingLoan ||
      (filters.ids && filters.ids.length > 0),
  )
}
