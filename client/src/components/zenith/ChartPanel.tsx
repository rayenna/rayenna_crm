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
      className={`zenith-glass rounded-2xl p-4 sm:p-5 min-h-[320px] flex flex-col ${className}`}
    >
      <div className="mb-3 sm:mb-4">
        <h3 className="zenith-display text-base sm:text-lg font-bold text-white tracking-tight">
          {title}
        </h3>
        {subtitle ? <p className="text-xs text-white/50 mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="flex-1 min-h-[240px] min-w-0">{children}</div>
    </div>
  )
}
