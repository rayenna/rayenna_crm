import type { ReactNode } from 'react'

export default function ChartPanel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`zenith-glass rounded-xl p-3 sm:p-4 min-h-0 flex flex-col ${className}`}
    >
      <div className="mb-2 sm:mb-2.5 shrink-0">
        <h3 className="zenith-display text-sm sm:text-[15px] font-semibold text-white/95 tracking-tight">
          {title}
        </h3>
        {subtitle ? <p className="text-[11px] text-white/45 mt-0.5 leading-snug">{subtitle}</p> : null}
      </div>
      <div className="flex-1 min-h-[220px] min-w-0">{children}</div>
    </div>
  )
}
