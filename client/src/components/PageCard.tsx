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
  /** Tighter horizontal padding on the content area (wide data tables). */
  dense?: boolean
  /** Match Zenith Command Centre (glass / card + gold banner header). */
  variant?: 'default' | 'zenith'
}

/**
 * Page container: surfaces follow `data-theme` via CSS variables.
 * `variant="zenith"` uses banner tokens (full gold gradient in dark, tinted band in light).
 */
const PageCard = ({
  title,
  subtitle,
  icon,
  headerAction,
  children,
  className = '',
  dense = false,
  variant = 'default',
}: PageCardProps) => {
  const contentPad = dense
    ? 'px-2 sm:px-3 md:px-4 lg:px-5 py-5 sm:py-6'
    : 'px-2 sm:px-6 md:px-8 py-6 sm:py-8'

  if (variant === 'zenith') {
    return (
      <div
        className={`overflow-x-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] ring-1 ring-[color:var(--border-default)] ${className}`}
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div
          className="theme-page-banner-zenith border-b border-[color:var(--border-default)] px-4 py-4 sm:px-6 sm:py-5"
          style={{
            background: 'var(--banner-bg)',
            color: 'var(--banner-text)',
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="shrink-0 rounded-xl border border-[color:var(--border-strong)] p-2.5 shadow-inner"
                style={{
                  background: 'var(--bg-badge)',
                  boxShadow: 'inset 0 1px 0 var(--border-default)',
                }}
              >
                {icon ?? (
                  <svg
                    className="h-5 w-5 drop-shadow-sm"
                    style={{ color: 'var(--banner-text)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                    />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <h1
                  className="zenith-display truncate text-xl font-extrabold tracking-tight sm:text-2xl"
                  style={{ color: 'var(--banner-text)' }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p
                    className="mt-0.5 truncate text-sm sm:text-base"
                    style={{ color: 'var(--banner-subtext)' }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
          </div>
        </div>

        <div className={`${contentPad} overflow-visible`}>{children}</div>
      </div>
    )
  }

  return (
    <div
      className={`overflow-x-hidden rounded-2xl border-2 border-[color:var(--border-default)] bg-[color:var(--bg-card)] ${className}`}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="theme-page-banner-zenith border-b border-[color:var(--border-default)] px-6 py-5 sm:px-8 sm:py-6"
        style={{
          background: 'var(--banner-bg)',
          color: 'var(--banner-text)',
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl border border-[color:var(--border-strong)] p-2.5 shadow-lg"
              style={{ background: 'var(--bg-badge)' }}
            >
              {icon ?? (
                <svg
                  className="h-5 w-5 drop-shadow-sm"
                  style={{ color: 'var(--banner-text)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-xl font-extrabold drop-shadow sm:text-2xl" style={{ color: 'var(--banner-text)' }}>
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 text-sm sm:text-base" style={{ color: 'var(--banner-subtext)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      </div>

      <div className={`${contentPad} overflow-visible`}>{children}</div>
    </div>
  )
}

export default PageCard
