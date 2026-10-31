import type { ComplianceGapId } from './complianceGaps'
import type { DataSenseRuleId } from './dataSense'

export type PeDashboardBucket = 'proposal-ready' | 'draft' | 'not-started' | 'rest'

/**
 * Build /projects URL with optional status, paymentStatus, availingLoan, peBucket and dashboard date filters (FY, Quarter, Month).
 * Pure function – safe to call on every render; URLSearchParams is lightweight.
 */
export function buildProjectsUrl(
  params: {
    status?: string[]
    paymentStatus?: string[]
    /** Only projects where Availing Loan/Financing is Yes. */
    availingLoan?: boolean
    /**
     * Subsidy segment + Completed status (awaiting subsidy credit;
     * excludes Completed – Subsidy Credited).
     */
    pendingSubsidy?: boolean
    /** Zenith Ask subsidy compliance backlog row. */
    complianceGap?: ComplianceGapId
    peBucket?: PeDashboardBucket
    leadSource?: string[]
    type?: string[]
    customerType?: string[]
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
    /** Late-stage projects missing panel and/or inverter brand (inverse of complete cohort). */
    lifecycleSpecsIncomplete?: boolean
    /** Data Sense: dates, payments, or capacity that do not match stage. */
    dataSenseNeedsReview?: boolean
    /** Optional single Data Sense rule when `dataSenseNeedsReview` is set. */
    dataSenseRule?: DataSenseRuleId
    /** Free-text search (Projects list search box); used e.g. dashboard profitability word cloud drill. */
    search?: string
    projectServiceType?: string[]
    panelType?: string
    systemType?: string
    roofType?: string
    statusIndicator?: string
    projectStage?: string
    capacityMin?: number
    capacityMax?: number
    hubPlantLinked?: boolean
    salespersonName?: string
    opsName?: string
    city?: string
    installationStatus?: string
    paymentMode?: string
    notAvailingLoan?: boolean
  },
  dashboardFilters: { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }
): string {
  const search = new URLSearchParams()
  params.status?.forEach((v) => search.append('status', v))
  params.paymentStatus?.forEach((v) => search.append('paymentStatus', v))
  if (params.availingLoan) search.append('availingLoan', 'true')
  if (params.notAvailingLoan) search.append('notAvailingLoan', 'true')
  if (params.pendingSubsidy) search.append('pendingSubsidy', 'true')
  if (params.complianceGap) search.append('complianceGap', params.complianceGap)
  if (params.peBucket) search.append('peBucket', params.peBucket)
  params.leadSource?.forEach((v) => search.append('leadSource', v))
  params.type?.forEach((v) => search.append('type', v))
  params.customerType?.forEach((v) => search.append('customerType', v))
  params.projectServiceType?.forEach((v) => search.append('projectServiceType', v))
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
  if (params.lifecycleSpecsIncomplete) search.append('lifecycleSpecsIncomplete', 'true')
  if (params.lifecycleSpecsComplete) search.append('lifecycleSpecsComplete', 'true')
  if (params.dataSenseNeedsReview) search.append('dataSenseNeedsReview', 'true')
  if (params.dataSenseRule) search.append('dataSenseRule', params.dataSenseRule)
  if (params.panelType?.trim()) search.append('panelType', params.panelType.trim())
  if (params.systemType?.trim()) search.append('systemType', params.systemType.trim())
  if (params.roofType?.trim()) search.append('roofType', params.roofType.trim())
  if (params.statusIndicator?.trim()) {
    search.append('statusIndicator', params.statusIndicator.trim().toUpperCase())
  }
  if (params.projectStage?.trim()) search.append('projectStage', params.projectStage.trim())
  if (params.capacityMin != null && Number.isFinite(params.capacityMin)) {
    search.append('capacityMin', String(params.capacityMin))
  }
  if (params.capacityMax != null && Number.isFinite(params.capacityMax)) {
    search.append('capacityMax', String(params.capacityMax))
  }
  if (params.hubPlantLinked === true) search.append('hubPlantLinked', 'true')
  if (params.hubPlantLinked === false) search.append('hubPlantLinked', 'false')
  if (params.salespersonName?.trim()) {
    search.append('salespersonName', params.salespersonName.trim())
  }
  if (params.opsName?.trim()) search.append('opsName', params.opsName.trim())
  if (params.city?.trim()) search.append('city', params.city.trim())
  if (params.installationStatus?.trim()) {
    search.append('installationStatus', params.installationStatus.trim())
  }
  if (params.paymentMode?.trim()) search.append('paymentMode', params.paymentMode.trim())
  const q = params.search != null ? String(params.search).trim() : ''
  if (q !== '') search.append('search', q)
  dashboardFilters.selectedFYs.forEach((fy) => search.append('fy', fy))
  dashboardFilters.selectedQuarters.forEach((q) => search.append('quarter', q))
  dashboardFilters.selectedMonths.forEach((m) => search.append('month', m))
  const qs = search.toString()
  return qs ? `/projects?${qs}` : '/projects'
}

/** Build Lost Deals report URL preserving Zenith/dashboard FY · Quarter · Month filters. */
export function buildLostDealsUrl(dashboardFilters: {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}): string {
  const search = new URLSearchParams()
  dashboardFilters.selectedFYs.forEach((fy) => search.append('fy', fy))
  dashboardFilters.selectedQuarters.forEach((q) => search.append('quarter', q))
  dashboardFilters.selectedMonths.forEach((m) => search.append('month', m))
  const qs = search.toString()
  return qs ? `/reports/lost-deals?${qs}` : '/reports/lost-deals'
}
