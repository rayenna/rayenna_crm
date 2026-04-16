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
import { useChartColors } from '../../hooks/useChartColors'
import { ZENITH_CHART_CUSTOM_TOOLTIP_SHELL } from '../dashboard/zenithRechartsTooltipStyles'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { ProjectStatus } from '../../types'
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
import type { ZenithExplorerProject, ZenithChartDrilldownDimension } from '../../types/zenithExplorer'
import type { DrilldownOpts } from '../../utils/zenithChartDrilldown'
import { buildFilterLabel, filterProjectsByChartSlice } from '../../utils/zenithChartDrilldown'
import { buildZenithDrawerListProjectsHref } from '../../utils/zenithListProjectsDeepLink'

const icons = [Zap, TrendingUp, IndianRupee, Target, Percent]

const ZENITH_CHART_H = 240

function ExploreInrTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: unknown; name?: string | number; dataKey?: string | number }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]!
  const v = Number(item.value)
  const seriesName =
    item.name != null && String(item.name).trim() !== '' ? String(item.name) : 'Value'
  const cat = label != null && label !== '' ? String(label) : ''
  return (
    <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 13, fontWeight: 500 }}>
        {cat ? `${cat} · ` : ''}
        {seriesName}: ₹{Number.isFinite(v) ? v.toLocaleString('en-IN') : '—'}
      </div>
      <div style={{ color: 'var(--accent-gold)', fontSize: 11, marginTop: 4 }}>Click to view projects →</div>
    </div>
  )
}

function ExploreCountTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: unknown }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  const n = Number(payload[0]?.value)
  return (
    <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 13, fontWeight: 500 }}>
        {label}: {Number.isFinite(n) ? n : '—'} projects
      </div>
      <div style={{ color: 'var(--accent-gold)', fontSize: 11, marginTop: 4 }}>Click to view projects →</div>
    </div>
  )
}

