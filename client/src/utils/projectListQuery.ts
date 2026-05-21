/** Build query params for GET /api/projects and export endpoints (same filters; optional pagination). */

export type PeBucketParam = 'proposal-ready' | 'draft' | 'not-started' | 'rest'

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
  if (filters.peBucket) params.append('peBucket', filters.peBucket)
  filters.financingBank.forEach((v) => params.append('financingBank', v))
  if (filters.zenithClosedFrom) params.append('zenithClosedFrom', filters.zenithClosedFrom)
  if (filters.zenithClosedTo) params.append('zenithClosedTo', filters.zenithClosedTo)
  if (filters.salespersonUnassigned) params.append('salespersonUnassigned', 'true')
  if (filters.leadSourceIsNull) params.append('leadSourceIsNull', 'true')
  if (filters.zenithSlice) params.append('zenithSlice', filters.zenithSlice)
  if (filters.zenithFyProfit) params.append('zenithFyProfit', 'true')
  if (filters.lifecycleSpecsComplete) params.append('lifecycleSpecsComplete', 'true')
  if (filters.panelBrand) params.append('panelBrand', filters.panelBrand)
  if (filters.inverterBrand) params.append('inverterBrand', filters.inverterBrand)
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
