/**
 * Dashboard API may append the previous FY to `projectValueProfitByFY` when exactly one FY is filtered (YoY).
 * Zenith’s “Revenue & profit by financial year” chart should only show the FY(s) the user selected.
 */
export function projectValueRowsVisibleInZenithFyChart<T extends { fy: string }>(
  rows: T[],
  selectedFYs: string[],
): T[] {
  if (selectedFYs.length === 0) return rows
  const allow = new Set(selectedFYs)
  return rows.filter((r) => allow.has(r.fy))
}
