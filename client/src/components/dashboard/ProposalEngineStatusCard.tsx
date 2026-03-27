import { useQuery } from '@tanstack/react-query'
import { FaFileInvoice } from 'react-icons/fa'
import axiosInstance from '../../utils/axios'
import { getFriendlyApiErrorMessage } from '../../utils/axios'

interface ProposalEngineStatusCardProps {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

type PeStatusRow = {
  key: 'proposal-ready' | 'draft' | 'not-started' | 'rest'
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
}: ProposalEngineStatusCardProps) => {
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="h-6 w-52 rounded bg-slate-200 animate-pulse mb-4" />
        <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        <p className="font-medium text-sm">Unable to load Proposal Engine dashboard</p>
        <p className="mt-1 text-xs sm:text-sm">{getFriendlyApiErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs sm:text-sm font-medium hover:bg-amber-700"
        >
          Try again
        </button>
      </div>
    )
  }

  const rows = data?.rows ?? []
  const totals = rows.reduce(
    (acc, row) => {
      acc.count += row.count || 0
      acc.crm += row.crmOrderValue || 0
      acc.pe += row.peOrderValueExGst || 0
      return acc
    },
    { count: 0, crm: 0, pe: 0 }
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-sm">
            <FaFileInvoice className="w-4 h-4" aria-hidden />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Proposal Engine Dashboard</h3>
            <p className="text-xs text-slate-500">
              Status-wise count, CRM order value, and PE proposal value (excl. GST)
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 text-right">Count</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 text-right">Total CRM Order Value</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 text-right">Total PE Order Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-primary-50/40 transition-colors">
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${badgeStyles[row.key]}`}>
                    {row.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{row.count.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-emerald-800">{formatInr(row.crmOrderValue)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-indigo-800">{formatInr(row.peOrderValueExGst)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 border-t border-slate-200">
              <td className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-800">Total</td>
              <td className="px-3 py-2.5 text-right font-extrabold text-slate-900">{totals.count.toLocaleString('en-IN')}</td>
              <td className="px-3 py-2.5 text-right font-extrabold text-emerald-900">{formatInr(totals.crm)}</td>
              <td className="px-3 py-2.5 text-right font-extrabold text-indigo-900">{formatInr(totals.pe)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-4 sm:px-5 pb-4">
        <p className="text-[11px] sm:text-xs text-gray-500">
          <span className="font-semibold text-gray-600">Note:</span> Rest = Proposal + Confirmed projects not yet started in Proposal Engine.
        </p>
      </div>
    </section>
  )
}

export default ProposalEngineStatusCard
