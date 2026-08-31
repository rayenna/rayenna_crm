/** Shaped loading placeholders for Zenith overview panels (not generic blocks). */

export function ZenithKpiSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="zenith-skeleton zenith-skeleton-kpi min-h-[7.5rem] rounded-xl min-w-0 sm:min-h-[8rem]" />
      ))}
    </div>
  )
}

export function ZenithOverviewPairSkeleton() {
  return (
    <div className="grid w-full grid-cols-1 gap-3 min-[744px]:grid-cols-2 min-[744px]:gap-4">
      <div className="zenith-skeleton zenith-skeleton-overview-panel rounded-xl min-h-[18rem] min-[744px]:min-h-[22rem]" />
      <div className="zenith-skeleton zenith-skeleton-overview-panel rounded-xl min-h-[18rem] min-[744px]:min-h-[22rem]" />
    </div>
  )
}

export function ZenithHitListPanelSkeleton() {
  return (
    <div className="zenith-skeleton zenith-skeleton-hit-list flex h-full min-h-[18rem] flex-col rounded-xl p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded-md bg-[color:color-mix(in_srgb,var(--bg-badge)_70%,transparent)]" />
          <div className="h-3 w-48 max-w-full rounded-md bg-[color:color-mix(in_srgb,var(--bg-badge)_55%,transparent)]" />
        </div>
        <div className="h-6 w-16 rounded-full bg-[color:color-mix(in_srgb,var(--bg-badge)_55%,transparent)]" />
      </div>
      <div className="mt-4 flex-1 space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-[color:color-mix(in_srgb,var(--bg-badge)_45%,transparent)]"
          />
        ))}
      </div>
    </div>
  )
}

export function ZenithFunnelSkeleton() {
  return (
    <div className="zenith-skeleton zenith-skeleton-funnel rounded-xl p-4 min-h-[12rem]">
      <div className="mb-3 h-4 w-24 rounded-md bg-[color:color-mix(in_srgb,var(--bg-badge)_60%,transparent)]" />
      <div className="h-28 rounded-lg bg-[color:color-mix(in_srgb,var(--bg-badge)_40%,transparent)]" />
    </div>
  )
}
