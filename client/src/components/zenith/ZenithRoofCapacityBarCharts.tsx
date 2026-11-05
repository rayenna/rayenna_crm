import { useMemo } from 'react'
import { useChartColors } from '../../hooks/useChartColors'
import { ZENITH_CHART_CUSTOM_TOOLTIP_SHELL } from '../dashboard/zenithRechartsTooltipStyles'
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
import type { YAxisProps } from 'recharts'
import ChartPanel from './ChartPanel'
import ZenithChartTouchReset from './ZenithChartTouchReset'
import type { ZenithChartGroup } from '../../constants/zenithChartGroups'
import { getLoanBankBarColor } from '../dashboard/loanBankChartColors'
import {
  lifecycleBrandPairedYAxisWidth,
} from '../../utils/zenithPanelInverterBrandChartData'
import type { ZenithCountBarRow } from '../../utils/zenithRoofCapacityChartData'
import { zenithLifecycleBrandPairChartHeight } from './zenithChartHeight'
import { formatZenithSystemCapacityKw } from '../../utils/zenithSystemCapacityFormat'

/** Matches lifecycle brand row min height (mobile-first full-width cards). */
const PAIR_CARD_MIN_PX = 360

function formatInr(n: number): string {
  return Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—'
}

function CountBarTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: ZenithCountBarRow }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 13, fontWeight: 600 }}>{row.label}</div>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 12, marginTop: 6 }}>
        {row.count} {row.count === 1 ? 'project' : 'projects'}
      </div>
      <div style={{ color: 'var(--chart-tooltip-fg-muted)', fontSize: 11, marginTop: 4 }}>
        Order value (sum): {formatInr(row.orderValueSum)}
      </div>
      <div style={{ color: 'var(--chart-tooltip-fg-muted)', fontSize: 11, marginTop: 4 }}>
        System capacity (sum):{' '}
        {formatZenithSystemCapacityKw(
          row.systemCapacitySumKw > 0 ? row.systemCapacitySumKw : null,
          'emDash',
        )}
      </div>
      <div style={{ color: 'var(--accent-gold)', fontSize: 11, marginTop: 6 }}>Click to view projects →</div>
    </div>
  )
}

function CategoryYAxisTick({
  x = 0,
  y = 0,
  payload,
  fill,
}: {
  x?: number
  y?: number
  payload?: { value?: string }
  fill: string
}) {
  const label = payload?.value != null ? String(payload.value) : ''
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill={fill}
      fontSize={10}
      className="recharts-text"
    >
      {label}
    </text>
  )
}

function HorizontalCountBarChart({
  data,
  plotHeight,
  yAxisWidth,
  emptyMessage,
  onBarClick,
}: {
  data: ZenithCountBarRow[]
  plotHeight: number
  yAxisWidth: number
  emptyMessage: string
  onBarClick: (label: string) => void
}) {
  const chartColors = useChartColors()
  const yTick = useMemo<YAxisProps['tick']>(
    () => (props: Parameters<typeof CategoryYAxisTick>[0]) => (
      <CategoryYAxisTick {...props} fill={chartColors.axisText} />
    ),
    [chartColors.axisText],
  )

  if (data.length === 0) {
    return (
      <div
        className="flex h-full w-full min-w-0 items-center justify-center rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 text-center"
        style={{ minHeight: plotHeight, fontFamily: 'DM Sans, sans-serif' }}
      >
        <p className="max-w-sm text-xs text-[color:var(--text-muted)] sm:text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full min-w-0" style={{ height: plotHeight }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
          barCategoryGap="18%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 10 }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={yAxisWidth}
            interval={0}
            tick={yTick}
          />
          <Tooltip
            content={(props) => <CountBarTooltip {...props} />}
            cursor={{ fill: chartColors.cursorBand }}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            animationDuration={800}
            cursor="pointer"
            onClick={(_row: unknown, index: number) => {
              const row = data[index]
              if (row?.label) onBarClick(row.label)
            }}
          >
            {data.map((row, i) => (
              <Cell
                key={row.label}
                fill={getLoanBankBarColor(row.label, i)}
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
  )
}

function CountChartCard({
  id,
  title,
  rows,
  plotHeight,
  yAxisWidth,
  emptyMessage,
  onBarClick,
  chartGroup,
}: {
  id: string
  title: string
  rows: ZenithCountBarRow[]
  plotHeight: number
  yAxisWidth: number
  emptyMessage: string
  onBarClick: (label: string) => void
  chartGroup: ZenithChartGroup
}) {
  return (
    <div
      id={id}
      className="flex w-full min-w-0 flex-col scroll-mt-24 lg:min-h-[360px] lg:scroll-mt-0"
      style={{ minHeight: PAIR_CARD_MIN_PX }}
    >
      <ChartPanel title={title} showExploreHint className="flex h-full w-full min-w-0 flex-1 flex-col">
        <div className="w-full min-w-0 flex-1" style={{ minHeight: plotHeight }}>
          <ZenithChartTouchReset chartGroup={chartGroup} className="h-full w-full min-w-0">
            {(rk) => (
              <HorizontalCountBarChart
                key={rk}
                data={rows}
                plotHeight={plotHeight}
                yAxisWidth={yAxisWidth}
                emptyMessage={emptyMessage}
                onBarClick={onBarClick}
              />
            )}
          </ZenithChartTouchReset>
        </div>
      </ChartPanel>
    </div>
  )
}

/**
 * Paired horizontal bar charts under panel/inverter brands: roof type + system capacity bands.
 * Data is already scoped by Zenith FY / quarter / month via `explorerProjects`.
 */
export default function ZenithRoofCapacityBarCharts({
  roofRows,
  capacityRows,
  chartHeight,
  onRoofTypeClick,
  onCapacityBandClick,
  chartGroup,
}: {
  roofRows: ZenithCountBarRow[]
  capacityRows: ZenithCountBarRow[]
  chartHeight: number
  onRoofTypeClick: (label: string) => void
  onCapacityBandClick: (label: string) => void
  chartGroup: ZenithChartGroup
}) {
  const plotHeight = useMemo(
    () => zenithLifecycleBrandPairChartHeight(roofRows.length, capacityRows.length, chartHeight),
    [roofRows.length, capacityRows.length, chartHeight],
  )
  const yAxisWidth = useMemo(
    () =>
      lifecycleBrandPairedYAxisWidth([
        roofRows.map((row) => row.label),
        capacityRows.map((row) => row.label),
      ]),
    [roofRows, capacityRows],
  )

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:items-stretch [&>*]:min-w-0">
      <CountChartCard
        id="zenith-roof-types"
        title="Projects by roof type"
        rows={roofRows}
        plotHeight={plotHeight}
        yAxisWidth={yAxisWidth}
        emptyMessage="No projects in this period have a roof type set in Sales & Commercial."
        onBarClick={onRoofTypeClick}
        chartGroup={chartGroup}
      />
      <CountChartCard
        id="zenith-capacity-bands"
        title="Projects by system capacity"
        rows={capacityRows}
        plotHeight={plotHeight}
        yAxisWidth={yAxisWidth}
        emptyMessage="No projects in this period have system capacity set."
        onBarClick={onCapacityBandClick}
        chartGroup={chartGroup}
      />
    </div>
  )
}
