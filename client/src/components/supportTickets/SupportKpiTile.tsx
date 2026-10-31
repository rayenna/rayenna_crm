import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { useCountUp, ZENITH_KPI_COUNT_UP_MS } from '../../hooks/useCountUp'

type Tone = 'gold' | 'blue' | 'red'

const ICON_TONE: Record<Tone, string> = {
  gold: 'text-[color:var(--accent-gold)]',
  blue: 'text-[color:var(--accent-blue)]',
  red: 'text-[color:var(--accent-red)]',
}

export default function SupportKpiTile({
  label,
  value,
  icon: Icon,
  selected,
  onClick,
  index,
  tone = 'gold',
}: {
  label: string
  value: number
  icon: LucideIcon
  selected: boolean
  onClick: () => void
  index: number
  tone?: Tone
}) {
  const animated = useCountUp(Number.isFinite(value) ? value : 0, ZENITH_KPI_COUNT_UP_MS, 0)

  return (
    <button
      type="button"
      onClick={onClick}
      className="block h-full min-w-0 w-full rounded-xl border-0 bg-transparent p-0 text-left touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-page)]"
      aria-pressed={selected}
      aria-label={`Filter queue: ${label}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`zenith-kpi-card zenith-kpi-card--drill relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 sm:p-3.5 group transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-px ${
          selected
            ? 'border-[color:var(--accent-gold-border)] ring-[color:var(--accent-gold-border)]'
            : 'border-[color:var(--border-card)] ring-[color:var(--border-default)] hover:border-[color:var(--border-strong)]'
        }`}
      >
        <div
          className="zenith-kpi-card__blob pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.18]"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--accent-gold) 55%, transparent) 0%, transparent 70%)',
          }}
        />
        <div className="relative mb-1.5 flex shrink-0 items-start gap-2 pr-2">
          <div className="shrink-0 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-1.5">
            <Icon className={`h-[18px] w-[18px] ${ICON_TONE[tone]}`} strokeWidth={2} aria-hidden />
          </div>
        </div>
        <p className="zenith-kpi-value relative shrink-0 text-lg tabular-nums leading-tight text-[color:var(--text-primary)] sm:text-xl">
          {Math.round(animated).toLocaleString('en-IN')}
        </p>
        <p className="mt-1 line-clamp-2 shrink-0 text-[10px] font-semibold uppercase leading-tight tracking-wider text-[color:var(--text-secondary)]">
          {label}
        </p>
        <p className="zenith-kpi-drill-hint mt-1 shrink-0 text-[9px] font-semibold text-[color:var(--accent-teal)] opacity-80 group-hover:opacity-100">
          Opens list →
        </p>
      </motion.div>
    </button>
  )
}
