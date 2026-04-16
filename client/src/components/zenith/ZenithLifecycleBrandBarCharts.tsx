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
import ChartPanel from './ChartPanel'
import ZenithChartTouchReset from './ZenithChartTouchReset'
import { getLoanBankBarColor } from '../dashboard/loanBankChartColors'
import type { ZenithLifecycleBrandBarRow } from '../../utils/zenithPanelInverterBrandChartData'
import { formatZenithSystemCapacityKw } from '../../utils/zenithSystemCapacityFormat'

function formatInr(n: number): string {
  return Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—'
}

function LifecycleBrandBarTooltip({
  active,
  payload,
  costTitle,
}: {
  active?: boolean
  payload?: Array<{ payload?: ZenithLifecycleBrandBarRow }>
  costTitle: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 13, fontWeight: 600 }}>{row.brandLabel}</div>
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
      <div style={{ color: 'var(--accent-teal)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
        {costTitle}: {formatInr(row.estimatedComponentCost)}
      </div>
      <div style={{ color: 'var(--accent-gold)', fontSize: 11, marginTop: 6 }}>Click to view projects →</div>
    </div>
  )
}

function HorizontalBrandBarChart({
  data,
  chartHeight,
  costTitle,
  onBarClick,
}: {
  data: ZenithLifecycleBrandBarRow[]
  chartHeight: number
  costTitle: string
  onBarClick: (brandLabel: string) => void
}) {
  const chartColors = useChartColors()
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-center px-3"
        style={{ minHeight: chartHeight, fontFamily: 'DM Sans, sans-serif' }}
      >
        <p className="max-w-sm text-xs text-[color:var(--text-muted)]">
          No projects in this period have both panel and inverter brands set in Project Lifecycle.
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight} minWidth={0}>
      <BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
        <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 10 }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="brandLabel"
          width={118}
          tick={{ fill: chartColors.axisText, fontSize: 9 }}
        />
        <Tooltip
          content={(props) => <LifecycleBrandBarTooltip {...props} costTitle={costTitle} />}
          cursor={{ fill: chartColors.cursorBand }}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          animationDuration={800}
          cursor="pointer"
          onClick={(_row: unknown, index: number) => {
            const row = data[index]
            if (row?.brandLabel) onBarClick(row.brandLabel)
          }}
        >
          {data.map((row, i) => (
            <Cell
              key={row.brandLabel}
              fill={getLoanBankBarColor(row.brandLabel, i)}
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
  )
}

/**
 * Two horizontal bar charts (Loans-by-bank style): panel brands and inverter brands by project count.
 * Data is already scoped by Zenith FY / quarter / month via `explorerProjects`.
 */
export default function ZenithLifecycleBrandBarCharts({
  panelRows,
  inverterRows,
  chartHeight,
  onPanelBrandClick,
  onInverterBrandClick,
}: {
  panelRows: ZenithLifecycleBrandBarRow[]
  inverterRows: ZenithLifecycleBrandBarRow[]
  chartHeight: number
  onPanelBrandClick: (brandLabel: string) => void
  onInverterBrandClick: (brandLabel: string) => void
}) {
  return (
    <div className="contents">
      <div id="zenith-panel-brands" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
        <ChartPanel title="Projects by panel brand" showExploreHint>
          <ZenithChartTouchReset>
            {(rk) => (
              <HorizontalBrandBarChart
                key={rk}
                data={panelRows}
                chartHeight={chartHeight}
                costTitle="Panel cost (est.)"
                onBarClick={onPanelBrandClick}
              />
            )}
          </ZenithChartTouchReset>
        </ChartPanel>
      </div>
      <div id="zenith-inverter-brands" className="min-w-0 scroll-mt-24 lg:scroll-mt-0">
        <ChartPanel title="Projects by inverter brand" showExploreHint>
          <ZenithChartTouchReset>
            {(rk) => (
              <HorizontalBrandBarChart
                key={rk}
                data={inverterRows}
                chartHeight={chartHeight}
                costTitle="Inverter cost (est.)"
                onBarClick={onInverterBrandClick}
              />
            )}
          </ZenithChartTouchReset>
        </ChartPanel>
      </div>
    </div>
  )
}
