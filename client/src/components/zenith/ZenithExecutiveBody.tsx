import { useQuery } from '@tanstack/react-query'
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
import { Zap, TrendingUp, IndianRupee, Target, Percent } from 'lucide-react'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import { getProjectStatusColor } from '../dashboard/projectStatusColors'
import { buildExecutiveZenithKpis } from './zenithKpi'
import { buildZenithFunnelStages } from './zenithFunnel'
import type { ZenithDateFilter } from './zenithTypes'
import KPICard from './KPICard'
import DealFlowFunnel from './DealFlowFunnel'
import ZenithYourFocus from './ZenithYourFocus'
import ChartPanel from './ChartPanel'
import SegmentDonut from './SegmentDonut'
import CustomerProfitabilityRank from './CustomerProfitabilityRank'
import ZenithRevenueProfitFyChart from './ZenithRevenueProfitFyChart'
import ZenithProposalEngineCard from './ZenithProposalEngineCard'

const icons = [Zap, TrendingUp, IndianRupee, Target, Percent]

function ZenithSkeleton() {
  return (
    <div className="space-y-6 px-3 sm:px-5 py-6 max-w-[1600px] mx-auto">
      <div className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="zenith-skeleton h-36 rounded-2xl min-w-0" />
        ))}
      </div>
      <div className="zenith-skeleton h-48 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="zenith-skeleton h-80 rounded-2xl" />
        <div className="zenith-skeleton h-80 rounded-2xl" />
      </div>
    </div>
  )
}

const chartTooltip = {
  wrapperStyle: { outline: 'none' as const, zIndex: 100 },
  contentStyle: {
    background: 'rgba(10,10,15,0.96)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 10,
    color: '#f8fafc',
  },
  labelStyle: { color: '#ffffff', fontWeight: 600 },
  itemStyle: { color: '#f1f5f9' },
}

