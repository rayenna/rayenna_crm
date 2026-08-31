import { CheckCircle2 } from 'lucide-react'
import type { ZenithPriorityItem } from '../../utils/zenithPriorityItems'

function severityClass(severity: ZenithPriorityItem['severity']): string {
  switch (severity) {
    case 'critical':
      return 'border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)] hover:brightness-105'
    case 'warn':
      return 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] hover:brightness-105'
    default:
      return 'border-[color:var(--border-default)] bg-[color:var(--bg-badge)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent-teal-border)] hover:text-[color:var(--accent-teal)]'
  }
}

export default function ZenithPriorityRibbon({
  items,
  isLoading = false,
  onNavigate,
}: {
  items: ZenithPriorityItem[]
  isLoading?: boolean
  /** Switch mobile tab, expand panels, scroll with sticky offset, flash target. */
  onNavigate: (targetId: string) => void
}) {
  if (isLoading) {
    return (
      <div
        className="zenith-priority-ribbon mt-2 flex min-h-[36px] items-center gap-2"
        aria-hidden
      >
        <div className="zenith-skeleton h-8 w-28 rounded-full" />
        <div className="zenith-skeleton h-8 w-24 rounded-full" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className="zenith-priority-ribbon zenith-priority-ribbon--clear mt-2 flex min-h-[36px] items-center gap-2 rounded-lg border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)]/50 px-3 py-1.5"
        role="status"
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent-teal)]" aria-hidden />
        <span className="text-[11px] font-semibold text-[color:var(--accent-teal)]">
          All caught up in this view
        </span>
      </div>
    )
  }

  return (
    <div
      className="zenith-priority-ribbon mt-2 flex flex-wrap items-center gap-1.5"
      role="navigation"
      aria-label="Needs your attention"
    >
      <span className="mr-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
        Needs you
      </span>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.scrollTargetId)}
          className={[
            'inline-flex min-h-[32px] items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent-teal)]',
            severityClass(item.severity),
          ].join(' ')}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
