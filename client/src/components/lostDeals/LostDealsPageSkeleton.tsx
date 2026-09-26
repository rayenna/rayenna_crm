type Props = {
  narrow?: boolean
}

/**
 * Full-page loading skeleton for Lost Deals (KPIs + list + insights cue).
 */
export default function LostDealsPageSkeleton({ narrow = false }: Props) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading Lost Deals">
      <div className={`grid grid-cols-2 gap-2.5 ${narrow ? '' : 'lg:grid-cols-4'}`}>
        {(narrow ? [1, 2] : [1, 2, 3, 4]).map((i) => (
          <div key={i} className="zenith-skeleton h-24 rounded-xl" />
        ))}
      </div>
      {narrow ? <div className="zenith-skeleton h-4 w-48 rounded" /> : null}
      <div className="space-y-2.5">
        <div className="zenith-skeleton h-5 w-32 rounded" />
        <div className="zenith-skeleton h-11 w-full rounded-xl" />
        {(narrow ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6]).map((i) => (
          <div
            key={i}
            className={`zenith-skeleton rounded-xl ${narrow ? 'h-[5.5rem]' : 'h-12'}`}
          />
        ))}
      </div>
      <div className="zenith-skeleton h-11 w-full rounded-xl" />
    </div>
  )
}
