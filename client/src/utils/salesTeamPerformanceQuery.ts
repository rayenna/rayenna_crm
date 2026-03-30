/**
 * Single React Query key for GET /api/sales-team-performance so charts that share
 * the same FY/Qtr/Month filters dedupe to one network request (e.g. Management dashboard).
 */
export const SALES_TEAM_PERFORMANCE_QUERY_KEY = 'salesTeamPerformance' as const

/** Order must match prior keys: FYs, months, quarters (same query string param semantics). */
export function salesTeamPerformanceQueryKey(
  selectedFYs: string[],
  selectedMonths: string[],
  selectedQuarters: string[],
) {
  return [SALES_TEAM_PERFORMANCE_QUERY_KEY, selectedFYs, selectedMonths, selectedQuarters] as const
}
