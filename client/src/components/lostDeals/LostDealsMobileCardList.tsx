import type { ReactNode } from 'react'
import { lostReasonLabel } from '../../utils/lostReasonLabels'

export type LostDealCardProject = {
  id: string
  slNo: number | null
  customerName: string | null
  salespersonName: string | null
  year: string | null
  projectCost: number | null
  lostReason: string | null
  lostDate: string | null
}

type Props = {
  projects: LostDealCardProject[]
  onOpen: (projectId: string) => void
  formatInr: (n: number) => string
  formatShortDate: (iso: string | null) => string
  emptySlot?: ReactNode
}

function reasonLabel(reason: string | null): { text: string; uncategorized: boolean } {
  if (!reason) return { text: 'Uncategorized', uncategorized: true }
  return { text: lostReasonLabel(reason) || reason, uncategorized: false }
}

/**
 * Narrow-viewport Lost projects list — whole card opens project detail.
 */
export default function LostDealsMobileCardList({
  projects,
  onOpen,
  formatInr,
  formatShortDate,
  emptySlot,
}: Props) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-4 py-10 text-center ring-1 ring-[color:var(--border-default)]">
        {emptySlot ?? (
          <p className="text-sm text-[color:var(--text-muted)]">No projects match this view</p>
        )}
      </div>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label="Lost projects">
      {projects.map((p) => {
        const reason = reasonLabel(p.lostReason)
        return (
          <li key={p.id}>
            <div
              role="link"
              tabIndex={0}
              onClick={() => onOpen(p.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpen(p.id)
                }
              }}
              className="w-full cursor-pointer touch-manipulation rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3.5 text-left shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] transition-[border-color,background-color] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-table-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[color:var(--text-primary)]">
                    {p.customerName || '—'}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[color:var(--text-muted)]">
                    #{p.slNo ?? '—'}
                    {p.salespersonName ? ` · ${p.salespersonName}` : ''}
                    {p.year ? ` · ${p.year}` : ''}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums text-sm font-bold text-[color:var(--text-primary)]">
                  {formatInr(Number(p.projectCost) || 0)}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {reason.uncategorized ? (
                  <span className="rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--accent-gold)]">
                    Uncategorized
                  </span>
                ) : (
                  <span className="rounded-md border border-[color:var(--border-default)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--text-secondary)]">
                    {reason.text}
                  </span>
                )}
              </div>

              <div className="mt-3 border-t border-[color:var(--border-default)] pt-2.5 text-[11px] text-[color:var(--text-muted)]">
                Lost {formatShortDate(p.lostDate)}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
