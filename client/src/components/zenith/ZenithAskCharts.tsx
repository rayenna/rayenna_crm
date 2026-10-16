import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ZENITH_CHART_CUSTOM_TOOLTIP_SHELL,
  ZENITH_RECHARTS_TOOLTIP_CURSOR,
  ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE,
} from '../dashboard/zenithRechartsTooltipStyles'

/** Zenith-native palette — gold / teal / blue / rose, then supporting accents. */
export const ASK_CHART_COLORS = [
  'var(--accent-gold)',
  'var(--accent-teal)',
  'var(--accent-blue, #5b9fd4)',
  'var(--accent-red)',
  '#c4a574',
  '#3d9b8f',
  '#7c8db5',
  '#d4a017',
] as const

export type AskChartDatum = {
  name: string
  value: number
  count?: number
  href?: string
  pct: number
  fill: string
}

function formatAskValue(value: number, valueLabel?: string): string {
  if (!Number.isFinite(value)) return '—'
  const label = (valueLabel || '').toLowerCase()
  const asMoney =
    label.includes('₹') ||
    label.includes('revenue') ||
    label.includes('profit') ||
    label.includes('value') ||
    label.includes('amount') ||
    label.includes('outstanding') ||
    (value >= 1000 && !label.includes('ticket') && !label.includes('project') && !label.includes('count'))
  if (asMoney) {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `₹${Math.round(value).toLocaleString('en-IN')}`
    }
  }
  if (value >= 1000) return value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  if (Number.isInteger(value)) return value.toLocaleString('en-IN')
  return value.toLocaleString('en-IN', { maximumFractionDigits: 1 })
}

