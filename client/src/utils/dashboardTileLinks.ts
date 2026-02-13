/**
 * Build /projects URL with optional status, paymentStatus and dashboard date filters (FY, Quarter, Month).
 * Pure function – safe to call on every render; URLSearchParams is lightweight.
 */
export function buildProjectsUrl(
  params: { status?: string[]; paymentStatus?: string[] },
  dashboardFilters: { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }
): string {
  const search = new URLSearchParams()
  params.status?.forEach((v) => search.append('status', v))
  params.paymentStatus?.forEach((v) => search.append('paymentStatus', v))
  dashboardFilters.selectedFYs.forEach((fy) => search.append('fy', fy))
  dashboardFilters.selectedQuarters.forEach((q) => search.append('quarter', q))
  dashboardFilters.selectedMonths.forEach((m) => search.append('month', m))
  const qs = search.toString()
  return qs ? `/projects?${qs}` : '/projects'
}
