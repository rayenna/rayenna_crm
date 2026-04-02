import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import axiosInstance from '../../utils/axios'
import { getFriendlyApiErrorMessage } from '../../utils/axios'
import { buildProjectsUrl, type PeDashboardBucket } from '../../utils/dashboardTileLinks'

type PeStatusRow = {
  key: PeDashboardBucket
  label: string
  count: number
  crmOrderValue: number
  peOrderValueExGst: number
}

const badgeClass: Record<PeStatusRow['key'], string> = {
  'proposal-ready':
    'bg-emerald-500/15 text-emerald-300 border border-emerald-400/35',
  draft: 'bg-amber-500/15 text-amber-200 border border-amber-400/35',
  'not-started': 'bg-white/8 text-white/65 border border-white/15',
  rest: 'bg-violet-500/15 text-violet-200 border border-violet-400/35',
}

function formatInr(value: number): string {
  return `₹${Math.round(value || 0).toLocaleString('en-IN')}`
}

export default function ZenithProposalEngineCard({
  selectedFYs,
  selectedQuarters,
  selectedMonths,
}: {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}) {
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

  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const u = () => setNarrow(mq.matches)
    u()
    mq.addEventListener('change', u)
    return () => mq.removeEventListener('change', u)
  }, [])

  if (isLoading) {
    return (
      <div className="zenith-glass rounded-xl max-lg:overflow-hidden overflow-visible lg:overflow-hidden min-h-[180px]">
        <div className="h-10 bg-gradient-to-r from-cyan-600/40 to-indigo-600/50 animate-pulse" />
        <div className="p-3 space-y-2">
          <div className="h-9 rounded-lg zenith-skeleton" />
          <div className="h-9 rounded-lg zenith-skeleton" />
          <div className="h-9 rounded-lg zenith-skeleton" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="zenith-glass rounded-xl p-4 border border-[#ff4757]/25 bg-[#ff4757]/5">
        <p className="text-sm font-semibold text-[#ff4757]">Proposal Engine summary</p>
        <p className="text-xs text-white/60 mt-1">{getFriendlyApiErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#f5a623] text-[#0a0a0f]"
        >
          Retry
        </button>
      </div>
    )
  }

  const rows = data?.rows ?? []

  const cardClass =
    'zenith-glass rounded-xl max-lg:overflow-hidden overflow-visible lg:overflow-hidden flex flex-col min-h-0'

  const cardBody = (
    <>
      <div className="shrink-0 px-3 py-2 bg-gradient-to-r from-cyan-600/25 via-indigo-600/30 to-[#0a0a0f] border-b border-white/[0.06]">
        <h3 className="zenith-display text-sm font-semibold text-white tracking-tight">Proposal Engine</h3>
        <p className="text-[10px] text-white/45 mt-0.5">PE readiness by project bucket</p>
      </div>
      <div className="p-3 sm:p-4 flex-1 min-h-0 space-y-1.5">
        {rows.map((row) => (
          <Link
            key={row.key}
            to={buildProjectsUrl({ peBucket: row.key }, tileParams)}
            className="flex justify-between items-start gap-2 py-2 px-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#f5a623]/35 hover:bg-white/[0.06] transition-all min-w-0 no-underline text-inherit"
            title={`${row.label}: ${row.count} projects — CRM ${formatInr(row.crmOrderValue)}${
              row.peOrderValueExGst > 0 ? `, PE ex GST ${formatInr(row.peOrderValueExGst)}` : ''
            }`}
          >
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold flex-shrink-0 max-w-[48%] sm:max-w-none truncate ${badgeClass[row.key]}`}
            >
              {row.label}
            </span>
            <span className="text-right min-w-0">
              <span className="block text-xs font-semibold text-white tabular-nums">
                {row.count.toLocaleString('en-IN')}{' '}
                <span className="text-[#f5a623]">({formatInr(row.crmOrderValue)})</span>
              </span>
              {row.peOrderValueExGst > 0 ? (
                <span className="block text-[10px] text-cyan-300/90 font-medium mt-0.5">
                  PE ex GST {formatInr(row.peOrderValueExGst)}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </>
  )

  if (narrow) {
    return <div className={cardClass}>{cardBody}</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cardClass}>
      {cardBody}
    </motion.div>
  )
}
