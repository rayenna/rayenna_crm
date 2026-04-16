import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axiosInstance from '../../utils/axios'
import { getFriendlyApiErrorMessage } from '../../utils/axios'
import { buildProjectsUrl, type PeDashboardBucket } from '../../utils/dashboardTileLinks'

interface ProposalEngineStatusCardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  /** When embedded in Quick Access grid, span full width on large breakpoints */
  gridClassName?: string
}

type PeStatusRow = {
  key: PeDashboardBucket
  label: string
  count: number
  crmOrderValue: number
  peOrderValueExGst: number
}

const badgeStyles: Record<PeStatusRow['key'], string> = {
  'proposal-ready':
    'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)] border border-[color:var(--accent-teal-border)]',
  draft:
    'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] border border-[color:var(--accent-gold-border)]',
  'not-started':
    'bg-[color:var(--bg-badge)] text-[color:var(--text-secondary)] border border-[color:var(--border-default)]',
  rest:
    'bg-[color:var(--accent-purple-muted)] text-[color:var(--accent-purple)] border border-[color:var(--accent-purple-border)]',
}

function formatInr(value: number): string {
  return `₹${Math.round(value || 0).toLocaleString('en-IN')}`
}

const ProposalEngineStatusCard = ({
  selectedFYs,
  selectedQuarters,
  selectedMonths,
  gridClassName = '',
}: ProposalEngineStatusCardProps) => {
  const tileParams = { selectedFYs, selectedQuarters, selectedMonths }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', 'proposal-engine-status', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((m) => params.append('month', m))
      const res = await axiosInstance.get(`/api/dashboard/proposal-engine-status?${params.toString()}`)
      return res.data as { rows: PeStatusRow[] }
    },
  })

  if (isLoading) {
    return (
      <div
        className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] ${gridClassName}`}
      >
        <div className="h-10 shrink-0 animate-pulse bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-gold)] to-[color:var(--accent-amber)]" />
        <div className="flex min-h-0 flex-1 flex-col space-y-2 p-3">
          <div className="h-8 animate-pulse rounded bg-[color:var(--border-default)]" />
          <div className="h-8 animate-pulse rounded bg-[color:var(--border-default)]" />
          <div className="h-8 animate-pulse rounded bg-[color:var(--border-default)]" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className={`flex min-w-0 flex-col rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-3 text-xs text-[color:var(--text-primary)] sm:text-sm ${gridClassName}`}
      >
        <p className="font-medium">Unable to load Proposal Engine summary</p>
        <p className="mt-1 text-[color:var(--text-secondary)]">{getFriendlyApiErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 w-fit rounded-xl bg-[color:var(--accent-gold)] px-3 py-1.5 text-xs font-extrabold text-[color:var(--text-inverse)] transition-opacity hover:opacity-95"
        >
          Try again
        </button>
      </div>
    )
  }

  const rows = data?.rows ?? []

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] ${gridClassName}`}
    >
      <div className="shrink-0 bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-gold)] to-[color:var(--accent-amber)] px-3 py-2 sm:px-4 sm:py-2.5">
        <h3 className="truncate text-sm font-bold text-[color:var(--text-inverse)] drop-shadow-md sm:text-base">Proposal Engine</h3>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden px-3 py-2 sm:px-4 sm:py-3">
        <div className="space-y-1.5 sm:space-y-2">
          {rows.map((row) => (
            <Link
              key={row.key}
              to={buildProjectsUrl({ peBucket: row.key }, tileParams)}
              className="flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-2.5 py-2 text-inherit no-underline transition-colors hover:bg-[color:var(--accent-gold-muted)]/40"
              title={`${row.label}: ${row.count} projects — CRM ${formatInr(row.crmOrderValue)}${row.peOrderValueExGst > 0 ? `, PE ex GST ${formatInr(row.peOrderValueExGst)}` : ''}`}
            >
              <span
                className={`inline-flex max-w-[55%] flex-shrink-0 items-center truncate rounded-md px-2 py-0.5 text-xs font-semibold sm:max-w-none ${badgeStyles[row.key]}`}
              >
                {row.label}
              </span>
              <span className="min-w-0 text-right text-xs font-extrabold text-[color:var(--text-primary)] sm:text-sm">
                <span className="block sm:inline">{row.count.toLocaleString('en-IN')}</span>{' '}
                <span className="text-[color:var(--accent-teal)]">({formatInr(row.crmOrderValue)})</span>
                {row.peOrderValueExGst > 0 ? (
                  <span className="block text-[10px] font-semibold leading-tight text-[color:var(--text-muted)] sm:text-xs">
                    PE ex GST {formatInr(row.peOrderValueExGst)}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProposalEngineStatusCard
