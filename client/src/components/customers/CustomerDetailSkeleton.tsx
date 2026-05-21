/** Loading placeholder aligned with CustomerDetail layout (header + meta + form sections). */
export function CustomerDetailSkeleton() {
  return (
    <>
      <div className="mb-4 border-b border-[color:var(--border-default)] pb-3 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="zenith-skeleton h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="zenith-skeleton h-7 w-48 max-w-[85%] rounded-lg sm:h-8" />
              <div className="zenith-skeleton h-4 w-36 max-w-[60%] rounded-md" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <div className="zenith-skeleton h-11 w-24 rounded-xl" />
            <div className="zenith-skeleton h-11 w-20 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-6">
        <div className="zenith-skeleton h-3 w-32 rounded-md" />
        <div className="zenith-skeleton mt-3 h-6 w-24 rounded-md" />
      </div>

      <div className="space-y-5 sm:space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]"
          >
            <div className="border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)] px-4 py-3.5 sm:px-5">
              <div className="zenith-skeleton h-4 w-28 rounded-md" />
            </div>
            <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
              <div className="zenith-skeleton h-10 w-full rounded-xl" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="zenith-skeleton h-10 rounded-xl" />
                <div className="zenith-skeleton h-10 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
