export type PeDashboardBucket = 'proposal-ready' | 'draft' | 'not-started' | 'rest'

/**
 * Build /projects URL with optional status, paymentStatus, availingLoan, peBucket and dashboard date filters (FY, Quarter, Month).
 * Pure function – safe to call on every render; URLSearchParams is lightweight.
 */
export function buildProjectsUrl(
  params: {
    status?: string[]
    paymentStatus?: string[]
    availingLoan?: boolean
    peBucket?: PeDashboardBucket
    leadSource?: string[]
    type?: string[]
    salespersonId?: string[]
    financingBank?: string[]
    zenithClosedFrom?: string
    zenithClosedTo?: string
    salespersonUnassigned?: boolean
    leadSourceIsNull?: boolean
    /** Mirrors Zenith explorer `matchesDashboardRevenueWhere` vs `inDashboardPipelineSlice`. */
    zenithSlice?: 'revenue' | 'pipeline'
    /** With `zenithSlice=revenue` + FY: same as FY profit chart drill (`gross_profit != null`). */
    zenithFyProfit?: boolean
    /** Exact panel brand (Project Lifecycle); use with `lifecycleSpecsComplete` for Zenith chart parity. */
    panelBrand?: string
    /** Exact inverter brand (Project Lifecycle). */
    inverterBrand?: string
    /** Require both panel and inverter brand entered (non-empty), matching Zenith lifecycle chart cohort. */
    lifecycleSpecsComplete?: boolean
    /** Free-text search (Projects list search box); used e.g. dashboard profitability word cloud drill. */
    search?: string
  },
  dashboardFilters: { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }
): string {
  const search = new URLSearchParams()
  params.status?.forEach((v) => search.append('status', v))
  params.paymentStatus?.forEach((v) => search.append('paymentStatus', v))
  if (params.availingLoan) search.append('availingLoan', 'true')
  if (params.peBucket) search.append('peBucket', params.peBucket)
  params.leadSource?.forEach((v) => search.append('leadSource', v))
  params.type?.forEach((v) => search.append('type', v))
  params.salespersonId?.forEach((v) => search.append('salespersonId', v))
  params.financingBank?.forEach((v) => search.append('financingBank', v))
  if (params.zenithClosedFrom) search.append('zenithClosedFrom', params.zenithClosedFrom)
  if (params.zenithClosedTo) search.append('zenithClosedTo', params.zenithClosedTo)
  if (params.salespersonUnassigned) search.append('salespersonUnassigned', 'true')
  if (params.leadSourceIsNull) search.append('leadSourceIsNull', 'true')
  if (params.zenithSlice) search.append('zenithSlice', params.zenithSlice)
  if (params.zenithFyProfit) search.append('zenithFyProfit', 'true')
  if (params.panelBrand != null && String(params.panelBrand).trim() !== '') {
    search.append('panelBrand', String(params.panelBrand).trim())
  }
  if (params.inverterBrand != null && String(params.inverterBrand).trim() !== '') {
    search.append('inverterBrand', String(params.inverterBrand).trim())
  }
  if (params.lifecycleSpecsComplete) search.append('lifecycleSpecsComplete', 'true')
  const q = params.search != null ? String(params.search).trim() : ''
  if (q !== '') search.append('search', q)
  dashboardFilters.selectedFYs.forEach((fy) => search.append('fy', fy))
  dashboardFilters.selectedQuarters.forEach((q) => search.append('quarter', q))
  dashboardFilters.selectedMonths.forEach((m) => search.append('month', m))
  const qs = search.toString()
  return qs ? `/projects?${qs}` : '/projects'
}
