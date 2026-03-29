import { Zap, TrendingUp, IndianRupee, Target, Percent } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Legend,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { buildFinanceZenithKpis } from './zenithKpi'
import { buildZenithFunnelFromStatuses } from './zenithFunnel'
import type { ZenithDateFilter } from './zenithTypes'
import KPICard from './KPICard'
import DealFlowFunnel from './DealFlowFunnel'
import ChartPanel from './ChartPanel'
import SegmentDonut from './SegmentDonut'
import CustomerProfitabilityRank from './CustomerProfitabilityRank'

const icons = [Zap, TrendingUp, IndianRupee, Target, Percent]

const tt = {
  contentStyle: {
    background: 'rgba(10,10,15,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
}

export default function ZenithFinanceBody({
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

  const { data: revLead } = useQuery({
    queryKey: ['zenith', 'finRevLead', effFYs, effQ, effM],
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
    queryKey: ['zenith', 'finSalesPerf', effFYs, effQ, effM],
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
      </div>
    )
  }

  const kpis = buildFinanceZenithKpis(data)
  const funnel = buildZenithFunnelFromStatuses(data, dateFilter)
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
  const loans = (data?.availingLoanByBank ?? []) as { bankLabel: string; count: number }[]
  const wordCloud = (data?.wordCloudData ?? []) as { text: string; value: number }[]
  const paymentItems = (data?.projectsByPaymentStatus ?? []) as {
    status: string
    count: number
    outstanding: number
  }[]

  const leadChart = (revLead ?? []).map((r) => ({ name: r.leadSourceLabel, revenue: r.revenue }))
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

  const tile = {
    selectedFYs: dateFilter.selectedFYs,
    selectedQuarters: dateFilter.selectedQuarters,
    selectedMonths: dateFilter.selectedMonths,
  }

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-6 space-y-8 pb-16">
      <div className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-2">
        {kpis.map((k, i) => (
          <div key={k.key} className="min-w-0">
            <KPICard item={k} index={i} icon={icons[i] ?? Zap} />
          </div>
        ))}
      </div>
      <DealFlowFunnel stages={funnel} />
      <div className="zenith-glass rounded-2xl p-4">
        <h3 className="zenith-display text-sm font-bold text-white/90 mb-3 uppercase tracking-widest">
          Payment status
        </h3>
        <div className="flex flex-wrap gap-2">
          {paymentItems.map((item) => {
            const label = item.status === 'N/A' ? 'N/A' : item.status.replace(/_/g, ' ')
            const param = item.status === 'N/A' ? 'NA' : item.status
            return (
              <Link
                key={item.status}
                to={buildProjectsUrl({ paymentStatus: [param] }, tile)}
                className="inline-flex flex-col px-3 py-2 rounded-full border border-white/10 bg-white/[0.04] hover:border-[#f5a623]/40 text-xs"
              >
                <span className="font-bold text-[#00d4b4]">{label}</span>
                <span className="text-white/50">
                  {item.count} · ₹{(item.outstanding ?? 0).toLocaleString('en-IN')}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartPanel title="Revenue by lead source">
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <BarChart layout="vertical" data={leadChart} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} {...tt} />
              <Bar dataKey="revenue" fill="#f5a623" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Revenue vs pipeline by sales team">
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <BarChart layout="vertical" data={salesMerge} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} />
              <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} {...tt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#f5a623" />
              <Bar dataKey="pipeline" name="Pipeline" fill="#a78bfa" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartPanel title="Revenue & profit by financial year">
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <ComposedChart data={fyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="fy" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} {...tt} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue" stroke="#f5a623" fill="rgba(245,166,35,0.12)" />
              <Bar dataKey="profit" fill="#00d4b4" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>
        <SegmentDonut
          title="Revenue by customer segment"
          data={seg.map((s) => ({ name: s.label, value: s.value, percentage: s.percentage }))}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPanel title="Loans by bank">
          <ResponsiveContainer width="100%" height={260} minWidth={0}>
            <BarChart layout="vertical" data={loans}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} />
              <YAxis dataKey="bankLabel" type="category" width={100} tick={{ fontSize: 9 }} />
              <Tooltip {...tt} />
              <Bar dataKey="count" fill="#f5a623" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <CustomerProfitabilityRank rows={wordCloud} />
      </div>
    </div>
  )
}
