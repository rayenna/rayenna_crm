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
  },
  dashboardFilters: { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }
): string {
  const search = new URLSearchParams()
  params.status?.forEach((v) => search.append('status', v))
  params.paymentStatus?.forEach((v) => search.append('paymentStatus', v))
  if (params.availingLoan) search.append('availingLoan', 'true')
  if (params.peBucket) search.append('peBucket', params.peBucket)
  dashboardFilters.selectedFYs.forEach((fy) => search.append('fy', fy))
  dashboardFilters.selectedQuarters.forEach((q) => search.append('quarter', q))
  dashboardFilters.selectedMonths.forEach((m) => search.append('month', m))
  const qs = search.toString()
  return qs ? `/projects?${qs}` : '/projects'
}