function formatAxisTick(v: number): string {
  if (!Number.isFinite(v)) return ''
  const abs = Math.abs(v)
  if (abs >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}Cr`
  if (abs >= 100_000) return `${(v / 100_000).toFixed(1)}L`
  if (abs >= 1000) return `${Math.round(v / 1000)}k`
  return String(Math.round(v))
}

export function buildAskChartData(
  series: { label: string; value: number; count?: number; href?: string }[],
): AskChartDatum[] {
  const total = series.reduce((s, d) => s + (Number(d.value) || 0), 0)
  return series.map((s, i) => {
    const value = Number(s.value) || 0
    return {
      name: s.label,
      value,
      count: s.count,
      href: s.href,
      pct: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
      fill: ASK_CHART_COLORS[i % ASK_CHART_COLORS.length],
    }
  })
}

function AskTooltip({
  active,
  payload,
  valueLabel,
  clickable,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; payload?: AskChartDatum }>
  valueLabel?: string
  clickable?: boolean
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]
  const d = row.payload
  const name = d?.name ?? row.name ?? ''
  const value = Number(d?.value ?? row.value) || 0
  const pct = d?.pct
  return (
    <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
      <div
        style={{
          color: 'var(--chart-tooltip-fg)',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {name}
      </div>
      <div style={{ color: 'var(--chart-tooltip-fg-muted)', fontSize: 12 }}>
        {formatAskValue(value, valueLabel)}
        {pct != null ? (
          <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}> · {pct}%</span>
        ) : null}
        {d?.count != null && d.count !== value ? (
          <span style={{ display: 'block', marginTop: 2, fontSize: 11 }}>
            {d.count.toLocaleString('en-IN')} projects
          </span>
        ) : null}
      </div>
      {clickable && d?.href ? (
        <div style={{ color: 'var(--accent-gold)', fontSize: 11, marginTop: 6, fontWeight: 600 }}>
          Click to open projects →
        </div>
      ) : null}
    </div>
  )
}

export function AskPieChart({
  data,
  valueLabel,
  clickable,
  onDrill,
}: {
  data: AskChartDatum[]
  valueLabel?: string
  clickable?: boolean
  onDrill?: (href: string) => void
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const sliceCount = data.length

  return (
    <div className="zenith-ask-chart">
      <div className="zenith-ask-chart__pie-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={sliceCount <= 2 ? '52%' : '48%'}
              outerRadius={sliceCount <= 2 ? '78%' : '74%'}
              paddingAngle={sliceCount > 1 ? 2.5 : 0}
              stroke="var(--bg-card)"
              strokeWidth={2}
              animationBegin={0}
              animationDuration={700}
              cursor={clickable ? 'pointer' : 'default'}
              onClick={(_, index) => {
                const href = data[index]?.href
                if (href) onDrill?.(href)
              }}
            >
              {data.map((d, i) => (
                <Cell
                  key={`ask-pie-${i}`}
                  fill={d.fill}
                  style={{
                    cursor: d.href ? 'pointer' : 'default',
                    filter: 'brightness(1)',
                    transition: 'filter 0.15s ease, opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as SVGElement
                    el.style.filter = 'brightness(1.18)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as SVGElement
                    el.style.filter = 'brightness(1)'
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE}
              content={({ active, payload }) => (
                <AskTooltip
                  active={active}
                  payload={
                    payload as
                      | Array<{ name?: string; value?: number; payload?: AskChartDatum }>
                      | undefined
                  }
                  valueLabel={valueLabel}
                  clickable={clickable}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="zenith-ask-chart__pie-center" aria-hidden>
          <span className="zenith-ask-chart__pie-center-label">Total</span>
          <span className="zenith-ask-chart__pie-center-value">
            {formatAskValue(total, valueLabel)}
          </span>
        </div>
      </div>
      <ul className="zenith-ask-chart__legend" aria-label="Chart breakdown">
        {data.map((d) => (
          <li key={d.name}>
            <button
              type="button"
              className={`zenith-ask-chart__legend-item${d.href ? ' is-clickable' : ''}`}
              disabled={!d.href}
              onClick={() => {
                if (d.href) onDrill?.(d.href)
              }}
            >
              <span className="zenith-ask-chart__swatch" style={{ background: d.fill }} aria-hidden />
              <span className="zenith-ask-chart__legend-label">{d.name}</span>
              <span className="zenith-ask-chart__legend-meta">
                <span className="zenith-ask-chart__legend-value">
                  {formatAskValue(d.value, valueLabel)}
                </span>
                <span className="zenith-ask-chart__legend-pct">{d.pct}%</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AskBarChart({
  data,
  valueLabel,
  clickable,
  onDrill,
}: {
  data: AskChartDatum[]
  valueLabel?: string
  clickable?: boolean
  onDrill?: (href: string) => void
}) {
  const many = data.length > 6
  const bottom = many ? 64 : 52

  return (
    <div className="zenith-ask-chart">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 12, right: 10, left: 0, bottom }}
          barCategoryGap={many ? '18%' : '28%'}
        >
          <CartesianGrid
            stroke="var(--border-default)"
            strokeDasharray="3 6"
            vertical={false}
            opacity={0.55}
          />
          <XAxis
            dataKey="name"
            tick={{
              fontSize: many ? 9 : 11,
              fill: 'var(--text-muted)',
              fontFamily: 'DM Sans, sans-serif',
            }}
            interval={0}
            angle={many ? -32 : data.length > 3 ? -22 : 0}
            textAnchor={many || data.length > 3 ? 'end' : 'middle'}
            height={bottom}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
          />
          <YAxis
            tick={{
              fontSize: 10,
              fill: 'var(--text-muted)',
              fontFamily: 'DM Sans, sans-serif',
            }}
            tickFormatter={formatAxisTick}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={ZENITH_RECHARTS_TOOLTIP_CURSOR}
            wrapperStyle={ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE}
            content={({ active, payload }) => (
              <AskTooltip
                active={active}
                payload={
                  payload as
                    | Array<{ name?: string; value?: number; payload?: AskChartDatum }>
                    | undefined
                }
                valueLabel={valueLabel}
                clickable={clickable}
              />
            )}
          />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            maxBarSize={many ? 36 : 52}
            cursor={clickable ? 'pointer' : 'default'}
            animationDuration={650}
            onClick={(_entry, index) => {
              const href = data[typeof index === 'number' ? index : -1]?.href
              if (href) onDrill?.(href)
            }}
          >
            {data.map((d, i) => (
              <Cell
                key={`ask-bar-${i}`}
                fill={d.fill}
                cursor={d.href ? 'pointer' : 'default'}
                onClick={() => {
                  if (d.href) onDrill?.(d.href)
                }}
                style={{
                  filter: 'brightness(1)',
                  transition: 'filter 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as SVGElement).style.filter = 'brightness(1.15)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as SVGElement).style.filter = 'brightness(1)'
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
