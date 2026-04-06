/**
 * Compact project + assigned salesperson line for Zenith quick drawers.
 */
export default function ZenithDrawerProjectTitle({
  title,
  salespersonName,
}: {
  title: string
  salespersonName?: string | null
}) {
  const sales = salespersonName?.trim() || null
  const nameTooltip =
    title && title !== '—' && title !== 'Loading…' ? title : undefined

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-2 min-w-0">
        <span
          className="min-w-0 flex-1 truncate text-white font-bold text-[16px]"
          style={{ fontFamily: "'Syne', sans-serif" }}
          title={nameTooltip}
        >
          {title}
        </span>
        <span
          className="shrink-0 max-w-[min(11rem,42%)] truncate text-[11px] leading-snug"
          style={{ fontFamily: 'var(--zenith-font-body), DM Sans, sans-serif' }}
          title={sales ? `Sales: ${sales}` : 'Salesperson not assigned'}
        >
          <span className="text-white/28" aria-hidden>
            ·
          </span>{' '}
          <span className="font-medium text-white/38">Sales</span>{' '}
          <span className="text-white/62">{sales ?? 'Unassigned'}</span>
        </span>
      </div>
    </div>
  )
}
