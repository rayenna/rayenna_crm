import { ReactNode } from 'react'

interface PageCardProps {
  title: string
  subtitle?: string
  /** Optional icon (e.g. SVG). If not provided, default info icon is used. */
  icon?: ReactNode
  /** Optional content to show in the header strip (e.g. action button). */
  headerAction?: ReactNode
  children: ReactNode
  /** Optional class for the outer wrapper (e.g. max-w-full for layout). */
  className?: string
}

/**
 * Page container with the same color theme and visual styling as the About page:
 * gradient card, primary-to-yellow header strip, and padded content area.
 */
const PageCard = ({ title, subtitle, icon, headerAction, children, className = '' }: PageCardProps) => {
  return (
    <div
      className={`bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm ${className}`}
    >
      <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-primary-100 bg-gradient-to-r from-primary-600 via-primary-500 to-yellow-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg shadow-black/10 backdrop-blur-md">
              {icon ?? (
                <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 text-white/90 text-sm sm:text-base">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {children}
      </div>
    </div>
  )
}

export default PageCard
