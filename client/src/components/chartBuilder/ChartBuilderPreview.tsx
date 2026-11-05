import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useChartColors } from '../../hooks/useChartColors'
import { getLoanBankBarColor } from '../dashboard/loanBankChartColors'
import { getLeadSourceColor } from '../dashboard/leadSourceColors'
import { ZENITH_CHART_CUSTOM_TOOLTIP_SHELL } from '../dashboard/zenithRechartsTooltipStyles'
import type { ChartBuilderChartType, ChartBuilderSeriesPoint } from '../../types/chartBuilder'

function formatValue(n: number, valueLabel: string): string {
  if (!Number.isFinite(n)) return '—'
  if (valueLabel.includes('₹')) {
    return `₹${Math.round(n).toLocaleString('en-IN')}`
  }
  if (valueLabel.includes('kW')) {
    return `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kW`
  }
  return Math.round(n).toLocaleString('en-IN')
}

function sliceColor(label: string, index: number, preferLeadSource: boolean): string {
  if (preferLeadSource) {
    const c = getLeadSourceColor(label, index)
    if (c) return c
  }
  return getLoanBankBarColor(label, index)
}

function PreviewTooltip({
  active,
  payload,
  valueLabel,
}: {
  active?: boolean
  // Recharts tooltip payload shape varies by chart; keep loose.
  payload?: ReadonlyArray<{ payload?: ChartBuilderSeriesPoint }>
  valueLabel: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 13, fontWeight: 600 }}>{row.label}</div>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 12, marginTop: 6 }}>
        {valueLabel}: {formatValue(row.value, valueLabel)}
      </div>
      <div style={{ color: 'var(--chart-tooltip-fg-muted)', fontSize: 11, marginTop: 4 }}>
        {row.count} {row.count === 1 ? 'project' : 'projects'}
      </div>
    </div>
  )
}

export default function ChartBuilderPreview({
  chartType,
  series,
  valueLabel,
  height = 360,
  preferLeadSourceColors = false,
}: {
  chartType: ChartBuilderChartType
  series: ChartBuilderSeriesPoint[]
  valueLabel: string
  height?: number
  preferLeadSourceColors?: boolean
}) {
  const chartColors = useChartColors()
  const data = useMemo(() => series.map((s) => ({ ...s })), [series])

  if (data.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 text-center"
        style={{ minHeight: height }}
      >
        <p className="max-w-sm text-sm text-[color:var(--text-muted)]">
          No projects match this chart for the selected cohort and filters.
        </p>
      </div>
    )
  }

  if (chartType === 'donut') {
    return (
      <div className="w-full min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="48%"
              outerRadius="72%"
              paddingAngle={1}
            >
              {data.map((row, i) => (
                <Cell key={row.label} fill={sliceColor(row.label, i, preferLeadSourceColors)} />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <PreviewTooltip
                  active={props.active}
                  payload={props.payload as ReadonlyArray<{ payload?: ChartBuilderSeriesPoint }> | undefined}
                  valueLabel={valueLabel}
                />
              )}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const vertical = chartType === 'bar_vertical'
  const yWidth = Math.min(
    180,
    Math.max(88, Math.ceil(data.reduce((m, r) => Math.max(m, r.label.length), 0) * 6.2) + 16),
  )

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          layout={vertical ? 'horizontal' : 'vertical'}
          data={data}
          margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
          barCategoryGap="18%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          {vertical ? (
            <>
              <XAxis
                type="category"
                dataKey="label"
                tick={{ fill: chartColors.axisText, fontSize: 10 }}
                interval={0}
                angle={data.length > 6 ? -28 : 0}
                textAnchor={data.length > 6 ? 'end' : 'middle'}
                height={data.length > 6 ? 64 : 28}
              />
              <YAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 10 }} />
            </>
          ) : (
            <>
              <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={yWidth}
                tick={{ fill: chartColors.axisText, fontSize: 10 }}
                interval={0}
              />
            </>
          )}
          <Tooltip
            content={(props) => (
              <PreviewTooltip
                active={props.active}
                payload={props.payload as ReadonlyArray<{ payload?: ChartBuilderSeriesPoint }> | undefined}
                valueLabel={valueLabel}
              />
            )}
            cursor={{ fill: chartColors.cursorBand }}
          />
          <Bar dataKey="value" radius={vertical ? [4, 4, 0, 0] : [0, 4, 4, 0]}>
            {data.map((row, i) => (
              <Cell key={row.label} fill={sliceColor(row.label, i, preferLeadSourceColors)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
