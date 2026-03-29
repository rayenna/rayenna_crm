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
} from 'recharts'

const tooltipProps = {
  wrapperStyle: { outline: 'none' as const, zIndex: 100 },
  contentStyle: {
    background: 'rgba(10,10,15,0.96)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 10,
    color: '#f8fafc',
  },
  labelStyle: { color: '#ffffff', fontWeight: 600 },
  itemStyle: { color: '#f1f5f9' },
}

export type ZenithFyRevenueProfitPoint = { fy: string; revenue: number; profit: number }

/**
 * Same visual for Admin, Management, Sales, Operations, and Finance on Zenith.
 * Data scope comes from each role’s dashboard API (Sales = their projects only).
 */
export default function ZenithRevenueProfitFyChart({ data }: { data: ZenithFyRevenueProfitPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280} minWidth={0}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="fy" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} />
        <Tooltip
          formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`}
          {...tooltipProps}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Total Revenue"
          fill="rgba(245,166,35,0.15)"
          stroke="#f5a623"
          strokeWidth={2}
        />
        <Bar dataKey="profit" name="Total Profit" fill="#00d4b4" radius={[4, 4, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