export default function ZenithFinanceBody({
  data,
  isLoading,
  dateFilter,
  quickAction,
  onOpenFinanceDrawer,
}: {
  data: Record<string, unknown>
  isLoading: boolean
  dateFilter: ZenithDateFilter
  quickAction: ZenithQuickActionHandle
  onOpenFinanceDrawer?: (projectId: string) => void
}) {
  const { user } = useAuth()
  const chartColors = useChartColors()
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
  const availingLoanProjectsUrl = buildProjectsUrl({ availingLoan: true }, dateFilter)

  const drill = useCallback(
    (dimension: ZenithChartDrilldownDimension, value: string, opts?: DrilldownOpts) => {
      const filtered = filterProjectsByChartSlice(explorerProjects, dimension, value, opts)
      const label = buildFilterLabel(dimension, value, opts)
      const listAmountMode =
        dimension === 'fy' && opts?.fyMetric === 'profit' ? 'gross_profit' : 'deal_value'
      const sample =
        dimension === 'loan_bank'
          ? filtered.find((p) => p.financing_bank) ?? null
          : dimension === 'assigned_to'
            ? filtered.find((p) => p.assigned_to_id) ?? null
            : filtered[0] ?? null
      const projectsPageHref = buildZenithDrawerListProjectsHref(
        dimension,
        value,
        dateFilter,
        opts,
        sample,
      )
      quickAction.openDrawerListMode({
        filterLabel: label,
        filteredProjects: filtered,
        listAmountMode,
        projectsPageHref,
      })
    },
    [explorerProjects, quickAction.openDrawerListMode, dateFilter],
  )

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

  const onAvailingLoanKpiClick = useCallback(() => {
    const filtered = explorerProjects.filter(
      (p) => p.availing_loan === true && p.projectStatus !== ProjectStatus.LOST,
    )
    quickAction.openDrawerListMode({
      filterLabel: 'Availing loan',
      filteredProjects: filtered,
      listAmountMode: 'deal_value',
      projectsPageHref: availingLoanProjectsUrl,
    })
  }, [explorerProjects, quickAction.openDrawerListMode, availingLoanProjectsUrl])

  if (isLoading) {
    return (
      <div className="px-3 sm:px-5 py-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="zenith-skeleton h-40 rounded-2xl" />
      </div>
    )
  }

  const kpis = buildFinanceZenithKpis(data, effFYs)
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
              onClick={k.key === 'loan' ? onAvailingLoanKpiClick : undefined}
            />
          </div>
        ))}
      </div>
      <div id="zenith-focus" className="scroll-mt-28">
        <ZenithYourFocus
          role={user!.role}
          dateFilter={dateFilter}
          zenithMainLoading={isLoading}
          onOpenFinanceDrawer={onOpenFinanceDrawer}
        />
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
      <section className="zenith-exec-section space-y-3" aria-label="Finance charts">
        <header id="zenith-charts" className="scroll-mt-24 px-0.5">
          <h2
            className="zenith-display text-lg sm:text-xl font-bold text-[color:var(--text-primary)] tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Explore the landscape
          </h2>
          <p
            className="mt-1.5 text-[11px] sm:text-xs text-[color:var(--text-muted)] italic leading-snug max-w-2xl"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            These charts are live: click any bar, point, or slice to open matching projects in the quick
            drawer.
          </p>
        </header>
        <div
          id="zenith-charts-row-1"
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 scroll-mt-28"
        >
          <div id="zenith-lead-source" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
            <ChartPanel title="Revenue by lead source" showExploreHint>
              <ZenithChartTouchReset>
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height={ZENITH_CHART_H} minWidth={0}>
                    <BarChart layout="vertical" data={leadChart} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: chartColors.axisText }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: chartColors.axisText }} />
                      <Tooltip
                        shared={false}
                        content={ExploreInrTooltip}
                        cursor={{ fill: chartColors.cursorBand }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill={chartColors.gold}
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(_row: unknown, index: number) => {
                          const row = leadChart[index]
                          if (row?.name) drill('lead_source', row.name, { leadSourceMetric: 'revenue' })
                        }}
                      >
                        {leadChart.map((_, i) => (
                          <Cell
                            key={`ls-${i}`}
                            fill={chartColors.gold}
                            style={{ transition: 'filter 0.15s' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.filter = 'brightness(1.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = 'brightness(1)'
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ZenithChartTouchReset>
            </ChartPanel>
          </div>
          <div id="zenith-sales-team" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
            <ChartPanel title="Revenue vs pipeline by sales team" showExploreHint>
              <ZenithChartTouchReset>
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height={ZENITH_CHART_H} minWidth={0}>
                    <BarChart layout="vertical" data={salesMerge} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: chartColors.axisText }} />
                      <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 9, fill: chartColors.axisText }} />
                      <Tooltip
                        shared={false}
                        content={ExploreInrTooltip}
                        cursor={{ fill: chartColors.cursorBand }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(_row: unknown, index: number) => {
                          const row = salesMerge[index]
                          if (row?.name) drill('assigned_to', row.name, { salesTeamMetric: 'revenue' })
                        }}
                      >
                        {salesMerge.map((_, i) => (
                          <Cell
                            key={`sr-${i}`}
                            fill={chartColors.gold}
                            style={{ transition: 'filter 0.15s' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.filter = 'brightness(1.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = 'brightness(1)'
                            }}
                          />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="pipeline"
                        name="Pipeline"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(_row: unknown, index: number) => {
                          const row = salesMerge[index]
                          if (row?.name) drill('assigned_to', row.name, { salesTeamMetric: 'pipeline' })
                        }}
                      >
                        {salesMerge.map((_, i) => (
                          <Cell
                            key={`sp-${i}`}
                            fill={chartColors.purple}
                            style={{ transition: 'filter 0.15s' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.filter = 'brightness(1.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = 'brightness(1)'
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ZenithChartTouchReset>
            </ChartPanel>
          </div>
          <div className="min-w-0">
            <ChartPanel title="Revenue & profit by financial year" showExploreHint>
              <ZenithRevenueProfitFyChart
                data={fyChart}
                onFyClick={({ fy, metric }) =>
                  drill('fy', fy, { fyMetric: metric === 'profit' ? 'profit' : 'revenue' })
                }
              />
            </ChartPanel>
          </div>
          <div id="zenith-loans" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
            <ChartPanel title="Loans by bank" showExploreHint>
              <ZenithChartTouchReset>
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height={ZENITH_CHART_H} minWidth={0}>
                    <BarChart layout="vertical" data={loans} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: chartColors.axisText }} />
                      <YAxis dataKey="bankLabel" type="category" width={100} tick={{ fontSize: 9, fill: chartColors.axisText }} />
                      <Tooltip content={ExploreCountTooltip} cursor={{ fill: chartColors.cursorBand }} />
                      <Bar
                        dataKey="count"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(_row: unknown, index: number) => {
                          const row = loans[index]
                          if (row?.bankLabel) drill('loan_bank', row.bankLabel)
                        }}
                      >
                        {loans.map((row, i) => (
                          <Cell
                            key={row.bankLabel ?? i}
                            fill={getLoanBankBarColor(row.bankLabel, i)}
                            style={{ transition: 'filter 0.15s' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.filter = 'brightness(1.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = 'brightness(1)'
                            }}
                          />
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
              showExploreHint
              data={seg.map((s) => ({ name: s.label, value: s.value, percentage: s.percentage }))}
              onSegmentClick={(segment) =>
                drill('customer_segment', segment, { segmentChart: 'revenue' })
              }
            />
          </div>
          <div className="flex min-h-[320px] h-full min-w-0 flex-col lg:min-h-0">
            <CustomerProfitabilityRank rows={wordCloud} dateFilter={dateFilter} className="h-full min-h-[320px] flex-1" />
          </div>
        </div>
      </section>
    </div>
  )
}
