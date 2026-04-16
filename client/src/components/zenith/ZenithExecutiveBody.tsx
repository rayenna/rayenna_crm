import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { ProjectStatus, UserRole } from '../../types'
import { getProjectStatusColor } from '../dashboard/projectStatusColors'
import { getLoanBankBarColor } from '../dashboard/loanBankChartColors'
import { buildExecutiveZenithKpis } from './zenithKpi'
import {
  buildDealFlowDrawerFilterLabel,
  buildZenithFunnelStages,
  filterExplorerProjectsByFunnelStage,
  type ZenithFunnelStage,
} from './zenithFunnel'
import type { ZenithDateFilter } from './zenithTypes'
import { useChartColors } from '../../hooks/useChartColors'
import { ZENITH_CHART_CUSTOM_TOOLTIP_SHELL } from '../dashboard/zenithRechartsTooltipStyles'
import KPICard from './KPICard'
import KPIGauge from './KPIGauge'
import DealFlowFunnel from './DealFlowFunnel'
import ZenithYourFocus from './ZenithYourFocus'
import ChartPanel from './ChartPanel'
import SegmentDonut from './SegmentDonut'
import CustomerProfitabilityRank from './CustomerProfitabilityRank'
import ZenithRevenueProfitFyChart from './ZenithRevenueProfitFyChart'
import HitList from './HitList'
import Leaderboard from './Leaderboard'
import { useHitList, type HitListProjectRow } from '../../hooks/useHitList'
import type {
  ZenithQuickActionHandle,
  QuickActionProjectRef,
  ZenithAutoFocusSection,
} from '../../hooks/useQuickAction'
import type { ZenithExplorerProject, ZenithChartDrilldownDimension } from '../../types/zenithExplorer'
import type { DrilldownOpts } from '../../utils/zenithChartDrilldown'
import { buildFilterLabel, filterProjectsByChartSlice } from '../../utils/zenithChartDrilldown'
import ForecastKPI from './ForecastKPI'
import ZenithChartTouchReset from './ZenithChartTouchReset'
import { buildProjectsUrl, type PeDashboardBucket } from '../../utils/dashboardTileLinks'
import {
  buildForecastOpenDealsProjectsHref,
  buildZenithDrawerListProjectsHref,
} from '../../utils/zenithListProjectsDeepLink'
import { projectValueRowsVisibleInZenithFyChart } from '../../utils/zenithFyChartData'
import { buildZenithLifecycleBrandBarRows } from '../../utils/zenithPanelInverterBrandChartData'
import ZenithLifecycleBrandBarCharts from './ZenithLifecycleBrandBarCharts'

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

/** Unified chart height — calmer vertical rhythm across Zenith executive view */
const ZENITH_CHART_H = 240
/** Align with `DashboardLifecycleBrandBarCharts` (Sales / Management / Admin on classic Dashboard). Operations uses `ZenithOperationsBody`, which always includes the same pair. */
const showZenithLifecycleBrandChartRole = (r: UserRole) =>
  r === UserRole.SALES || r === UserRole.MANAGEMENT || r === UserRole.ADMIN