export default function ZenithExecutiveBody({
  role,
  data,
  isLoading,
  dateFilter,
}: {
  role: UserRole
  data: Record<string, unknown>
  isLoading: boolean
  dateFilter: ZenithDateFilter
}) {
  const { user } = useAuth()
  const fyRows = (data?.projectValueProfitByFY ?? []) as {
    fy: string
    totalProjectValue: number
    totalProfit: number
  }[]

  const effFYs = dateFilter.selectedFYs
  const effQ = dateFilter.selectedQuarters
  const effM = dateFilter.selectedMonths

  const canLeadPipeline =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.SALES

  const { data: revLeadData } = useQuery({
    queryKey: ['zenith', 'revenueLead', effFYs, effQ, effM, user?.role],
    queryFn: async () => {
      const params = new URLSearchParams()
      effFYs.forEach((fy) => params.append('fy', fy))
      effQ.forEach((q) => params.append('quarter', q))
      effM.forEach((m) => params.append('month', m))
      const res = await axiosInstance.get(`/api/dashboard/revenue-by-lead-source?${params.toString()}`)
      return (res.data as { revenueByLeadSource: { leadSourceLabel: string; revenue: number }[] })
        .revenueByLeadSource
    },
    enabled: !!user && !isLoading,
  })

  const { data: perfData } = useQuery({
    queryKey: ['zenith', 'salesPerf', effFYs, effQ, effM],
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

  if (isLoading) return <ZenithSkeleton />

  const kpis = buildExecutiveZenithKpis(role, data, dateFilter.selectedFYs)
  const funnelRole = role === UserRole.SALES ? UserRole.SALES : UserRole.MANAGEMENT
  const funnelStages = buildZenithFunnelStages(funnelRole, data, dateFilter)

  const projectsByStatus = (data?.projectsByStatus ?? []) as {
    status: string
    statusLabel: string
    count: number
  }[]

  const fyChart = [...fyRows].sort((a, b) => a.fy.localeCompare(b.fy)).map((r) => ({
    fy: r.fy,
    revenue: r.totalProjectValue,
    profit: r.totalProfit,
  }))

  const pipelineByLead = (data?.pipelineByLeadSource ?? []) as {
    leadSourceLabel: string
    pipeline: number
  }[]
  const leadMerge =
    revLeadData?.map((r) => {
      const pipe = pipelineByLead.find((p) => p.leadSourceLabel === r.leadSourceLabel)?.pipeline ?? 0
      return {
        name: r.leadSourceLabel,
        revenue: r.revenue,
        pipeline: pipe,
      }
    }) ?? []

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

  const revenueSeg = (data?.projectValueByType ?? []) as {
    label: string
    value: number
    percentage: string
  }[]
  const pipeSeg = (data?.pipelineByType ?? []) as {
    label: string
    value: number
    percentage: string
  }[]

  const loans = (data?.availingLoanByBank ?? []) as { bankLabel: string; count: number }[]
  const wordCloud = (data?.wordCloudData ?? []) as { text: string; value: number }[]

  const paymentItems = (data?.projectsByPaymentStatus ?? []) as {
    status: string
    count: number
    outstanding: number
  }[]

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-6 space-y-8 pb-16">
      {/* KPI strip — equal-width columns on lg+ so the row matches page width */}
      <div
        id="zenith-kpis"
        className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-2 scroll-mt-28"
      >
        {kpis.map((k, i) => (
          <div key={k.key} className="min-w-0">
            <KPICard item={k} index={i} icon={icons[i] ?? Zap} />
          </div>
        ))}
      </div>

      <div id="zenith-focus" className="scroll-mt-28">
        <ZenithYourFocus role={role} dateFilter={dateFilter} zenithMainLoading={isLoading} />
      </div>

      <div id="zenith-funnel" className="scroll-mt-28">
        <DealFlowFunnel stages={funnelStages} paymentItems={paymentItems} dateFilter={dateFilter} />
      </div>

      {(role === UserRole.ADMIN || role === UserRole.MANAGEMENT || role === UserRole.SALES) && (
        <div id="zenith-proposal-engine" className="scroll-mt-28">
          <ZenithProposalEngineCard
            selectedFYs={dateFilter.selectedFYs}
            selectedQuarters={dateFilter.selectedQuarters}
            selectedMonths={dateFilter.selectedMonths}
          />
        </div>
      )}

      <div
        id="zenith-charts-row-1"
        className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5 scroll-mt-28"
      >
        <ChartPanel title="Projects by stage">
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <BarChart
              layout="vertical"
              data={projectsByStatus}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="statusLabel"
                width={118}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={900}>
                {projectsByStatus.map((_, i) => (
                  <Cell key={i} fill={getProjectStatusColor(projectsByStatus[i]!.status, i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Revenue & profit by financial year">
          <ZenithRevenueProfitFyChart data={fyChart} />
        </ChartPanel>
      </div>

      {canLeadPipeline ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5">
          <div id="zenith-lead-source" className="scroll-mt-28 min-w-0">
            <ChartPanel title="Revenue vs pipeline by lead source">
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <BarChart
                  layout="vertical"
                  data={leadMerge}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} {...chartTooltip} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#f5a623" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="pipeline" name="Pipeline" fill="#00d4b4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <div id="zenith-sales-team" className="scroll-mt-28 min-w-0">
            <ChartPanel title="Revenue vs pipeline by sales team">
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <BarChart
                  layout="vertical"
                  data={salesMerge}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} {...chartTooltip} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#f5a623" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="pipeline" name="Pipeline" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </div>
      ) : null}

      <div id="zenith-segments" className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 scroll-mt-28">
        <SegmentDonut
          title="Revenue by customer segment"
          data={revenueSeg.map((s) => ({ name: s.label, value: s.value, percentage: s.percentage }))}
        />
        <SegmentDonut
          title="Pipeline by customer segment"
          data={pipeSeg.map((s) => ({ name: s.label, value: s.value, percentage: s.percentage }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <div id="zenith-loans" className="scroll-mt-28 min-w-0">
          <ChartPanel title="Loans by bank">
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <BarChart
                layout="vertical"
                data={loans}
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
                <YAxis dataKey="bankLabel" type="category" width={100} tick={{ fontSize: 9 }} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="count" fill="#f5a623" radius={[0, 4, 4, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>
        <CustomerProfitabilityRank rows={wordCloud} />
      </div>
    </div>
  )
}
