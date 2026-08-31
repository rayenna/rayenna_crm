import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ZenithChartDrilldownDimension, ZenithExplorerProject } from '../../types/zenithExplorer'
import { ZENITH_EXPLORER_PROJECT_CAP } from '../../utils/revenueForecast'
import {
  buildCommissioningTimelineRows,
  buildOutstandingBySalespersonRows,
  buildPipelineAgeChartRows,
  type ZenithInsightBarRow,
} from '../../utils/zenithInsightCharts'
import { useChartColors } from '../../hooks/useChartColors'
import { ZENITH_CHART_CUSTOM_TOOLTIP_SHELL } from '../dashboard/zenithRechartsTooltipStyles'
import ChartPanel from './ChartPanel'
import ZenithChartTouchReset from './ZenithChartTouchReset'
import type { ZenithChartGroup } from '../../constants/zenithChartGroups'

function CountTooltip({
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

function InrTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: unknown; payload?: ZenithInsightBarRow }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const amt = Number(payload[0]?.value)
  return (
    <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 13, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ color: 'var(--chart-tooltip-fg-muted)', fontSize: 12, marginTop: 2 }}>
        ₹{Number.isFinite(amt) ? Math.round(amt).toLocaleString('en-IN') : '—'} outstanding
        {row?.count != null ? ` · ${row.count} project${row.count === 1 ? '' : 's'}` : ''}
      </div>
      <div style={{ color: 'var(--accent-gold)', fontSize: 11, marginTop: 4 }}>Click to view projects →</div>
    </div>
  )
}

function InsightBarChart({
  data,
  height,
  chartGroup,
  valueMode,
  barColor,
  chartColors,
  onBarClick,
}: {
  data: ZenithInsightBarRow[]
  height: number
  chartGroup: ZenithChartGroup
  valueMode: 'count' | 'inr'
  barColor: string
  chartColors: ReturnType<typeof useChartColors>
  onBarClick: (row: ZenithInsightBarRow) => void
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-[color:var(--text-muted)] flex items-center justify-center h-full min-h-[180px] px-2 text-center">
        No data in the current explorer slice.
      </p>
    )
  }

  const yWidth = valueMode === 'inr' ? 96 : 108

  return (
    <ZenithChartTouchReset chartGroup={chartGroup}>
      {(rk) => (
        <ResponsiveContainer key={rk} width="100%" height={height} minWidth={0}>
          <BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis
              type="number"
              tick={{ fill: chartColors.axisText, fontSize: 10 }}
              tickFormatter={
                valueMode === 'inr'
                  ? (v) => (v >= 100_000 ? `₹${Math.round(v / 100_000)}L` : `₹${Math.round(v / 1000)}k`)
                  : undefined
              }
            />
            <YAxis
              type="category"
              dataKey="label"
              width={yWidth}
              tick={{ fill: chartColors.axisText, fontSize: 10 }}
            />
            <Tooltip
              content={valueMode === 'inr' ? InrTooltip : CountTooltip}
              cursor={{ fill: chartColors.cursorBand }}
            />
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              animationDuration={900}
              cursor="pointer"
              onClick={(_row: unknown, index: number) => {
                const row = data[index]
                if (row) onBarClick(row)
              }}
            >
              {data.map((row, i) => (
                <Cell
                  key={i}
                  fill={row.fill ?? barColor}
                  style={{ transition: 'filter 0.15s' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(1.2)'
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
  )
}

export default function ZenithInsightChartsRow({
  explorerProjects,
  chartHeight,
  chartGroup,
  onDrill,
}: {
  explorerProjects: ZenithExplorerProject[]
  chartHeight: number
  chartGroup: ZenithChartGroup
  onDrill: (dimension: ZenithChartDrilldownDimension, value: string) => void
}) {
  const chartColors = useChartColors()

  const pipelineRows = useMemo(() => buildPipelineAgeChartRows(explorerProjects), [explorerProjects])
  const commissioningRows = useMemo(
    () => buildCommissioningTimelineRows(explorerProjects),
    [explorerProjects],
  )
  const outstandingRows = useMemo(
    () => buildOutstandingBySalespersonRows(explorerProjects),
    [explorerProjects],
  )

  const showCohortNote = explorerProjects.length >= ZENITH_EXPLORER_PROJECT_CAP
  const cohortNote = showCohortNote ? (
    <p
      className="text-[10px] text-[color:var(--text-muted)] mt-2 leading-snug"
      title={`Zenith explorer loads at most ${ZENITH_EXPLORER_PROJECT_CAP} projects (newest updates first).`}
    >
      Based on explorer cohort (max {ZENITH_EXPLORER_PROJECT_CAP.toLocaleString('en-IN')} recently updated
      projects).
    </p>
  ) : null

  return (
    <div className="space-y-3">
      <header className="px-0.5">
        <h2
          className="zenith-display text-base sm:text-lg font-bold text-[color:var(--text-primary)] tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Pipeline signals
        </h2>
        <p
          className="mt-1 text-[11px] sm:text-xs text-[color:var(--text-muted)] italic leading-snug max-w-2xl"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          Open deals by time in stage, expected commissioning window, and outstanding balance by salesperson.
        </p>
      </header>
      <div
        id="zenith-charts-row-insights"
        className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 scroll-mt-24 [&>*]:min-w-0"
      >
        <ChartPanel
          title="Pipeline ageing"
          subtitle="Days in current stage — open deals"
          showExploreHint
        >
          <InsightBarChart
            data={pipelineRows}
            height={chartHeight}
            chartGroup={chartGroup}
            valueMode="count"
            barColor={chartColors.teal}
            chartColors={chartColors}
            onBarClick={(row) => onDrill('pipeline_age', row.key)}
          />
        </ChartPanel>
        <ChartPanel
          title="Commissioning timeline"
          subtitle="Expected commissioning — open deals"
          showExploreHint
        >
          <InsightBarChart
            data={commissioningRows}
            height={chartHeight}
            chartGroup={chartGroup}
            valueMode="count"
            barColor={chartColors.gold}
            chartColors={chartColors}
            onBarClick={(row) => onDrill('commissioning_timeline', row.key)}
          />
        </ChartPanel>
        <ChartPanel
          title="Outstanding by salesperson"
          subtitle="Top balances — pending & partial"
          showExploreHint
        >
          <InsightBarChart
            data={outstandingRows}
            height={chartHeight}
            chartGroup={chartGroup}
            valueMode="inr"
            barColor={chartColors.gold}
            chartColors={chartColors}
            onBarClick={(row) => onDrill('outstanding_sales', row.key)}
          />
        </ChartPanel>
      </div>
      {cohortNote}
    </div>
  )
}
