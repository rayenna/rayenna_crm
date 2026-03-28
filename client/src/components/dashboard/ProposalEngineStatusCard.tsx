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
  'proposal-ready': 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  draft: 'bg-amber-100 text-amber-800 border border-amber-300',
  'not-started': 'bg-slate-100 text-slate-700 border border-slate-300',
  rest: 'bg-violet-100 text-violet-800 border border-violet-300',
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
        className={`min-w-0 min-h-0 flex flex-col rounded-xl border-2 border-indigo-200/50 bg-gradient-to-br from-white via-indigo-50/50 to-white shadow-lg overflow-hidden backdrop-blur-sm ${gridClassName}`}
      >
        <div className="h-10 shrink-0 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-600 animate-pulse" />
        <div className="p-3 space-y-2 flex-1 min-h-0 flex flex-col">
          <div className="h-8 rounded bg-slate-200 animate-pulse" />
          <div className="h-8 rounded bg-slate-200 animate-pulse" />
          <div className="h-8 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className={`min-w-0 flex flex-col rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-amber-800 text-xs sm:text-sm ${gridClassName}`}
      >
        <p className="font-medium">Unable to load Proposal Engine summary</p>
        <p className="mt-1">{getFriendlyApiErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 w-fit"
        >
          Try again
        </button>
      </div>
    )
  }

  const rows = data?.rows ?? []

  return (
    <div
      className={`min-w-0 min-h-0 flex flex-col bg-gradient-to-br from-white via-indigo-50/50 to-white shadow-lg rounded-xl border-2 border-indigo-200/50 overflow-hidden backdrop-blur-sm ${gridClassName}`}
    >
      <div className="shrink-0 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-600 px-3 py-2 sm:px-4 sm:py-2.5">
        <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-md truncate">Proposal Engine</h3>
      </div>
      <div className="px-3 py-2 sm:px-4 sm:py-3 overflow-x-hidden flex-1 min-h-0 flex flex-col">
        <div className="space-y-1.5 sm:space-y-2">
          {rows.map((row) => (
              <Link
                key={row.key}
                to={buildProjectsUrl({ peBucket: row.key }, tileParams)}
                className="flex justify-between items-center gap-2 py-1.5 px-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors min-w-0 cursor-pointer no-underline text-inherit"
                title={`${row.label}: ${row.count} projects — CRM ${formatInr(row.crmOrderValue)}${row.peOrderValueExGst > 0 ? `, PE ex GST ${formatInr(row.peOrderValueExGst)}` : ''}`}
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold flex-shrink-0 max-w-[55%] sm:max-w-none truncate ${badgeStyles[row.key]}`}
                >
                  {row.label}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-gray-900 text-right min-w-0">
                  <span className="block sm:inline">{row.count.toLocaleString('en-IN')}</span>{' '}
                  <span className="text-primary-600">({formatInr(row.crmOrderValue)})</span>
                  {row.peOrderValueExGst > 0 ? (
                    <span className="block text-[10px] sm:text-xs text-indigo-700 font-medium leading-tight">
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
