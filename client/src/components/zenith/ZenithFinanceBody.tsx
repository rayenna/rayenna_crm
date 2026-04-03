import { Zap, TrendingUp, IndianRupee, Target, Percent } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { buildFinanceZenithKpis } from './zenithKpi'
import {
  buildDealFlowDrawerFilterLabel,
  buildZenithFunnelFromStatuses,
  filterExplorerProjectsByFunnelStage,
  type ZenithFunnelStage,
} from './zenithFunnel'
import type { ZenithDateFilter } from './zenithTypes'
import KPICard from './KPICard'
import DealFlowFunnel from './DealFlowFunnel'
import ZenithYourFocus from './ZenithYourFocus'
import ChartPanel from './ChartPanel'
import SegmentDonut from './SegmentDonut'
import CustomerProfitabilityRank from './CustomerProfitabilityRank'
import ZenithRevenueProfitFyChart from './ZenithRevenueProfitFyChart'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { projectValueRowsVisibleInZenithFyChart } from '../../utils/zenithFyChartData'
import { getLoanBankBarColor } from '../dashboard/loanBankChartColors'
import ZenithChartTouchReset from './ZenithChartTouchReset'
import type { ZenithQuickActionHandle } from '../../hooks/useQuickAction'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import { buildFilterLabel, filterProjectsByChartSlice } from '../../utils/zenithChartDrilldown'
import { buildZenithDrawerListProjectsHref } from '../../utils/zenithListProjectsDeepLink'

const icons = [Zap, TrendingUp, IndianRupee, Target, Percent]

const ZENITH_CHART_H = 240

const tt = {
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

export default function ZenithFinanceBody({
  data,
  isLoading,
  dateFilter,
  quickAction,
}: {
  data: Record<string, unknown>
  isLoading: boolean
  dateFilter: ZenithDateFilter
  quickAction: ZenithQuickActionHandle
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

  const explorerProjects = (data?.zenithExplorerProjects ?? []) as ZenithExplorerProject[]

  const onPaymentStatusPillClick = useCallback(
    (paymentUrlParam: string) => {
      const filtered = filterProjectsByChartSlice(explorerProjects, 'payment_status', paymentUrlParam)
      quickAction.openDrawerListMode({
        filterLabel: buildFilterLabel('payment_status', paymentUrlParam),
        filteredProjects: filtered,
        listAmountMode: 'deal_value',
        projectsPageHref: buildZenithDrawerListProjectsHref(
          'payment_status',
          paymentUrlParam,
          dateFilter,
          undefined,
          filtered[0] ?? null,
        ),
      })
    },
    [explorerProjects, quickAction.openDrawerListMode, dateFilter],
  )

  const onDealFlowStageClick = useCallback(
    (stage: ZenithFunnelStage) => {
      const filtered = filterExplorerProjectsByFunnelStage(stage.id, explorerProjects)
      quickAction.openDrawerListMode({
        filterLabel: buildDealFlowDrawerFilterLabel(stage),
        filteredProjects: filtered,
        listAmountMode: 'deal_value',
        projectsPageHref: stage.to,
      })
    },
    [explorerProjects, quickAction.openDrawerListMode],
  )

  if (isLoading) {
    return (
      <div className="px-3 sm:px-5 py-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="zenith-skeleton h-40 rounded-2xl" />
      </div>
    )
  }

  const kpis = buildFinanceZenithKpis(data, effFYs)
  const availingLoanProjectsUrl = buildProjectsUrl({ availingLoan: true }, dateFilter)
  const funnel = buildZenithFunnelFromStatuses(data, dateFilter)
  const fyRows = (data?.projectValueProfitByFY ?? []) as {
    fy: string
    totalProjectValue: number
    totalProfit: number
  }[]
  const fyChart = [...projectValueRowsVisibleInZenithFyChart(fyRows, effFYs)]
    .sort((a, b) => a.fy.localeCompare(b.fy))
    .map((r) => ({
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

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-6 space-y-8 pb-24 max-lg:pb-32">
      <div
        id="zenith-kpis"
        className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-2 scroll-mt-28"
      >
        {kpis.map((k, i) => (
          <div key={k.key} className="min-w-0">
            <KPICard
              item={k}
              index={i}
              icon={icons[i] ?? Zap}
              to={k.key === 'loan' ? availingLoanProjectsUrl : undefined}
            />
          </div>
        ))}
      </div>
      <div id="zenith-focus" className="scroll-mt-28">
        <ZenithYourFocus role={user!.role} dateFilter={dateFilter} zenithMainLoading={isLoading} />
      </div>
      <div id="zenith-funnel" className="scroll-mt-28">
        <DealFlowFunnel
          stages={funnel}
          paymentItems={paymentItems}
          dateFilter={dateFilter}
          onPaymentStatusClick={onPaymentStatusPillClick}
          onDealFlowStageClick={onDealFlowStageClick}
        />
      </div>
      <section className="zenith-exec-section" aria-label="Finance charts">
        <div
          id="zenith-charts-row-1"
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 scroll-mt-28"
        >
          <div id="zenith-lead-source" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
            <ChartPanel title="Revenue by lead source">
              <ZenithChartTouchReset>
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height={ZENITH_CHART_H} minWidth={0}>
                    <BarChart layout="vertical" data={leadChart} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} {...tt} />
                      <Bar dataKey="revenue" fill="#f5a623" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ZenithChartTouchReset>
            </ChartPanel>
          </div>
          <div id="zenith-sales-team" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
            <ChartPanel title="Revenue vs pipeline by sales team">
              <ZenithChartTouchReset>
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height={ZENITH_CHART_H} minWidth={0}>
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
                )}
              </ZenithChartTouchReset>
            </ChartPanel>
          </div>
          <div className="min-w-0">
            <ChartPanel title="Revenue & profit by financial year">
              <ZenithRevenueProfitFyChart data={fyChart} />
            </ChartPanel>
          </div>
          <div id="zenith-loans" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
            <ChartPanel title="Loans by bank">
              <ZenithChartTouchReset>
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height={ZENITH_CHART_H} minWidth={0}>
                    <BarChart layout="vertical" data={loans} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} />
                      <YAxis dataKey="bankLabel" type="category" width={100} tick={{ fontSize: 9 }} />
                      <Tooltip {...tt} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {loans.map((row, i) => (
                          <Cell key={row.bankLabel ?? i} fill={getLoanBankBarColor(row.bankLabel, i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ZenithChartTouchReset>
            </ChartPanel>
          </div>
        </div>
        <div
          id="zenith-segments"
          className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 lg:items-stretch lg:min-h-[480px] scroll-mt-24"
        >
          <div className="min-w-0 flex h-full min-h-[320px] flex-col lg:min-h-0">
            <SegmentDonut
              stretchToRowHeight
              title="Revenue by customer segment"
              data={seg.map((s) => ({ name: s.label, value: s.value, percentage: s.percentage }))}
            />
          </div>
          <div className="flex min-h-[320px] h-full min-w-0 flex-col lg:min-h-0">
            <CustomerProfitabilityRank rows={wordCloud} className="h-full min-h-[320px] flex-1" />
          </div>
        </div>
      </section>
    </div>
  )
}
