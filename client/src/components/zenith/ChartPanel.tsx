import type { ReactNode } from 'react'

export default function ChartPanel({
  title,
  subtitle,
  children,
  className = '',
  contentClassName = '',
  showExploreHint,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  /** Merged into the chart/content area wrapper (e.g. `min-h-0 flex-1 relative` for fill-height Recharts). */
  contentClassName?: string
  /** When set, shows a subtle “click to explore” cue next to the title (Zenith drill-down). */
  showExploreHint?: boolean
}) {
  return (
    <div
      className={`zenith-glass rounded-xl p-3 sm:p-4 min-h-0 flex flex-col ${className}`}
    >
      <div className="mb-2 sm:mb-2.5 shrink-0 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="zenith-display text-sm sm:text-[15px] font-semibold text-white/95 tracking-tight">
            {title}
          </h3>
          {subtitle ? <p className="text-[11px] text-white/45 mt-0.5 leading-snug">{subtitle}</p> : null}
        </div>
        {showExploreHint ? (
          <span
            className="shrink-0 pt-0.5 italic text-[10px] text-white/[0.25]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Click to explore →
          </span>
        ) : null}
      </div>
      <div
        className={
          contentClassName.trim()
            ? `flex-1 min-w-0 ${contentClassName}`.trim()
            : 'flex-1 min-h-[220px] min-w-0'
        }
      >
        {children}
      </div>
    </div>
  )
}
