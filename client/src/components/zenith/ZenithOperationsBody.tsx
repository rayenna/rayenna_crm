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
import { useCallback, useMemo } from 'react'
import { useChartColors } from '../../hooks/useChartColors'
import { ZENITH_CHART_CUSTOM_TOOLTIP_SHELL } from '../dashboard/zenithRechartsTooltipStyles'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { ProjectStatus } from '../../types'
import { getProjectStatusColor } from '../dashboard/projectStatusColors'
import { buildOperationsZenithKpis } from './zenithKpi'
import {
  buildDealFlowDrawerFilterLabel,
  buildZenithOperationsExecutionFunnel,
  filterExplorerProjectsByFunnelStage,
  type ZenithFunnelStage,
} from './zenithFunnel'
import { ZENITH_QUERY_STALE_MS } from '../../constants/zenithQueryStale'
import type { ZenithDateFilter } from './zenithTypes'
import type {
  QuickActionProjectRef,
  ZenithListAmountMode,
  ZenithAutoFocusSection,
} from '../../hooks/useQuickAction'
import KPICard from './KPICard'
import DealFlowFunnel from './DealFlowFunnel'
import ZenithYourFocus from './ZenithYourFocus'
import ChartPanel from './ChartPanel'
import SegmentDonut from './SegmentDonut'
import ZenithRevenueProfitFyChart from './ZenithRevenueProfitFyChart'
import ZenithChartTouchReset from './ZenithChartTouchReset'
import { ZENITH_CHART_GROUP } from '../../constants/zenithChartGroups'
import type { ZenithChartGroup } from '../../constants/zenithChartGroups'
import {
  chartResetGroupForDrill,
  exploreChartResetGroup,
  funnelChartResetGroup,
} from '../../utils/zenithChartResetGroup'
import { projectValueRowsVisibleInZenithFyChart } from '../../utils/zenithFyChartData'
import type { ZenithExplorerProject, ZenithChartDrilldownDimension } from '../../types/zenithExplorer'
import type { DrilldownOpts } from '../../utils/zenithChartDrilldown'
import { buildFilterLabel, filterProjectsByChartSlice } from '../../utils/zenithChartDrilldown'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { buildZenithDrawerListProjectsHref } from '../../utils/zenithListProjectsDeepLink'
import { buildZenithLifecycleBrandBarRows } from '../../utils/zenithPanelInverterBrandChartData'
import ZenithLifecycleBrandBarCharts from './ZenithLifecycleBrandBarCharts'
import { ZENITH_CHART_HEIGHT_FLOOR, zenithStandardChartHeight } from './zenithChartHeight'
import { isZenithMobileTabActive } from './zenithMobileTabVisibility'
import type { ZenithMobileTab } from './zenithMobileNav'

const icons = [Zap, TrendingUp, IndianRupee, Target, Percent]

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

