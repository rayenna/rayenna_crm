import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import type { FinanceOverdueRow } from './zenithFocusRowTypes'
import { ZenithFocusCardList } from './ZenithFocusCardShell'
import { paymentRadarProjectNameColor } from './zenithPaymentRadarUi'

type Props = {
  rows: FinanceOverdueRow[]
  emptyMessage: string
  onOpenFinanceDrawer?: (projectId: string) => void
  onRemind: (row: FinanceOverdueRow) => void
}

function ProjectNameButton({
  row,
  onOpenFinanceDrawer,
}: {
  row: FinanceOverdueRow
  onOpenFinanceDrawer?: (projectId: string) => void
}) {
  const nameColor = paymentRadarProjectNameColor(row.paymentStatus)
  const className =
    'font-semibold block truncate text-left w-full bg-transparent border-0 cursor-pointer p-0 transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] rounded-sm text-[15px]'
  if (onOpenFinanceDrawer) {
    return (
      <button
        type="button"
        onClick={() => onOpenFinanceDrawer(row.projectId)}
        className={className}
        style={{ color: nameColor }}
        title={row.customerName}
      >
        {row.customerName}
      </button>
    )
  }
  return (
    <Link
      to={`/projects/${row.projectId}`}
      className={className}
      style={{ color: nameColor }}
      title={row.customerName}
    >
      {row.customerName}
    </Link>
  )
}

export default function ZenithFocusOverdueCards({
  rows,
  emptyMessage,
  onOpenFinanceDrawer,
  onRemind,
}: Props) {
  return (
    <ZenithFocusCardList isEmpty={rows.length === 0} emptyMessage={emptyMessage}>
      {rows.map((r) => {
        const sp = (r.salespersonName ?? '').trim() || 'Unassigned'
        let dueLabel = '—'
        try {
          dueLabel = format(parseISO(r.dueSince), 'dd MMM yy')
        } catch {
          /* ignore */
        }
        return (
          <article key={r.projectId} className="py-3.5 first:pt-2 hover:bg-[color:var(--bg-table-hover)]" role="listitem">
            <ProjectNameButton row={r} onOpenFinanceDrawer={onOpenFinanceDrawer} />
            <p className="mt-0.5 text-[11px] tabular-nums text-[color:var(--text-muted)]">
              Sl No.: {r.projectSerialNumber != null ? r.projectSerialNumber : '—'} · {sp}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold tabular-nums text-[color:var(--text-secondary)]">
                ₹{Math.round(r.amount).toLocaleString('en-IN')}
              </span>
              <span className="text-[12px] text-[color:var(--text-muted)]">Since {dueLabel}</span>
              <span className="inline-flex items-center rounded-md bg-red-500/25 text-[color:var(--accent-red)] text-[10px] font-bold px-1.5 py-0.5 tabular-nums">
                {r.daysOverdue}d
              </span>
            </div>
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => onRemind(r)}
                className="min-h-[44px] rounded-lg px-3 text-[13px] font-bold text-[color:var(--accent-teal)] hover:underline bg-transparent border-0 cursor-pointer touch-manipulation"
              >
                Remind
              </button>
            </div>
          </article>
        )
      })}
    </ZenithFocusCardList>
  )
}
