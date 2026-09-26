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
      filters.leadSourceIsNull,
  )
}