export default function ZenithOperationsBody({
  data,
  isLoading,
  dateFilter,
  onOpenDrawerListMode,
  onOpenOperationsDrawer,
  onOpenProjectQuickDrawer,
  mobileTab = null,
}: {
  data: Record<string, unknown>
  isLoading: boolean
  dateFilter: ZenithDateFilter
  onOpenDrawerListMode: (args: {
    filterLabel: string
    filteredProjects: ZenithExplorerProject[]
    listAmountMode?: ZenithListAmountMode
    projectsPageHref?: string | null
    chartResetGroup?: ZenithChartGroup
  }) => void
  onOpenOperationsDrawer?: (projectId: string) => void
  onOpenProjectQuickDrawer: (p: QuickActionProjectRef, section?: ZenithAutoFocusSection | null) => void
  mobileTab?: ZenithMobileTab | null
}) {
  const { user } = useAuth()
  const chartColors = useChartColors()
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
    staleTime: ZENITH_QUERY_STALE_MS,
  })

  const explorerProjects = (data?.zenithExplorerProjects ?? []) as ZenithExplorerProject[]

  const pendingInstallationProjectsUrl = buildProjectsUrl(
    { status: [ProjectStatus.CONFIRMED, ProjectStatus.UNDER_INSTALLATION] },
    dateFilter,
  )
  const completedInstallationProjectsUrl = buildProjectsUrl(
    { status: [ProjectStatus.COMPLETED, ProjectStatus.COMPLETED_SUBSIDY_CREDITED] },
    dateFilter,
  )
  const subsidyCreditedProjectsUrl = buildProjectsUrl(
    { status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] },
    dateFilter,
  )

  /** Same status sets as `/api/dashboard/operations` counts (pending / completed installation, subsidy credited). */
  const onPendingInstallationKpiClick = useCallback(() => {
    const filtered = explorerProjects.filter(
      (p) =>
        p.projectStatus === ProjectStatus.CONFIRMED || p.projectStatus === ProjectStatus.UNDER_INSTALLATION,
    )
    onOpenDrawerListMode({
      filterLabel: 'Pending installation',
      filteredProjects: filtered,
      listAmountMode: 'deal_value',
      projectsPageHref: pendingInstallationProjectsUrl,
      chartResetGroup: exploreChartResetGroup('ops'),
    })
  }, [explorerProjects, onOpenDrawerListMode, pendingInstallationProjectsUrl])

  const onCompletedInstallationKpiClick = useCallback(() => {
    const filtered = explorerProjects.filter(
      (p) =>
        p.projectStatus === ProjectStatus.COMPLETED ||
        p.projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
    )
    onOpenDrawerListMode({
      filterLabel: 'Completed installation',
      filteredProjects: filtered,
      listAmountMode: 'deal_value',
      projectsPageHref: completedInstallationProjectsUrl,
      chartResetGroup: exploreChartResetGroup('ops'),
    })
  }, [explorerProjects, onOpenDrawerListMode, completedInstallationProjectsUrl])

  const onSubsidyCreditedKpiClick = useCallback(() => {
    const filtered = explorerProjects.filter(
      (p) => p.projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
    )
    onOpenDrawerListMode({
      filterLabel: 'Subsidy credited',
      filteredProjects: filtered,
      listAmountMode: 'deal_value',
      projectsPageHref: subsidyCreditedProjectsUrl,
      chartResetGroup: exploreChartResetGroup('ops'),
    })
  }, [explorerProjects, onOpenDrawerListMode, subsidyCreditedProjectsUrl])

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
      onOpenDrawerListMode({
        filterLabel: label,
        filteredProjects: filtered,
        listAmountMode,
        projectsPageHref,
        chartResetGroup: chartResetGroupForDrill(dimension, 'ops'),
      })
    },
    [explorerProjects, onOpenDrawerListMode, dateFilter],
  )

  const onPaymentStatusPillClick = useCallback(
    (paymentUrlParam: string) => {
      const filtered = filterProjectsByChartSlice(explorerProjects, 'payment_status', paymentUrlParam)
      onOpenDrawerListMode({
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
        chartResetGroup: exploreChartResetGroup('ops'),
      })
    },
    [explorerProjects, onOpenDrawerListMode, dateFilter],
  )

  const onDealFlowStageClick = useCallback(
    (stage: ZenithFunnelStage) => {
      const filtered = filterExplorerProjectsByFunnelStage(stage.id, explorerProjects)
      onOpenDrawerListMode({
        filterLabel: buildDealFlowDrawerFilterLabel(stage),
        filteredProjects: filtered,
        listAmountMode: 'deal_value',
        projectsPageHref: stage.to,
        chartResetGroup: funnelChartResetGroup('ops'),
      })
    },
    [explorerProjects, onOpenDrawerListMode],
  )

  const panelBrandBarRows = useMemo(
    () => buildZenithLifecycleBrandBarRows(explorerProjects, 'panel'),
    [explorerProjects],
  )
  const inverterBrandBarRows = useMemo(
    () => buildZenithLifecycleBrandBarRows(explorerProjects, 'inverter'),
    [explorerProjects],
  )

  const exploreChartHeight = useMemo(
    () => zenithStandardChartHeight(inverterBrandBarRows.length, ZENITH_CHART_HEIGHT_FLOOR),
    [inverterBrandBarRows.length],
  )

  const onPanelBrandBarClick = useCallback(
    (brandLabel: string) => drill('panel_brand', brandLabel),
    [drill],
  )
  const onInverterBrandBarClick = useCallback(
    (brandLabel: string) => drill('inverter_brand', brandLabel),
    [drill],
  )

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
  const fyChart = [...projectValueRowsVisibleInZenithFyChart(fyRows, effFYs)]
    .sort((a, b) => a.fy.localeCompare(b.fy))
    .map((r) => ({
      fy: r.fy,
      revenue: r.totalProjectValue,
      profit: r.totalProfit,
    }))
  const seg = (data?.projectValueByType ?? []) as {
    type: string
    label: string
    value: number
    percentage: string
  }[]
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

  const showOverview = isZenithMobileTabActive(mobileTab, 'overview')
  const showPipeline = isZenithMobileTabActive(mobileTab, 'pipeline')
  const showCharts = isZenithMobileTabActive(mobileTab, 'charts')

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-6 space-y-8 pb-24 max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      {showOverview ? (
      <div
        id="zenith-kpis"
        className="grid w-full grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-2 scroll-mt-28"
      >
        {kpis.map((k, i) => (
          <div key={k.key} className="min-w-0">
            <KPICard
              item={k}
              index={i}
              icon={icons[i] ?? Zap}
              onClick={
                k.key === 'pend'
                  ? onPendingInstallationKpiClick
                  : k.key === 'done'
                    ? onCompletedInstallationKpiClick
                    : k.key === 'cred'
                      ? onSubsidyCreditedKpiClick
                      : undefined
              }
            />
          </div>
        ))}
      </div>
      ) : null}
      {showPipeline ? (
      <>
      <div id="zenith-focus" className="scroll-mt-28">
        <ZenithYourFocus
          role={user!.role}
          dateFilter={dateFilter}
          zenithMainLoading={isLoading}
          onOpenDrawer={(p, section) => onOpenProjectQuickDrawer(p, section ?? null)}
          onOpenOperationsDrawer={onOpenOperationsDrawer}
        />
      </div>
      <div id="zenith-funnel" className="scroll-mt-28">
        <DealFlowFunnel
          stages={funnel}
          title="Project Execution Flow"
          paymentItems={paymentItems}
          dateFilter={dateFilter}
          onPaymentStatusClick={onPaymentStatusPillClick}
          onDealFlowStageClick={onDealFlowStageClick}
        />
      </div>
      </>
      ) : null}
      {showCharts ? (
      <section className="zenith-exec-section space-y-3" aria-label="Operations charts">
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
        {/* Single 2×2 grid from lg (1024px): avoids one huge column on typical laptops (xl was 1280px) */}
        <div
          id="zenith-charts-grid"
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 scroll-mt-28 [&>*]:min-w-0"
        >
          <div id="zenith-charts-row-1" className="scroll-mt-28 flex min-h-0 flex-col lg:h-full">
            <ChartPanel className="min-h-0 flex-1 lg:h-full" title="Projects by stage" showExploreHint>
              <ZenithChartTouchReset chartGroup={ZENITH_CHART_GROUP.OPS_EXPLORE}>
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height={exploreChartHeight} minWidth={0}>
                    <BarChart layout="vertical" data={projectsByStatus} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 10 }} />
                      <YAxis type="category" dataKey="statusLabel" width={118} tick={{ fontSize: 10, fill: chartColors.axisText }} />
                      <Tooltip content={ExploreCountTooltip} cursor={{ fill: chartColors.cursorBand }} />
                      <Bar
                        dataKey="count"
                        radius={[0, 6, 6, 0]}
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
          <div id="zenith-sales-team" className="scroll-mt-28 flex min-h-0 flex-col lg:h-full">
            <ChartPanel className="min-h-0 flex-1 lg:h-full" title="Revenue vs pipeline by sales team" showExploreHint>
              <ZenithChartTouchReset chartGroup={ZENITH_CHART_GROUP.OPS_EXPLORE}>
                {(rk) => (
                  <ResponsiveContainer key={rk} width="100%" height={exploreChartHeight} minWidth={0}>
                    <BarChart layout="vertical" data={salesMerge} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: chartColors.axisText }} />
                      <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 9, fill: chartColors.axisText }} />
                      <Tooltip
                        shared={false}
                        content={ExploreInrTooltip}
                        cursor={{ fill: chartColors.cursorBand }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: chartColors.axisText }} />
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
                            fill={chartColors.teal}
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
          <div className="scroll-mt-28 flex min-h-0 flex-col lg:h-full">
            <ChartPanel className="min-h-0 flex-1 lg:h-full" title="Revenue & profit by financial year" showExploreHint>
              <ZenithRevenueProfitFyChart
                data={fyChart}
                height={exploreChartHeight}
                chartGroup={ZENITH_CHART_GROUP.OPS_EXPLORE}
                onFyClick={({ fy, metric }) =>
                  drill('fy', fy, { fyMetric: metric === 'profit' ? 'profit' : 'revenue' })
                }
              />
            </ChartPanel>
          </div>
          <div id="zenith-segments" className="scroll-mt-28 flex min-h-0 flex-col lg:h-full">
            <SegmentDonut
              title="Revenue by Customer Type"
              showExploreHint
              chartGroup={ZENITH_CHART_GROUP.OPS_DONUT}
              chartHeightPx={exploreChartHeight}
              stretchToRowHeight
              data={seg.map((s) => ({
                name: s.label,
                value: s.value,
                percentage: s.percentage,
                segmentKey: s.type,
              }))}
              onSegmentClick={(segment) =>
                drill('customer_segment', segment, { segmentChart: 'revenue' })
              }
            />
          </div>
        </div>

        <div id="zenith-charts-row-lifecycle" className="scroll-mt-28 mt-3 sm:mt-4 w-full min-w-0">
          <ZenithLifecycleBrandBarCharts
            panelRows={panelBrandBarRows}
            inverterRows={inverterBrandBarRows}
            chartHeight={ZENITH_CHART_HEIGHT_FLOOR}
            chartGroup={ZENITH_CHART_GROUP.OPS_EXPLORE}
            onPanelBrandClick={onPanelBrandBarClick}
            onInverterBrandClick={onInverterBrandBarClick}
          />
        </div>
      </section>
      ) : null}
    </div>
  )
}
