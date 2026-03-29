import { Link } from 'react-router-dom'
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
  ComposedChart,
  Area,
  Legend,
} from 'recharts'
import { Zap, TrendingUp, IndianRupee, Target, Percent } from 'lucide-react'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { getProjectStatusColor } from '../dashboard/projectStatusColors'
import { buildExecutiveZenithKpis } from './zenithKpi'
import { buildZenithFunnelStages } from './zenithFunnel'
import type { ZenithDateFilter } from './zenithTypes'
import KPICard from './KPICard'
import DealFlowFunnel from './DealFlowFunnel'
import ChartPanel from './ChartPanel'
import SegmentDonut from './SegmentDonut'
import CustomerProfitabilityRank from './CustomerProfitabilityRank'
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
  contentStyle: {
    background: 'rgba(10,10,15,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  labelStyle: { color: 'rgba(255,255,255,0.7)' },
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
      <div className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-2">
        {kpis.map((k, i) => (
          <div key={k.key} className="min-w-0">
            <KPICard item={k} index={i} icon={icons[i] ?? Zap} />
          </div>
        ))}
      </div>

      <DealFlowFunnel stages={funnelStages} />

      {/* Payment status + Proposal Engine (same roles as classic dashboard PE tile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="zenith-glass rounded-2xl p-4 sm:p-5">
          <h3 className="zenith-display text-sm font-bold text-white/90 mb-3 uppercase tracking-widest">
            Payment status
          </h3>
          <div className="flex flex-wrap gap-2">
            {paymentItems.map((item) => {
              const label = item.status === 'N/A' ? 'N/A' : item.status.replace(/_/g, ' ')
              const param = item.status === 'N/A' ? 'NA' : item.status
              const tile = {
                selectedFYs: dateFilter.selectedFYs,
                selectedQuarters: dateFilter.selectedQuarters,
                selectedMonths: dateFilter.selectedMonths,
              }
              return (
                <Link
                  key={item.status}
                  to={buildProjectsUrl({ paymentStatus: [param] }, tile)}
                  className="inline-flex flex-col sm:flex-row sm:items-center gap-1 px-3 py-2 rounded-full border border-white/10 bg-white/[0.04] hover:border-[#f5a623]/40 transition-colors text-left"
                >
                  <span className="text-xs font-bold text-[#00d4b4]">{label}</span>
                  <span className="text-[11px] text-white/55 tabular-nums">
                    {item.count} · ₹{(item.outstanding ?? 0).toLocaleString('en-IN')}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
        {(role === UserRole.ADMIN || role === UserRole.MANAGEMENT || role === UserRole.SALES) && (
          <ZenithProposalEngineCard
            selectedFYs={dateFilter.selectedFYs}
            selectedQuarters={dateFilter.selectedQuarters}
            selectedMonths={dateFilter.selectedMonths}
          />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5">
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
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <ComposedChart data={fyChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="fy" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
              <Tooltip
                formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`}
                {...chartTooltip}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                fill="rgba(245,166,35,0.15)"
                stroke="#f5a623"
                strokeWidth={2}
              />
              <Bar dataKey="profit" fill="#00d4b4" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {canLeadPipeline ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5">
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
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
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
        <CustomerProfitabilityRank rows={wordCloud} />
      </div>
    </div>
  )
}
