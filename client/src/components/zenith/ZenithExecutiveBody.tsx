import { useCallback, useLayoutEffect, useRef, useState } from 'react'
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
import { Zap, TrendingUp, IndianRupee, Target, Percent, Landmark } from 'lucide-react'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import { getProjectStatusColor } from '../dashboard/projectStatusColors'
import { getLoanBankBarColor } from '../dashboard/loanBankChartColors'
import { buildExecutiveZenithKpis } from './zenithKpi'
import { buildZenithFunnelStages } from './zenithFunnel'
import type { ZenithDateFilter } from './zenithTypes'
import KPICard from './KPICard'
import KPIGauge from './KPIGauge'
import DealFlowFunnel from './DealFlowFunnel'
import ZenithYourFocus from './ZenithYourFocus'
import ChartPanel from './ChartPanel'
import SegmentDonut from './SegmentDonut'
import CustomerProfitabilityRank from './CustomerProfitabilityRank'
import ZenithRevenueProfitFyChart from './ZenithRevenueProfitFyChart'
import ZenithProposalEngineCard from './ZenithProposalEngineCard'
import HitList from './HitList'
import { useHitList, type HitListProjectRow } from '../../hooks/useHitList'
import type { ZenithQuickActionHandle } from '../../hooks/useQuickAction'
import type { ZenithExplorerProject, ZenithChartDrilldownDimension } from '../../types/zenithExplorer'
import type { DrilldownOpts } from '../../utils/zenithChartDrilldown'
import { buildFilterLabel, filterProjectsByChartSlice } from '../../utils/zenithChartDrilldown'
import ForecastKPI from './ForecastKPI'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { projectValueRowsVisibleInZenithFyChart } from '../../utils/zenithFyChartData'

const icons = [Zap, TrendingUp, IndianRupee, Target, Percent, Landmark]
const DEFAULT_MONTHLY_TARGET_KW = 50
const SALES_MONTHLY_TARGET_KW = 25

function monthsInSelectedPeriod(dateFilter: ZenithDateFilter): number {
  const months = dateFilter.selectedMonths?.length ?? 0
  if (months > 0) return months

  const quarters = dateFilter.selectedQuarters?.length ?? 0
  if (quarters > 0) return quarters * 3

  const fys = dateFilter.selectedFYs?.length ?? 0
  if (fys > 0) return fys * 12

  // Fallback: treat as "this month" to avoid overstating the target.
  return 1
}

