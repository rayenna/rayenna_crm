export function ProjectDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="zenith-skeleton h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="zenith-skeleton h-7 w-56 max-w-[85%] rounded-lg sm:h-8" />
            <div className="zenith-skeleton h-4 w-40 max-w-[60%] rounded-md" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="zenith-skeleton h-11 w-20 rounded-xl" />
          <div className="zenith-skeleton h-11 w-24 rounded-xl" />
        </div>
      </div>
      <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 sm:p-6">
        <div className="zenith-skeleton mb-4 h-5 w-32 rounded-md" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="zenith-skeleton h-3 w-24 rounded-md" />
              <div className="zenith-skeleton h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
