/** Deal-list quick views on Sales Review (browser-only list filter). */

export const SALES_REVIEW_OPEN_VIEW_STATUSES = ['LEAD', 'SITE_SURVEY', 'PROPOSAL'] as const
export const SALES_REVIEW_CLOSED_VIEW_STATUSES = ['CONFIRMED', 'UNDER_INSTALLATION'] as const

export type SalesReviewDealView = '' | 'open' | 'closed'

const OPEN_SET = new Set<string>(SALES_REVIEW_OPEN_VIEW_STATUSES)
const CLOSED_SET = new Set<string>(SALES_REVIEW_CLOSED_VIEW_STATUSES)

export function parseSalesReviewDealView(value: unknown): SalesReviewDealView {
  return value === 'open' || value === 'closed' ? value : ''
}

export function dealMatchesQuickView(stageStatus: string, view: SalesReviewDealView): boolean {
  if (!view) return true
  if (view === 'open') return OPEN_SET.has(stageStatus)
  return CLOSED_SET.has(stageStatus)
}

export function countDealQuickViews(deals: Array<{ stageStatus: string }>): {
  open: number
  closed: number
} {
  let open = 0
  let closed = 0
  for (const d of deals) {
    if (OPEN_SET.has(d.stageStatus)) open += 1
    else if (CLOSED_SET.has(d.stageStatus)) closed += 1
  }
  return { open, closed }
}
