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
    <div
      className="flex h-full min-h-0 flex-col space-y-4 rounded-xl border border-indigo-100/60 bg-gradient-to-br from-indigo-50/50 to-gray-50/60 p-5 shadow-sm border-l-4"
      style={{ borderLeftColor: health.color }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-5 h-5 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-3m3 3V7m3 10v-5m6 7H6a2 2 0 01-2-2V5a2 2 0 012-2h13a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide truncate">
            Deal Health Score
          </h3>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold shadow-sm"
            style={{ background: health.color, color: '#0A0A0F' }}
          >
            {health.grade}
          </div>
          <div className="text-right leading-tight">
            <div className="text-lg font-extrabold tabular-nums" style={{ color: health.color }}>
              {health.score}
              <span className="text-xs font-semibold text-gray-400">/100</span>
            </div>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border"
              style={{
                background: `${health.color}18`,
                color: health.color,
                borderColor: `${health.color}40`,
              }}
            >
              {health.label}
            </span>
          </div>
        </div>
      </div>

      {health.factors.map((factor, index) => {
        const Icon = FACTOR_ICONS[factor.name]
        const pct = animated ? `${(factor.score / factor.max) * 100}%` : '0%'
        const scoreColor =
          factor.score === factor.max
            ? health.color
            : factor.score === 0
              ? '#FF4757'
              : 'rgba(255,255,255,0.5)'

        return (
          <div key={factor.name} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon size={14} className="text-gray-400 shrink-0" strokeWidth={1.6} />}
                <span className="text-sm font-semibold text-gray-700 shrink-0">{factor.name}</span>
                <span className="text-xs text-gray-500 truncate" title={factor.detail}>
                  — {factor.detail}
                </span>
              </div>
              <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: scoreColor }}>
                {factor.score}/{factor.max}
              </span>
            </div>
            <div className="w-full h-1 rounded bg-white/70 border border-gray-200 overflow-hidden">
              <div
                style={{
                  width: pct,
                  height: '100%',
                  background: health.color,
                  borderRadius: 2,
                  transition: `width 0.7s ease-out ${index * 0.1}s`,
                }}
              />
            </div>
          </div>
        )
      })}

      <div className="pt-3 border-t border-gray-200 text-sm text-gray-600 italic leading-relaxed">
        {health.insight}
      </div>
    </div>
  )
}

export default HealthDetail
