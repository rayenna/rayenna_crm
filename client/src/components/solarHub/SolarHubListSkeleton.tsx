type Props = {
  /** Approximate number of placeholder rows. */
  rows?: number
  /** Cards (narrow) vs table-ish list skeleton. */
  variant?: 'cards' | 'table'
}

/**
 * Shared loading skeleton for Solar Hub list pages.
 */
export default function SolarHubListSkeleton({ rows = 5, variant = 'cards' }: Props) {
  if (variant === 'table') {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] ring-1 ring-[color:var(--border-default)]"
        aria-busy="true"
        aria-label="Loading"
      >
        <div className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-3">
          <div className="h-3 w-48 animate-pulse rounded bg-[color:var(--bg-muted)]" />
        </div>
        <ul className="m-0 list-none divide-y divide-[color:var(--border-default)] p-0">
          {Array.from({ length: rows }, (_, i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-3 w-24 animate-pulse rounded bg-[color:var(--bg-muted)]" />
              <div className="h-3 w-36 animate-pulse rounded bg-[color:var(--bg-muted)]" />
              <div className="ml-auto h-3 w-16 animate-pulse rounded bg-[color:var(--bg-muted)]" />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <ul
      className="m-0 flex list-none flex-col gap-2.5 p-0"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3.5 ring-1 ring-[color:var(--border-default)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-[color:var(--bg-muted)]" />
              <div className="h-3 w-48 animate-pulse rounded bg-[color:var(--bg-muted)]" />
              <div className="h-2.5 w-40 animate-pulse rounded bg-[color:var(--bg-muted)]" />
            </div>
            <div className="h-3 w-14 animate-pulse rounded bg-[color:var(--bg-muted)]" />
          </div>
          <div className="mt-3 flex gap-1.5">
            <div className="h-5 w-16 animate-pulse rounded-full bg-[color:var(--bg-muted)]" />
            <div className="h-5 w-12 animate-pulse rounded-full bg-[color:var(--bg-muted)]" />
          </div>
        </li>
      ))}
    </ul>
  )
}
