import { ZENITH_MONTHS, ZENITH_QUARTERS } from '../components/zenith/zenithFilterConstants'

const MONTH_LABEL = new Map(ZENITH_MONTHS.map((m) => [m.value, m.label]))
const QUARTER_LABEL = new Map(ZENITH_QUARTERS.map((q) => [q.value, q.label]))

/** Compact filter context for the command bar (FY · quarter · month). */
export function formatZenithFilterSummary(
  selectedFYs: string[],
  selectedQuarters: string[],
  selectedMonths: string[],
): string {
  const parts: string[] = []

  if (selectedFYs.length === 1) {
    parts.push(selectedFYs[0]!)
  } else if (selectedFYs.length > 1) {
    parts.push(`${selectedFYs.length} FYs`)
  } else {
    parts.push('All FYs')
  }

  if (selectedQuarters.length === 1) {
    parts.push(QUARTER_LABEL.get(selectedQuarters[0] as (typeof ZENITH_QUARTERS)[number]['value']) ?? selectedQuarters[0]!)
  } else if (selectedQuarters.length > 1) {
    parts.push(`${selectedQuarters.length} quarters`)
  }

  if (selectedMonths.length === 1) {
    parts.push(MONTH_LABEL.get(selectedMonths[0] as (typeof ZENITH_MONTHS)[number]['value']) ?? selectedMonths[0]!)
  } else if (selectedMonths.length > 1) {
    parts.push(`${selectedMonths.length} months`)
  }

  return parts.join(' · ')
}
