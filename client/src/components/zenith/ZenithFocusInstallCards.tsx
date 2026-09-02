import type { ZenithAutoFocusSection } from '../../hooks/useQuickAction'
import type { InstallRow } from './zenithFocusRowTypes'
import { ZenithFocusCardList } from './ZenithFocusCardShell'
import ZenithFocusInstallProgress from './ZenithFocusInstallProgress'
import {
  formatInstallShortDate,
  installPulseProjectNameColor,
  installPulseRowOverdue,
  installPulseStageLabel,
} from './zenithInstallPulseUtils'

type Props = {
  rows: InstallRow[]
  emptyMessage?: string
  onOpenDrawer?: (p: { id: string; customerName?: string; stageLabel?: string }, section?: ZenithAutoFocusSection) => void
  onOpenOperationsDrawer?: (projectId: string) => void
}

export default function ZenithFocusInstallCards({
  rows,
  emptyMessage = 'No confirmed or under-installation projects for this period.',
  onOpenDrawer,
  onOpenOperationsDrawer,
}: Props) {
  const showLogUpdate = Boolean(onOpenOperationsDrawer || onOpenDrawer)

  return (
    <ZenithFocusCardList isEmpty={rows.length === 0} emptyMessage={emptyMessage}>
      {rows.map((r) => {
        const overdue = installPulseRowOverdue(r)
        const nameColor = installPulseProjectNameColor(r.projectStatus)
        const note = r.lastNote?.trim() || ''
        return (
          <article
            key={r.projectId}
            className={`py-3.5 first:pt-2 ${overdue ? 'bg-red-500/5' : 'hover:bg-[color:var(--bg-table-hover)]'}`}
            role="listitem"
          >
            <div className="flex items-start gap-2 min-w-0">
              <span
                className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${overdue ? 'bg-red-400' : 'bg-emerald-400'}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[15px] truncate" style={{ color: nameColor }} title={r.customerName}>
                  {r.customerName}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-[color:var(--text-muted)]">
                  Sl No.: {r.projectSerialNumber != null ? r.projectSerialNumber : '—'}
                  {r.kW != null ? ` · ${r.kW.toFixed(2)} kW` : ''}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-[color:var(--text-secondary)]" title={r.salespersonName}>
                  {r.salespersonName}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-[color:var(--text-muted)]">
              Start {formatInstallShortDate(r.startDate)} → Expected {formatInstallShortDate(r.expectedCompletion)}
            </p>
            {note ? (
              <p className="mt-1.5 text-[12px] text-[color:var(--text-secondary)] line-clamp-2" title={note}>
                {note}
              </p>
            ) : (
              <p className="mt-1.5 text-[12px] italic text-[color:var(--text-muted)]">No notes yet</p>
            )}
            <div className="mt-2.5">
              <ZenithFocusInstallProgress row={r} />
            </div>
            {showLogUpdate ? (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenOperationsDrawer) {
                      onOpenOperationsDrawer(r.projectId)
                      return
                    }
                    onOpenDrawer?.(
                      {
                        id: r.projectId,
                        customerName: r.customerName,
                        stageLabel: installPulseStageLabel(r.projectStatus),
                      },
                      'note',
                    )
                  }}
                  className="min-h-[44px] rounded-lg border border-[color:var(--accent-teal-border)] bg-transparent px-3 py-2 text-[12px] font-semibold text-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-muted)] touch-manipulation"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  + Log update
                </button>
              </div>
            ) : null}
          </article>
        )
      })}
    </ZenithFocusCardList>
  )
}
