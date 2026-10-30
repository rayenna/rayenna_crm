import type { SalesReviewDealView } from '../../utils/salesReviewDealView'

type DealListQuickViewProps = {
  value: SalesReviewDealView
  openCount: number
  closedCount: number
  onChange: (value: SalesReviewDealView) => void
}

const OPTIONS: Array<{
  key: Exclude<SalesReviewDealView, ''>
  label: string
  title: string
}> = [
  { key: 'open', label: 'Open', title: 'Lead, Site Survey, and Proposal' },
  { key: 'closed', label: 'Closed', title: 'Confirmed Order and Under Installation' },
]

export default function DealListQuickView({
  value,
  openCount,
  closedCount,
  onChange,
}: DealListQuickViewProps) {
  const counts = { open: openCount, closed: closedCount }

  return (
    <div
      className="flex w-full min-w-0 items-stretch rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-0.5 sm:w-auto print:hidden"
      role="group"
      aria-label="Deal list quick view"
    >
      <span className="hidden shrink-0 items-center px-2.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)] sm:inline-flex">
        Quick view
      </span>
      {OPTIONS.map((opt) => {
        const active = value === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            title={opt.title}
            aria-pressed={active}
            onClick={() => onChange(active ? '' : opt.key)}
            className={`inline-flex min-h-[40px] flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold transition-colors sm:min-h-[32px] sm:flex-none sm:px-3.5 ${
              active
                ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)] shadow-sm ring-1 ring-[color:var(--accent-gold-border)]'
                : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]'
            }`}
          >
            {opt.label}
            <span
              className={`tabular-nums text-[10px] font-bold sm:text-[11px] ${
                active ? 'text-[color:var(--accent-gold)]' : 'text-[color:var(--text-muted)]'
              }`}
            >
              {counts[opt.key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
