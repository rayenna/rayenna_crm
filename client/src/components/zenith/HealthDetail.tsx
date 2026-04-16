import { useEffect, useState } from 'react'
import { Clock, TrendingUp, IndianRupee, Calendar, Users } from 'lucide-react'
import { computeDealHealth } from '../../utils/dealHealthScore'
import type { Project } from '../../types'

const FACTOR_ICONS: Record<string, typeof Clock> = {
  Activity: Clock,
  Momentum: TrendingUp,
  'Deal Value': IndianRupee,
  'Close Date': Calendar,
  'Lead Source': Users,
}

type HealthDetailProps = {
  project: Project
}

const HealthDetail = ({ project }: HealthDetailProps) => {
  const health = computeDealHealth(project as unknown as Record<string, unknown>)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [project.id, project.updatedAt])

  if (!health) return null

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-4"
      style={{ borderLeftColor: health.color }}
      aria-labelledby="deal-health-heading"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)] px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-[color:var(--accent-teal)] [&>svg]:h-5 [&>svg]:w-5" aria-hidden>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-3m3 3V7m3 10v-5m6 7H6a2 2 0 01-2-2V5a2 2 0 012-2h13a2 2 0 012 2v14a2 2 0 01-2 2z"
              />
            </svg>
          </span>
          <h2
            id="deal-health-heading"
            className="truncate text-xs font-bold uppercase tracking-wider text-[color:var(--zenith-table-header-fg)]"
          >
            Deal Health Score
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-md ring-1 ring-[color:var(--border-strong)]"
            style={{ background: health.color, color: 'var(--text-inverse)' }}
          >
            {health.grade}
          </div>
          <div className="text-right leading-tight">
            <div className="text-lg font-extrabold tabular-nums" style={{ color: health.color }}>
              {health.score}
              <span className="text-xs font-semibold text-[color:var(--text-muted)]">/100</span>
            </div>
            <span
              className="mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: `${health.color}22`,
                color: health.color,
                borderColor: `${health.color}55`,
              }}
            >
              {health.label}
            </span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        {health.factors.map((factor, index) => {
          const Icon = FACTOR_ICONS[factor.name]
          const pct = animated ? `${(factor.score / factor.max) * 100}%` : '0%'
          const scoreColor =
            factor.score === factor.max
              ? health.color
              : factor.score === 0
                ? 'var(--accent-red)'
                : 'var(--accent-gold)'

          return (
            <div key={factor.name} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {Icon && (
                    <Icon
                      size={18}
                      className="mt-0.5 shrink-0 text-[color:var(--accent-teal)]"
                      strokeWidth={2.25}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-[color:var(--text-primary)]">{factor.name}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-[color:var(--text-secondary)]" title={factor.detail}>
                      {factor.detail}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: scoreColor }}>
                  {factor.score}/{factor.max}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] shadow-inner">
                <div
                  style={{
                    width: pct,
                    height: '100%',
                    background: health.color,
                    borderRadius: 9999,
                    transition: `width 0.7s ease-out ${index * 0.1}s`,
                  }}
                />
              </div>
            </div>
          )
        })}

        <div className="border-t border-[color:var(--border-default)] pt-3 text-sm italic leading-relaxed text-[color:var(--text-secondary)]">
          {health.insight}
        </div>
      </div>
    </section>
  )
}

export default HealthDetail
