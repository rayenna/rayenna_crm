import type { ComplianceGapId } from './complianceGaps'
import type { DataSenseRuleId } from './dataSense'

/** Build query params for GET /api/projects and export endpoints (same filters; optional pagination). */

export type PeBucketParam = 'proposal-ready' | 'draft' | 'not-started' | 'rest' | 'active'

export type ProjectsListFiltersState = {
  status: string[]
  type: string[]
  customerType: string[]
  projectServiceType: string[]
  salespersonId: string[]
  leadSource: string[]
  supportTicketStatus: string[]
  paymentStatus: string[]
  hasDocuments: boolean
  availingLoan: boolean
  pendingSubsidy: boolean
  complianceGap: ComplianceGapId | null
  peBucket: PeBucketParam | null
  financingBank: string[]
  zenithClosedFrom: string | null
  zenithClosedTo: string | null
  salespersonUnassigned: boolean
  leadSourceIsNull: boolean
  zenithSlice: 'revenue' | 'pipeline' | null
  zenithFyProfit: boolean
  panelBrand: string
  inverterBrand: string
  lifecycleSpecsComplete: boolean
  lifecycleSpecsIncomplete: boolean
  dataSenseNeedsReview: boolean
  dataSenseRule: DataSenseRuleId | null
  /** Ask chart deep-link filters (no panel controls). */
  panelType?: string
  systemType?: string
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
  search?: string
  sortBy?: string
  sortOrder?: string
}

export type ProjectsListQueryInput = {
  filters: ProjectsListFiltersState
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  page?: number
  limit?: number
}

export function buildProjectListQueryParams(input: ProjectsListQueryInput): URLSearchParams {
  const { filters, selectedFYs, selectedQuarters, selectedMonths } = input
  const params = new URLSearchParams()

  filters.status.forEach((v) => params.append('status', v))
  filters.type.forEach((v) => params.append('type', v))
  filters.customerType.forEach((v) => params.append('customerType', v))
  filters.projectServiceType.forEach((v) => params.append('projectServiceType', v))
  filters.salespersonId.forEach((v) => params.append('salespersonId', v))
  filters.leadSource.forEach((v) => params.append('leadSource', v))
  filters.supportTicketStatus.forEach((v) => params.append('supportTicketStatus', v))
  filters.paymentStatus.forEach((v) => params.append('paymentStatus', v))
  selectedFYs.forEach((fy) => params.append('fy', fy))
  selectedQuarters.forEach((q) => params.append('quarter', q))
  selectedMonths.forEach((m) => params.append('month', m))

  if (filters.search?.trim()) params.append('search', filters.search.trim())
  if (filters.hasDocuments) params.append('hasDocuments', 'true')
  if (filters.availingLoan) params.append('availingLoan', 'true')
  if (filters.pendingSubsidy) params.append('pendingSubsidy', 'true')
  if (filters.complianceGap) params.append('complianceGap', filters.complianceGap)
  if (filters.peBucket) params.append('peBucket', filters.peBucket)
  filters.financingBank.forEach((v) => params.append('financingBank', v))
  if (filters.zenithClosedFrom) params.append('zenithClosedFrom', filters.zenithClosedFrom)
  if (filters.zenithClosedTo) params.append('zenithClosedTo', filters.zenithClosedTo)
  if (filters.salespersonUnassigned) params.append('salespersonUnassigned', 'true')
  if (filters.leadSourceIsNull) params.append('leadSourceIsNull', 'true')
  if (filters.zenithSlice) params.append('zenithSlice', filters.zenithSlice)
  if (filters.zenithFyProfit) params.append('zenithFyProfit', 'true')
  if (filters.lifecycleSpecsIncomplete) params.append('lifecycleSpecsIncomplete', 'true')
  if (filters.lifecycleSpecsComplete) params.append('lifecycleSpecsComplete', 'true')
  if (filters.dataSenseNeedsReview) params.append('dataSenseNeedsReview', 'true')
  if (filters.dataSenseRule) params.append('dataSenseRule', filters.dataSenseRule)
  if (filters.panelBrand) params.append('panelBrand', filters.panelBrand)
  if (filters.inverterBrand) params.append('inverterBrand', filters.inverterBrand)
  if (filters.panelType?.trim()) params.append('panelType', filters.panelType.trim())
  if (filters.systemType?.trim()) params.append('systemType', filters.systemType.trim())
  if (filters.roofType?.trim()) params.append('roofType', filters.roofType.trim())
  if (filters.statusIndicator?.trim()) {
    params.append('statusIndicator', filters.statusIndicator.trim().toUpperCase())
  }
  if (filters.projectStage?.trim()) params.append('projectStage', filters.projectStage.trim())
  if (filters.capacityMin != null && Number.isFinite(filters.capacityMin)) {
    params.append('capacityMin', String(filters.capacityMin))
  }
  if (filters.capacityMax != null && Number.isFinite(filters.capacityMax)) {
    params.append('capacityMax', String(filters.capacityMax))
  }
  if (filters.hubPlantLinked === true) params.append('hubPlantLinked', 'true')
  if (filters.hubPlantLinked === false) params.append('hubPlantLinked', 'false')
  if (filters.salespersonName?.trim()) {
    params.append('salespersonName', filters.salespersonName.trim())
  }
  if (filters.opsName?.trim()) params.append('opsName', filters.opsName.trim())
  if (filters.city?.trim()) params.append('city', filters.city.trim())
  if (filters.installationStatus?.trim()) {
    params.append('installationStatus', filters.installationStatus.trim())
  }
  if (filters.paymentMode?.trim()) params.append('paymentMode', filters.paymentMode.trim())
  if (filters.notAvailingLoan) params.append('notAvailingLoan', 'true')
  if (filters.sortBy) {
    params.append('sortBy', filters.sortBy)
    params.append('sortOrder', filters.sortOrder || 'desc')
  }

  if (input.page != null) params.append('page', String(input.page))
  if (input.limit != null) params.append('limit', String(input.limit))

  return params
}

export function buildProjectExportQueryParams(
  input: Omit<ProjectsListQueryInput, 'page' | 'limit'>,
): URLSearchParams {
  return buildProjectListQueryParams({ ...input, page: undefined, limit: undefined })
}