function ZenithSkeleton() {
  return (
    <div className="zenith-exec-main mx-auto space-y-5 px-3 sm:px-5 py-5 lg:py-6">
      <div className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="zenith-skeleton h-32 rounded-xl min-w-0" />
        ))}
      </div>
      <div className="zenith-skeleton h-40 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="zenith-skeleton h-72 rounded-xl min-w-0" />
        ))}
      </div>
    </div>
  )
}

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
  /** With grouped bars, `shared={false}` so payload[0] is the hovered series only. */
  const item = payload[0]!
  const v = Number(item.value)
  const seriesName =
    item.name != null && String(item.name).trim() !== '' ? String(item.name) : 'Value'
  const cat = label != null && label !== '' ? String(label) : ''
  return (
    <div
      style={{
        background: '#1A1A2E',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 12px',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
        {cat ? `${cat} · ` : ''}
        {seriesName}: ₹{Number.isFinite(v) ? v.toLocaleString('en-IN') : '—'}
      </div>
      <div style={{ color: '#F5A623', fontSize: 11, marginTop: 4 }}>Click to view projects →</div>
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
    <div
      style={{
        background: '#1A1A2E',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 12px',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
        {label}: {Number.isFinite(n) ? n : '—'} projects
      </div>
      <div style={{ color: '#F5A623', fontSize: 11, marginTop: 4 }}>Click to view projects →</div>
    </div>
  )
}

/** Unified chart height — calmer vertical rhythm across Zenith executive view */
const ZENITH_CHART_H = 240

export default function ZenithExecutiveBody({
  role,
  data,
  isLoading,
  dateFilter,
  quickAction,
}: {
  role: UserRole
  data: Record<string, unknown>
  isLoading: boolean
  dateFilter: ZenithDateFilter
  quickAction: ZenithQuickActionHandle
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

  const showHitList =
    role === UserRole.SALES || role === UserRole.ADMIN || role === UserRole.MANAGEMENT

  const { data: focusData, isLoading: focusLoading } = useQuery({
    queryKey: ['zenith-focus', user?.id, effFYs, effQ, effM],
    queryFn: async () => {
      const params = new URLSearchParams()
      effFYs.forEach((fy) => params.append('fy', fy))
      effQ.forEach((q) => params.append('quarter', q))
      effM.forEach((m) => params.append('month', m))
      const res = await axiosInstance.get(`/api/dashboard/zenith-focus?${params.toString()}`)
      return res.data as {
        focusKind: string
        salesPipeline?: { rows: HitListProjectRow[] }
      }
    },
    enabled: !!user?.id && showHitList && !isLoading,
  })

  const pipelineRows: HitListProjectRow[] =
    focusData &&
    (focusData.focusKind === 'SALES' || focusData.focusKind === 'MANAGEMENT') &&
    focusData.salesPipeline
      ? focusData.salesPipeline.rows
      : []

  const hitListResult = useHitList(pipelineRows, role, user ?? null)

  const explorerProjects = (data?.zenithExplorerProjects ?? []) as ZenithExplorerProject[]

  const drill = useCallback(
    (dimension: ZenithChartDrilldownDimension, value: string, opts?: DrilldownOpts) => {
      const filtered = filterProjectsByChartSlice(explorerProjects, dimension, value, opts)
      const label = buildFilterLabel(dimension, value, opts)
      const listAmountMode =
        dimension === 'fy' && opts?.fyMetric === 'profit' ? 'gross_profit' : 'deal_value'
      quickAction.openDrawerListMode({ filterLabel: label, filteredProjects: filtered, listAmountMode })
    },
    [explorerProjects, quickAction],
  )

  /** Match Hit List height to KPI grid on lg+. Row must use items-start (not stretch) so the grid keeps its natural height; if the row stretches the grid to the Hit List, offsetHeight equals the list and the widget never shrinks. */
  const kpiBandRef = useRef<HTMLDivElement>(null)
  const [kpiBandHeightPx, setKpiBandHeightPx] = useState(0)

  useLayoutEffect(() => {
    if (!showHitList) {
      setKpiBandHeightPx(0)
      return
    }
    const el = kpiBandRef.current
    if (!el) return
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => {
      if (!mq.matches) {
        setKpiBandHeightPx(0)
        return
      }
      setKpiBandHeightPx(el.offsetHeight)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    mq.addEventListener('change', sync)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      mq.removeEventListener('change', sync)
      window.removeEventListener('resize', sync)
    }
  }, [showHitList, focusLoading, isLoading])

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
  const availingLoanProjectsUrl = buildProjectsUrl({ availingLoan: true }, dateFilter)
  const totalCapacityKW = Number(kpis.find((k) => k.key === 'capacity')?.value ?? 0)
  const pipelineCapacityKW = Number((data as { pipelineCapacityKW?: number })?.pipelineCapacityKW ?? 0)
  const hasExplicitPeriod =
    (dateFilter.selectedMonths?.length ?? 0) > 0 ||
    (dateFilter.selectedQuarters?.length ?? 0) > 0 ||
    (dateFilter.selectedFYs?.length ?? 0) > 0
  const monthlyTargetKW = role === UserRole.SALES ? SALES_MONTHLY_TARGET_KW : DEFAULT_MONTHLY_TARGET_KW
  const targetKW = hasExplicitPeriod ? monthlyTargetKW * monthsInSelectedPeriod(dateFilter) : null
  const gaugePipelineKW = hasExplicitPeriod ? pipelineCapacityKW : null
  const funnelRole = role === UserRole.SALES ? UserRole.SALES : UserRole.MANAGEMENT
  const funnelStages = buildZenithFunnelStages(funnelRole, data, dateFilter)

  const projectsByStatus = (data?.projectsByStatus ?? []) as {
    status: string
    statusLabel: string
    count: number
  }[]

  const fyChart = [...projectValueRowsVisibleInZenithFyChart(fyRows, effFYs)]
    .sort((a, b) => a.fy.localeCompare(b.fy))
    .map((r) => ({
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
    <div className="zenith-exec-main mx-auto px-3 sm:px-5 py-5 lg:py-6 pb-14 space-y-5 lg:space-y-6">
      {showHitList ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-4 xl:gap-5 scroll-mt-28">
          {focusLoading ? (
            <div
              id="zenith-hit-list"
              className="zenith-skeleton h-36 w-full shrink-0 rounded-xl lg:min-h-[11rem] lg:w-[27rem] lg:max-w-[min(27rem,calc(100vw-3rem))] lg:shrink-0"
              style={kpiBandHeightPx > 0 ? { height: kpiBandHeightPx } : undefined}
              aria-hidden
            />
          ) : (
            <div
              id="zenith-hit-list"
              className="scroll-mt-28 flex w-full shrink-0 flex-col lg:min-h-0 lg:overflow-hidden lg:w-[27rem] lg:max-w-[min(27rem,calc(100vw-3rem))] lg:shrink-0"
              style={kpiBandHeightPx > 0 ? { height: kpiBandHeightPx } : undefined}
            >
              <HitList
                hitList={hitListResult.hitList}
                totalAtRisk={hitListResult.totalAtRisk}
                allClear={hitListResult.allClear}
                role={role}
                onOpenDrawer={(p) => quickAction.openDrawer(p)}
              />
            </div>
          )}
          <div
            id="zenith-kpis"
            ref={kpiBandRef}
            className="grid min-w-0 flex-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-3 scroll-mt-28 content-start lg:pb-0"
          >
            {kpis.map((k, i) => (
              <div key={k.key} className="min-w-0 h-full">
                {k.key === 'capacity' ? (
                  <KPIGauge
                    totalKW={totalCapacityKW}
                    pipelineKW={gaugePipelineKW}
                    targetKW={targetKW}
                  />
                ) : (
                  <KPICard
                    item={k}
                    index={i}
                    icon={icons[i] ?? Zap}
                    to={k.key === 'loan' ? availingLoanProjectsUrl : undefined}
                  />
                )}
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3 min-w-0 shrink-0">
              <ForecastKPI
                projects={explorerProjects}
                onOpenForecastList={quickAction.openDrawerListMode}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          id="zenith-kpis"
          className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-3 scroll-mt-28"
        >
          {kpis.map((k, i) => (
            <div key={k.key} className="min-w-0 h-full">
              {k.key === 'capacity' ? (
                <KPIGauge
                  totalKW={totalCapacityKW}
                  pipelineKW={gaugePipelineKW}
                  targetKW={targetKW}
                />
              ) : (
                <KPICard
                  item={k}
                  index={i}
                  icon={icons[i] ?? Zap}
                  to={k.key === 'loan' ? availingLoanProjectsUrl : undefined}
                />
              )}
            </div>
          ))}
          <div className="col-span-2 sm:col-span-3 min-w-0 shrink-0">
            <ForecastKPI
              projects={explorerProjects}
              onOpenForecastList={quickAction.openDrawerListMode}
            />
          </div>
        </div>
      )}

      <section className="zenith-exec-section space-y-4" aria-label="Pipeline and priorities">
        <div id="zenith-funnel" className="scroll-mt-24">
          <DealFlowFunnel stages={funnelStages} paymentItems={paymentItems} dateFilter={dateFilter} />
        </div>

        <div id="zenith-focus" className="scroll-mt-24">
          <ZenithYourFocus
            role={role}
            dateFilter={dateFilter}
            zenithMainLoading={isLoading}
            onOpenDrawer={(p) => quickAction.openDrawer(p)}
          />
        </div>
      </section>

      <section className="zenith-exec-section space-y-3" aria-label="Analytics charts">
        <header id="zenith-charts" className="scroll-mt-24 px-0.5">
          <h2
            className="zenith-display text-lg sm:text-xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Explore the landscape
          </h2>
          <p
            className="mt-1.5 text-[11px] sm:text-xs text-white/35 italic leading-snug max-w-2xl"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            These charts are live: click any bar, point, or slice to open matching projects in the quick
            drawer.
          </p>
        </header>
        <div
          id="zenith-charts-row-1"
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 scroll-mt-24"
        >
          <div className="min-w-0">
            <ChartPanel title="Projects by stage" showExploreHint>
              <ResponsiveContainer width="100%" height={ZENITH_CHART_H} minWidth={0}>
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
                  <Tooltip content={ExploreCountTooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar
                    dataKey="count"
                    radius={[0, 6, 6, 0]}
                    animationDuration={900}
                    cursor="pointer"
                    onClick={(_row: unknown, index: number) => {
                      const row = projectsByStatus[index]
                      if (row?.statusLabel) drill('stage', row.statusLabel)
                    }}
                  >
                    {projectsByStatus.map((_, i) => (
                      <Cell
                        key={i}
                        fill={getProjectStatusColor(projectsByStatus[i]!.status, i)}
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

          {canLeadPipeline ? (
            <>
              <div id="zenith-lead-source" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
                <ChartPanel title="Revenue vs pipeline by lead source" showExploreHint>
                  <ResponsiveContainer width="100%" height={ZENITH_CHART_H} minWidth={0}>
                    <BarChart
                      layout="vertical"
                      data={leadMerge}
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                      <Tooltip
                        shared={false}
                        content={ExploreInrTooltip}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(_row: unknown, index: number) => {
                          const row = leadMerge[index]
                          if (row?.name) drill('lead_source', row.name, { leadSourceMetric: 'revenue' })
                        }}
                      >
                        {leadMerge.map((_, i) => (
                          <Cell
                            key={`r-${i}`}
                            fill="#f5a623"
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
                          const row = leadMerge[index]
                          if (row?.name) drill('lead_source', row.name, { leadSourceMetric: 'pipeline' })
                        }}
                      >
                        {leadMerge.map((_, i) => (
                          <Cell
                            key={`p-${i}`}
                            fill="#00d4b4"
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
                </ChartPanel>
              </div>

              <div id="zenith-sales-team" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
                <ChartPanel title="Revenue vs pipeline by sales team" showExploreHint>
                  <ResponsiveContainer width="100%" height={ZENITH_CHART_H} minWidth={0}>
                    <BarChart
                      layout="vertical"
                      data={salesMerge}
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 9 }} />
                      <Tooltip
                        shared={false}
                        content={ExploreInrTooltip}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      />
                      <Legend />
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
                            fill="#f5a623"
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
                            fill="#a78bfa"
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
                </ChartPanel>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="zenith-exec-section" aria-label="Segments">
      <div id="zenith-segments" className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 scroll-mt-24">
        <SegmentDonut
          title="Revenue by customer segment"
          showExploreHint
          data={revenueSeg.map((s) => ({ name: s.label, value: s.value, percentage: s.percentage }))}
          onSegmentClick={(segment) =>
            drill('customer_segment', segment, { segmentChart: 'revenue' })
          }
        />
        <SegmentDonut
          title="Pipeline by customer segment"
          showExploreHint
          data={pipeSeg.map((s) => ({ name: s.label, value: s.value, percentage: s.percentage }))}
          onSegmentClick={(segment) =>
            drill('customer_segment', segment, { segmentChart: 'pipeline' })
          }
        />
      </div>
      </section>

      <section className="zenith-exec-section" aria-label="Loans and profitability">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 lg:items-stretch lg:min-h-[480px]">
        <div id="zenith-loans" className="scroll-mt-24 min-w-0 flex min-h-0 h-full flex-col">
          <ChartPanel
            title="Loans by bank"
            showExploreHint
            className="flex h-full min-h-[320px] flex-col overflow-hidden lg:min-h-0"
            contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          >
            <div className="h-[260px] w-full shrink-0 lg:h-0 lg:min-h-[360px] lg:flex-1">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  layout="vertical"
                  data={loans}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
                  <YAxis dataKey="bankLabel" type="category" width={100} tick={{ fontSize: 9 }} />
                  <Tooltip content={ExploreCountTooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    animationDuration={800}
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
            </div>
          </ChartPanel>
        </div>
        <div className="flex min-h-[320px] h-full min-w-0 flex-col lg:min-h-0">
          <CustomerProfitabilityRank rows={wordCloud} className="h-full min-h-[320px] flex-1" />
        </div>
      </div>
      </section>

      {(role === UserRole.ADMIN || role === UserRole.MANAGEMENT || role === UserRole.SALES) && (
        <section className="zenith-exec-section" aria-label="Proposal Engine">
          <div id="zenith-proposal-engine" className="scroll-mt-24">
            <ZenithProposalEngineCard
              selectedFYs={dateFilter.selectedFYs}
              selectedQuarters={dateFilter.selectedQuarters}
              selectedMonths={dateFilter.selectedMonths}
            />
          </div>
        </section>
      )}

    </div>
  )
}
