import { useMemo, useRef, type MouseEvent, type MutableRefObject } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
  Bar,
  Scatter,
} from 'recharts'

export type ZenithFyRevenueProfitPoint = { fy: string; revenue: number; profit: number }

/** Min bar hit height in px — zero-profit years still open the profit drill-down */
const PROFIT_HIT_MIN_PX = 18
/** Invisible halo around revenue point so clicks are reliable (area fill is non-interactive). */
const REVENUE_HIT_RADIUS_PX = 22

type TooltipPayloadItem = {
  name?: string
  value?: number
  color?: string
  dataKey?: string | number
}

/** Area + Scatter both use `dataKey="revenue"` — one row; prefer Area/Bar display names. */
function dedupeRevenueProfitTooltipPayload(payload: TooltipPayloadItem[]): TooltipPayloadItem[] {
  let revenue: TooltipPayloadItem | undefined
  let profit: TooltipPayloadItem | undefined
  const pick = (a: TooltipPayloadItem, b: TooltipPayloadItem, kind: 'revenue' | 'profit') => {
    const re = kind === 'revenue' ? /total revenue/i : /total profit/i
    if (re.test(String(a.name ?? ''))) return a
    if (re.test(String(b.name ?? ''))) return b
    return a
  }
  for (const p of payload) {
    const dk = p.dataKey != null ? String(p.dataKey) : ''
    if (dk === 'revenue') revenue = revenue ? pick(revenue, p, 'revenue') : p
    else if (dk === 'profit') profit = profit ? pick(profit, p, 'profit') : p
  }
  return [revenue, profit].filter(Boolean) as TooltipPayloadItem[]
}

function ExploreFyTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload?.length) return null
  const rows = dedupeRevenueProfitTooltipPayload(payload)
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
      {rows.map((p) => (
        <div key={String(p.name)} style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
          {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
        </div>
      ))}
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 6, lineHeight: 1.35 }}>
        Tap the <span style={{ color: '#f5a623' }}>orange point</span> for revenue, or the{' '}
        <span style={{ color: '#00d4b4' }}>teal bar</span> for profit (including small or zero bars).
      </div>
    </div>
  )
}

type BarShapeProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  payload?: ZenithFyRevenueProfitPoint
}

function createProfitBarShape(
  onFyClickRef: MutableRefObject<
    ((args: { fy: string; metric: 'revenue' | 'profit' }) => void) | undefined
  >,
) {
  return function ProfitBarShape(props: BarShapeProps) {
    const x = Number(props.x ?? 0)
    const y = Number(props.y ?? 0)
    const w = Number(props.width ?? 0)
    const h = Number(props.height ?? 0)
    const fy = props.payload?.fy
    const fill = props.fill ?? '#00d4b4'
    const bottom = y + h
    const hitH = Math.max(h, PROFIT_HIT_MIN_PX)
    const hitY = bottom - hitH
    const interactive = typeof onFyClickRef.current === 'function'

    const handleClick = (e: MouseEvent<SVGGElement>) => {
      e.stopPropagation()
      if (fy) onFyClickRef.current?.({ fy, metric: 'profit' })
    }

    const r = 4
    return (
      <g
        style={{ cursor: interactive ? 'pointer' : 'default' }}
        onClick={interactive ? handleClick : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (fy) onFyClickRef.current?.({ fy, metric: 'profit' })
                }
              }
            : undefined
        }
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive && fy ? `Profit drill-down for ${fy}` : undefined}
      >
        <rect x={x} y={hitY} width={w} height={hitH} fill="transparent" />
        {h > 0 ? (
          <path
            fill={fill}
            d={`M ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${bottom} L ${x},${bottom} Z`}
          />
        ) : null}
      </g>
    )
  }
}

/**
 * Same visual for Admin, Management, Sales, Operations, and Finance on Zenith.
 * Data scope comes from each role’s dashboard API (Sales = their projects only).
 *
 * Interaction: area fill does not use pointer-events (see zenith.css) so profit bars receive clicks.
 * Revenue uses a Scatter layer on top with a large transparent hit halo. Zero-profit FYs still get a
 * minimum-height invisible hit strip aligned to the bar band.
 */
export default function ZenithRevenueProfitFyChart({
  data,
  onFyClick,
}: {
  data: ZenithFyRevenueProfitPoint[]
  onFyClick?: (args: { fy: string; metric: 'revenue' | 'profit' }) => void
}) {
  const onFyClickRef = useRef(onFyClick)
  onFyClickRef.current = onFyClick

  const ProfitShape = useMemo(() => createProfitBarShape(onFyClickRef), [])

  const revenueScatterShape = useMemo(
    () => (raw: unknown) => {
      const p = raw as { cx?: number; cy?: number; payload?: ZenithFyRevenueProfitPoint }
      const { cx, cy, payload } = p
      if (cx == null || cy == null || !payload?.fy) return <g />
      const interactive = typeof onFyClickRef.current === 'function'
      const handleClick = (e: MouseEvent<SVGGElement>) => {
        e.stopPropagation()
        onFyClickRef.current?.({ fy: payload.fy, metric: 'revenue' })
      }
      return (
        <g
          style={{ cursor: interactive ? 'pointer' : 'default' }}
          onClick={interactive ? handleClick : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onFyClickRef.current?.({ fy: payload.fy, metric: 'revenue' })
                  }
                }
              : undefined
          }
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={interactive ? `Revenue drill-down for ${payload.fy}` : undefined}
        >
          <circle cx={cx} cy={cy} r={REVENUE_HIT_RADIUS_PX} fill="transparent" />
          <circle
            cx={cx}
            cy={cy}
            r={5}
            fill="#f5a623"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={1}
            pointerEvents="none"
          />
        </g>
      )
    },
    [],
  )

  return (
    <div className="zenith-fy-revenue-profit-chart w-full h-full min-h-0 min-w-0">
      <ResponsiveContainer width="100%" height={240} minWidth={0}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="fy" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
          <Tooltip content={<ExploreFyTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}
            payload={[
              { value: 'Total Revenue', type: 'line', id: 'revenue', color: '#f5a623' },
              { value: 'Total Profit', type: 'rect', id: 'profit', color: '#00d4b4' },
            ]}
          />
          {/* 1) Area under bars — fill/curve ignore pointer-events in CSS */}
          <Area
            type="monotone"
            dataKey="revenue"
            name="Total Revenue"
            fill="rgba(245,166,35,0.15)"
            stroke="#f5a623"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          {/* 2) Profit bars + minimum hit strip (above area in paint order) */}
          <Bar
            dataKey="profit"
            name="Total Profit"
            fill="#00d4b4"
            shape={ProfitShape}
            isAnimationActive={false}
          />
          {/* 3) Revenue hit targets on top — not in legend/tooltip duplicates */}
          <Scatter
            dataKey="revenue"
            name=""
            fill="#f5a623"
            isAnimationActive={false}
            legendType="none"
            tooltipType="none"
            shape={revenueScatterShape}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
