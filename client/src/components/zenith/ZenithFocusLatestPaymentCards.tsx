import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import type { LatestPaymentRow } from './zenithFocusRowTypes'
import { ZenithFocusCardList } from './ZenithFocusCardShell'
import { paymentRadarProjectNameColor } from './zenithPaymentRadarUi'

function installmentTypeLabel(type: LatestPaymentRow['installmentType']): string {
  if (type === 'ADVANCE') return 'Advance'
  if (type === 'PAYMENT_1') return 'Payment 1'
  if (type === 'PAYMENT_2') return 'Payment 2'
  if (type === 'PAYMENT_3') return 'Payment 3'
  return 'Last'
}

type Props = {
  rows: LatestPaymentRow[]
  emptyMessage?: string
  onOpenFinanceDrawer?: (projectId: string) => void
}

export default function ZenithFocusLatestPaymentCards({
  rows,
  emptyMessage = 'No recent payments found for this period.',
  onOpenFinanceDrawer,
}: Props) {
  return (
    <ZenithFocusCardList isEmpty={rows.length === 0} emptyMessage={emptyMessage}>
      {rows.map((r) => {
        const sp = (r.salespersonName ?? '').trim() || 'Unassigned'
        const nameColor = paymentRadarProjectNameColor(r.paymentStatus ?? undefined)
        const typeLabel = installmentTypeLabel(r.installmentType)
        let receivedLabel = '—'
        try {
          receivedLabel = r.receivedAt ? format(parseISO(r.receivedAt), 'dd MMM yy') : '—'
        } catch {
          /* ignore */
        }
        const nameClassName =
          'font-semibold block truncate text-left w-full bg-transparent border-0 cursor-pointer p-0 transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] rounded-sm text-[15px]'
        return (
          <article
            key={`${r.projectId}-${r.installmentType}-${r.receivedAt}`}
            className="py-3.5 first:pt-2 hover:bg-[color:var(--bg-table-hover)]"
            role="listitem"
          >
            {onOpenFinanceDrawer ? (
              <button
                type="button"
                onClick={() => onOpenFinanceDrawer(r.projectId)}
                className={nameClassName}
                style={{ color: nameColor }}
                title={r.customerName}
              >
                {r.customerName}
              </button>
            ) : (
              <Link
                to={`/projects/${r.projectId}`}
                className={nameClassName}
                style={{ color: nameColor }}
                title={r.customerName}
              >
                {r.customerName}
              </Link>
            )}
            <p className="mt-0.5 text-[11px] tabular-nums text-[color:var(--text-muted)]">
              Sl No.: {r.projectSerialNumber != null ? r.projectSerialNumber : '—'} · {sp}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span className="text-[15px] font-semibold tabular-nums text-[color:var(--text-secondary)]">
                ₹{Math.round(r.amount).toLocaleString('en-IN')}
              </span>
              <span className="text-[color:var(--text-muted)]">{receivedLabel}</span>
              <span className="text-[color:var(--text-secondary)]">{typeLabel}</span>
            </div>
          </article>
        )
      })}
    </ZenithFocusCardList>
  )
}
