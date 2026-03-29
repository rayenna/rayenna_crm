import { Zap, TrendingUp, IndianRupee, Target, Percent } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { getProjectStatusColor } from '../dashboard/projectStatusColors'
import { buildOperationsZenithKpis } from './zenithKpi'
import { buildZenithOperationsExecutionFunnel } from './zenithFunnel'
import type { ZenithDateFilter } from './zenithTypes'
import KPICard from './KPICard'
import DealFlowFunnel from './DealFlowFunnel'
import ZenithYourFocus from './ZenithYourFocus'
import ChartPanel from './ChartPanel'
import SegmentDonut from './SegmentDonut'
import ZenithRevenueProfitFyChart from './ZenithRevenueProfitFyChart'

const icons = [Zap, TrendingUp, IndianRupee, Target, Percent]

const chartTooltip = {
  contentStyle: {
    background: 'rgba(10,10,15,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
}

export default function ZenithOperationsBody({
  data,
  isLoading,
  dateFilter,
}: {
  data: Record<string, unknown>
  isLoading: boolean
  dateFilter: ZenithDateFilter
}) {
  const { user } = useAuth()
  const effFYs = dateFilter.selectedFYs
  const effQ = dateFilter.selectedQuarters
  const effM = dateFilter.selectedMonths

  const { data: perfData } = useQuery({
    queryKey: ['zenith', 'opsSalesPerf', effFYs, effQ, effM],
    queryFn: async () => {
      const params = new URLSearchParams()
      effFYs.forEach((fy) => params.append('fy', fy))
      effQ.forEach((q) => params.append('quarter', q))
      effM.forEach((m) => params.append('month', m))
      const res = await axiosInstance.get(`/api/sales-team-performance?${params.toString()}`)
      return res.data as {
        salesTeamData: { salespersonName: string; totalOrderValue: number }[]
        revenueBySalesperson: { salespersonName: string; revenue: number }[]
      }
    },
    enabled: !!user && !isLoading,
  })

  if (isLoading) {
    return (
      <div className="px-3 sm:px-5 py-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="zenith-skeleton h-40 rounded-2xl" />
        <div className="zenith-skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  const kpis = buildOperationsZenithKpis(data, effFYs)
  const funnel = buildZenithOperationsExecutionFunnel(data, dateFilter)
  const projectsByStatus = (data?.projectsByStatus ?? []) as {
    status: string
    statusLabel: string
    count: number
  }[]
  const fyRows = (data?.projectValueProfitByFY ?? []) as {
    fy: string
    totalProjectValue: number
    totalProfit: number
  }[]
  const fyChart = [...fyRows].sort((a, b) => a.fy.localeCompare(b.fy)).map((r) => ({
    fy: r.fy,
    revenue: r.totalProjectValue,
    profit: r.totalProfit,
  }))
  const seg = (data?.projectValueByType ?? []) as { label: string; value: number; percentage: string }[]
  const paymentItems = (data?.projectsByPaymentStatus ?? []) as {
    status: string
    count: number
    outstanding: number
  }[]
  const salesMerge = (() => {
    const rev = perfData?.revenueBySalesperson ?? []
    const pipe = perfData?.salesTeamData ?? []
    const names = new Set([...rev.map((r) => r.salespersonName), ...pipe.map((p) => p.salespersonName)])
    return Array.from(names).map((name) => ({
      name,
      revenue: rev.find((r) => r.salespersonName === name)?.revenue ?? 0,
      pipeline: pipe.find((p) => p.salespersonName === name)?.totalOrderValue ?? 0,
    }))
  })()

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-6 space-y-8 pb-16">
      <div
        id="zenith-kpis"
        className="grid w-full grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-2 scroll-mt-28"
      >
        {kpis.map((k, i) => (
          <div key={k.key} className="min-w-0">
            <KPICard item={k} index={i} icon={icons[i] ?? Zap} />
          </div>
        ))}
      </div>
      <div id="zenith-focus" className="scroll-mt-28">
        <ZenithYourFocus role={user!.role} dateFilter={dateFilter} zenithMainLoading={isLoading} />
      </div>
      <div id="zenith-funnel" className="scroll-mt-28">
        <DealFlowFunnel
          stages={funnel}
          title="Project Execution Flow"
          paymentItems={paymentItems}
          dateFilter={dateFilter}
        />
      </div>
      <div id="zenith-charts-row-1" className="grid grid-cols-1 xl:grid-cols-2 gap-4 scroll-mt-28">
        <ChartPanel title="Projects by stage">
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <BarChart layout="vertical" data={projectsByStatus} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
              <YAxis type="category" dataKey="statusLabel" width={118} tick={{ fontSize: 10 }} />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {projectsByStatus.map((_, i) => (
                  <Cell key={i} fill={getProjectStatusColor(projectsByStatus[i]!.status, i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <div id="zenith-sales-team" className="scroll-mt-28 min-w-0">
          <ChartPanel title="Revenue vs pipeline by sales team">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <BarChart layout="vertical" data={salesMerge} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} />
                <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#fff' }} />
                <Bar dataKey="revenue" fill="#f5a623" name="Revenue" />
                <Bar dataKey="pipeline" fill="#00d4b4" name="Pipeline" />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>
      </div>
      <div id="zenith-segments" className="grid grid-cols-1 xl:grid-cols-2 gap-4 scroll-mt-28">
        <ChartPanel title="Revenue & profit by financial year">
          <ZenithRevenueProfitFyChart data={fyChart} />
        </ChartPanel>
        <SegmentDonut
          title="Revenue by customer segment"
          data={seg.map((s) => ({ name: s.label, value: s.value, percentage: s.percentage }))}
        />
      </div>
    </div>
  )
}