export default function ZenithExecutiveBody({
  role,
  data,
  isLoading,
  dateFilter,
  quickAction,
  onOpenFinanceDrawer,
  onOpenOperationsDrawer,
  onOpenProjectQuickDrawer,
}: {
  role: UserRole
  data: Record<string, unknown>
  isLoading: boolean
  dateFilter: ZenithDateFilter
  quickAction: ZenithQuickActionHandle
  onOpenFinanceDrawer?: (projectId: string) => void
  onOpenOperationsDrawer?: (projectId: string) => void
  /** Hit List, pipeline, etc.: QuickAction (Sales/Finance) or operations drawer (Admin/Mgmt/Ops). */
  onOpenProjectQuickDrawer: (p: QuickActionProjectRef, section?: ZenithAutoFocusSection | null) => void
}) {
  const { user } = useAuth()
  const chartColors = useChartColors()
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

  const onPeBucketListClick = useCallback(
    (args: {
      row: { key: string; label: string }
      filteredProjects: ZenithExplorerProject[]
    }) => {
      quickAction.openDrawerListMode({
        filterLabel: `Proposal Engine — ${args.row.label}`,
        filteredProjects: args.filteredProjects,
        listAmountMode: 'deal_value',
        projectsPageHref: buildProjectsUrl({ peBucket: args.row.key as PeDashboardBucket }, dateFilter),
      })
    },
    [quickAction.openDrawerListMode, dateFilter],
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

  const panelBrandBarRows = useMemo(
    () => buildZenithLifecycleBrandBarRows(explorerProjects, 'panel'),
    [explorerProjects],
  )
  const inverterBrandBarRows = useMemo(
    () => buildZenithLifecycleBrandBarRows(explorerProjects, 'inverter'),
    [explorerProjects],
  )

  const onPanelBrandBarClick = useCallback(
    (brandLabel: string) => drill('panel_brand', brandLabel),
    [drill],
  )
  const onInverterBrandBarClick = useCallback(
    (brandLabel: string) => drill('inverter_brand', brandLabel),
    [drill],
  )

  if (isLoading) return <ZenithSkeleton />

  const kpis = buildExecutiveZenithKpis(role, data, dateFilter.selectedFYs)
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
    <div className="zenith-exec-main mx-auto px-3 sm:px-5 py-5 lg:py-6 pb-24 max-lg:pb-36 space-y-5 lg:space-y-6">
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
                onOpenDrawer={(p) => onOpenProjectQuickDrawer(p)}
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
                    onClick={k.key === 'loan' ? onAvailingLoanKpiClick : undefined}
                  />
                )}
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3 min-w-0 shrink-0">
              <ForecastKPI
                projects={explorerProjects}
                onOpenForecastList={(args) =>
                  quickAction.openDrawerListMode({
                    ...args,
                    projectsPageHref: buildForecastOpenDealsProjectsHref(dateFilter),
                  })
                }
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
                  onClick={k.key === 'loan' ? onAvailingLoanKpiClick : undefined}
                />
              )}
            </div>
          ))}
          <div className="col-span-2 sm:col-span-3 min-w-0 shrink-0">
            <ForecastKPI
              projects={explorerProjects}
              onOpenForecastList={(args) =>
                quickAction.openDrawerListMode({
                  ...args,
                  projectsPageHref: buildForecastOpenDealsProjectsHref(dateFilter),
                })
              }
            />
          </div>
        </div>
      )}

      {(role === UserRole.SALES || role === UserRole.ADMIN || role === UserRole.MANAGEMENT) && (
        <div id="zenith-leaderboard" className="w-full scroll-mt-28 shrink-0 min-w-0">
          <Leaderboard
            projects={explorerProjects}
            currentUser={{ id: user?.id ?? '', name: user?.name ?? '' }}
            dateFilter={dateFilter}
            onOpenListMode={quickAction.openDrawerListMode}
          />
        </div>
      )}

      <section className="zenith-exec-section space-y-4" aria-label="Pipeline and priorities">
        <div id="zenith-funnel" className="scroll-mt-24">
          <DealFlowFunnel
            stages={funnelStages}
            paymentItems={paymentItems}
            dateFilter={dateFilter}
            onPaymentStatusClick={onPaymentStatusPillClick}
            onDealFlowStageClick={onDealFlowStageClick}
          />
        </div>

        <div id="zenith-focus" className="scroll-mt-24">
          <ZenithYourFocus
            role={role}
            dateFilter={dateFilter}
            zenithMainLoading={isLoading}
            onOpenDrawer={(p, section) => onOpenProjectQuickDrawer(p, section ?? null)}
            onOpenFinanceDrawer={onOpenFinanceDrawer}
            onOpenOperationsDrawer={onOpenOperationsDrawer}
            showProposalEngine={
              role === UserRole.ADMIN || role === UserRole.MANAGEMENT || role === UserRole.SALES
            }
            zenithExplorerProjects={explorerProjects}
            onPeBucketListClick={onPeBucketListClick}
          />
        </div>
      </section>

      <section className="zenith-exec-section space-y-3" aria-label="Analytics charts">
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
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 scroll-mt-24"
        >
          <div className="min-w-0">
            <ChartPanel title="Projects by stage" showExploreHint>
              <ZenithChartTouchReset>
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height={ZENITH_CHART_H} minWidth={0}>
                    <BarChart
                      layout="vertical"
                      data={projectsByStatus}
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="statusLabel"
                        width={118}
                        tick={{ fill: chartColors.axisText, fontSize: 10 }}
                      />
                      <Tooltip content={ExploreCountTooltip} cursor={{ fill: chartColors.cursorBand }} />
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

          {canLeadPipeline ? (
            <>
              <div id="zenith-lead-source" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
                <ChartPanel title="Revenue vs pipeline by lead source" showExploreHint>
                  <ZenithChartTouchReset>
                    {(rk) => (
                      <ResponsiveContainer key={rk} width="100%" height={ZENITH_CHART_H} minWidth={0}>
                        <BarChart
                          layout="vertical"
                          data={leadMerge}
                          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: chartColors.axisText }} />
                          <Tooltip
                            shared={false}
                            content={ExploreInrTooltip}
                            cursor={{ fill: chartColors.cursorBand }}
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
                                fill="var(--accent-gold)"
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
                                fill="var(--accent-teal)"
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
                        <BarChart
                          layout="vertical"
                          data={salesMerge}
                          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 9, fill: chartColors.axisText }} />
                          <Tooltip
                            shared={false}
                            content={ExploreInrTooltip}
                            cursor={{ fill: chartColors.cursorBand }}
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
                                fill="var(--accent-gold)"
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
                    )}
                  </ZenithChartTouchReset>
                </ChartPanel>
              </div>
            </>
          ) : null}
        </div>

        {showZenithLifecycleBrandChartRole(role) ? (
          <div
            id="zenith-charts-row-lifecycle"
            className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 scroll-mt-24 mt-3 lg:mt-4"
          >
            <ZenithLifecycleBrandBarCharts
              panelRows={panelBrandBarRows}
              inverterRows={inverterBrandBarRows}
              chartHeight={ZENITH_CHART_H}
              onPanelBrandClick={onPanelBrandBarClick}
              onInverterBrandClick={onInverterBrandBarClick}
            />
          </div>
        ) : null}
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
            className="flex h-full min-h-[320px] flex-col overflow-visible lg:min-h-0 lg:overflow-hidden"
            contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible lg:overflow-hidden"
          >
            <div className="h-[260px] w-full shrink-0 lg:h-0 lg:min-h-[360px] lg:flex-1">
              <ZenithChartTouchReset className="h-full w-full min-w-0">
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height="100%" minWidth={0}>
                    <BarChart
                      layout="vertical"
                      data={loans}
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 10 }} />
                      <YAxis dataKey="bankLabel" type="category" width={100} tick={{ fontSize: 9, fill: chartColors.axisText }} />
                      <Tooltip content={ExploreCountTooltip} cursor={{ fill: chartColors.cursorBand }} />
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
                )}
              </ZenithChartTouchReset>
            </div>
          </ChartPanel>
        </div>
        <div className="flex min-h-[320px] h-full min-w-0 flex-col lg:min-h-0">
          <CustomerProfitabilityRank rows={wordCloud} dateFilter={dateFilter} className="h-full min-h-[320px] flex-1" />
        </div>
      </div>
      </section>

    </div>
  )
}
