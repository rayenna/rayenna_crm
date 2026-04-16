import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  gradient?: string
  iconColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  to?: string
  /** Dark glass styling for Zenith-style admin pages (default matches dashboard). */
  variant?: 'default' | 'zenith'
}

const MetricCard = ({ title, value, icon, gradient, trend, to, variant = 'default' }: MetricCardProps) => {
  const defaultGradient = gradient || 'from-primary-500 to-primary-600'
  const isZenith = variant === 'zenith'
  const baseClassName = isZenith
    ? 'group relative min-w-0 overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] transition-[box-shadow,border-color,background-color] duration-200 hover:border-[color:var(--accent-gold-border)] hover:bg-[color:var(--bg-card-hover)] motion-reduce:transition-none'
    : 'group relative bg-white rounded-2xl shadow-sm hover:shadow-md overflow-hidden border border-slate-200/80 hover:border-primary-300/60 min-w-0 transition-[box-shadow,border-color] duration-200 motion-reduce:transition-none'
  const cardClassName = to ? `${baseClassName} block no-underline text-inherit cursor-pointer` : baseClassName

  const content = (
    <>
      {!isZenith ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/15 via-transparent to-amber-50/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
          <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary-100/35 opacity-60 group-hover:opacity-90 transition-opacity duration-200 pointer-events-none" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color:var(--accent-gold-muted)] via-transparent to-[color:var(--accent-teal-muted)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[color:var(--bg-surface)] opacity-70 transition-opacity duration-200 group-hover:opacity-100" />
        </>
      )}

      <div className="relative p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div
            className={`p-3 sm:p-3.5 rounded-xl bg-gradient-to-br ${defaultGradient} shadow-md group-hover:scale-[1.02] transition-transform duration-200 relative overflow-hidden flex-shrink-0 motion-reduce:transition-none motion-reduce:group-hover:scale-100`}
          >
            <div
              className={`relative text-xl sm:text-2xl lg:text-[1.6rem] ${isZenith ? 'text-[color:var(--text-inverse)]' : 'text-white'}`}
            >
              {icon}
            </div>
          </div>
          {trend && (
            <div
              className={`flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm border ${
                isZenith
                  ? trend.isPositive
                    ? 'border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                    : 'border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]'
                  : trend.isPositive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <span className="mr-1">{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-2 min-w-0 flex-1">
          <div
            className={`text-xl sm:text-2xl lg:text-3xl xl:text-[2rem] font-extrabold transition-colors duration-200 break-words leading-tight ${
              isZenith
                ? 'text-[color:var(--text-primary)] group-hover:text-[color:var(--accent-gold)]'
                : 'text-slate-900 group-hover:text-primary-800'
            }`}
          >
            <span className="block" title={String(value)}>
              {value}
            </span>
          </div>
          <div
            className={`text-xs sm:text-sm font-semibold transition-colors duration-200 ${
              isZenith
                ? 'text-[color:var(--text-muted)] group-hover:text-[color:var(--text-secondary)]'
                : 'text-slate-500 group-hover:text-primary-700'
            }`}
            title={title}
          >
            {title}
          </div>
          {to && (
            <div
              className={`flex items-center gap-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pt-0.5 ${
                isZenith ? 'text-[color:var(--accent-teal)]' : 'text-primary-600'
              }`}
            >
              <span>View projects</span>
              <span aria-hidden>→</span>
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cardClassName}>
        {content}
      </Link>
    )
  }
  return <div className={cardClassName}>{content}</div>
}

export default MetricCard
