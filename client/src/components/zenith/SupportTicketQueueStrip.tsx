import { Link } from 'react-router-dom'
import { Ticket } from 'lucide-react'

export type SupportQueueSummary = {
  open: number
  overdue: number
  hubOpen: number
}

export default function SupportTicketQueueStrip({ queue }: { queue: SupportQueueSummary }) {
  if (queue.open <= 0 && queue.overdue <= 0 && queue.hubOpen <= 0) return null

  const chips: Array<{ label: string; value: number; to: string; tone: 'red' | 'gold' | 'blue' }> = [
    { label: 'Overdue', value: queue.overdue, to: '/support-tickets?filter=overdue', tone: 'red' },
    { label: 'Open', value: queue.open, to: '/support-tickets?filter=open', tone: 'blue' },
    { label: 'Solar Hub', value: queue.hubOpen, to: '/support-tickets?filter=hub', tone: 'gold' },
  ]

  const toneClass = {
    red: 'border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]',
    gold: 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]',
    blue: 'border-[color:var(--accent-blue-border)] bg-[color:var(--accent-blue-muted)] text-[color:var(--accent-blue)]',
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Ticket className="h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Support tickets</p>
          <p className="hidden text-xs text-[color:var(--text-muted)] sm:block">Who is waiting on you today</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${toneClass[c.tone]}`}
            >
              <span>{c.label}</span>
              <span className="tabular-nums">{c.value}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
