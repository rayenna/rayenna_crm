import { useMemo } from 'react'
import { useChartColors } from '../../hooks/useChartColors'
import { useNavigate } from 'react-router-dom'
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
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import { getLoanBankBarColor } from './loanBankChartColors'
import {
  buildZenithLifecycleBrandBarRows,
  type ZenithLifecycleBrandBarRow,
} from '../../utils/zenithPanelInverterBrandChartData'
import { formatZenithSystemCapacityKw } from '../../utils/zenithSystemCapacityFormat'
import {
  ZENITH_RECHARTS_TOOLTIP_CURSOR,
  ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE,
  ZENITH_CHART_TOOLTIP_INSIGHT,
  ZENITH_CHART_TOOLTIP_LINE,
  ZENITH_CHART_TOOLTIP_PANEL,
  ZENITH_CHART_TOOLTIP_TITLE,
  ZENITH_DASHBOARD_ANALYTICS_CARD,
} from './zenithRechartsTooltipStyles'

type TileParams = { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }

function formatInr(n: number): string {
  return Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—'
}

function DashboardBrandTooltip({
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
    <div className={`${ZENITH_CHART_TOOLTIP_PANEL} max-w-xs`}>
      <p className={ZENITH_CHART_TOOLTIP_TITLE}>{row.brandLabel}</p>
      <p className={`${ZENITH_CHART_TOOLTIP_LINE} mb-1`}>
        {row.count} {row.count === 1 ? 'project' : 'projects'}
      </p>
      <p className={`${ZENITH_CHART_TOOLTIP_LINE} mb-1 text-xs`}>Order value (sum): {formatInr(row.orderValueSum)}</p>
      <p className={`${ZENITH_CHART_TOOLTIP_LINE} mb-1 text-xs`}>
        System capacity (sum):{' '}
        {formatZenithSystemCapacityKw(
          row.systemCapacitySumKw > 0 ? row.systemCapacitySumKw : null,
          'emDash',
        )}
      </p>
      <p className="mb-1 text-sm font-extrabold text-[color:var(--accent-gold)]">
        {costTitle}:{' '}
        <span className="text-[color:var(--chart-tooltip-fg)]">{formatInr(row.estimatedComponentCost)}</span>
      </p>
      <p className={ZENITH_CHART_TOOLTIP_INSIGHT}>Click bar to open Projects →</p>
    </div>
  )
}

function LifecycleBrandBarCard({
  title,
  rows,
  chartHeight,
  costTitle,
  kind,
  onBrandNavigate,
}: {
  title: string
  rows: ZenithLifecycleBrandBarRow[]
  chartHeight: number
  costTitle: string
  kind: 'panel' | 'inverter'
  onBrandNavigate: (brandLabel: string, kind: 'panel' | 'inverter') => void
}) {
  const chartColors = useChartColors()
  return (
    <div className={`${ZENITH_DASHBOARD_ANALYTICS_CARD} h-full min-w-0`}>
      <div className="mb-3 flex flex-shrink-0 flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-lg bg-[color:var(--accent-gold)] p-2 text-[color:var(--text-inverse)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold leading-tight text-[color:var(--text-primary)] sm:text-lg">{title}</h2>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col min-w-0 overflow-hidden flex-1" style={{ height: chartHeight }}>
        {rows.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3">
            <p className="max-w-sm text-center text-sm text-[color:var(--text-muted)]">
              No projects in this period have both panel and inverter brands set in Project Lifecycle.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={300} minWidth={0}>
            <BarChart layout="vertical" data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: chartColors.axisText }}
                stroke={chartColors.grid}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="brandLabel"
                width={108}
                tick={{ fontSize: 9, fill: chartColors.axisText }}
                stroke={chartColors.grid}
              />
              <Tooltip
                wrapperStyle={ZENITH_RECHARTS_TOOLTIP_WRAPPER_STYLE}
                content={(props) => <DashboardBrandTooltip {...props} costTitle={costTitle} />}
                cursor={ZENITH_RECHARTS_TOOLTIP_CURSOR}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                animationDuration={500}
                cursor="pointer"
                onClick={(_row: unknown, index: number) => {
                  const row = rows[index]
                  if (row?.brandLabel) onBrandNavigate(row.brandLabel, kind)
                }}
              >
                {rows.map((row, i) => (
                  <Cell
                    key={row.brandLabel}
                    fill={getLoanBankBarColor(row.brandLabel, i)}
                    className="outline-none"
                    style={{ transition: 'filter 0.15s' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(1.08)'
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
      </div>
    </div>
  )
}

/**
 * Classic Dashboard pair of horizontal bar charts — same cohort and drill semantics as Zenith
 * (Sales / Management / Admin / Operations only; Finance excluded).
 */
export default function DashboardLifecycleBrandBarCharts({
  projects,
  tileParams,
}: {
  projects: ZenithExplorerProject[] | null | undefined
  tileParams: TileParams
}) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const canView =
    user?.role === UserRole.SALES ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.OPERATIONS

  const list = Array.isArray(projects) ? projects : []

  const panelRows = useMemo(() => buildZenithLifecycleBrandBarRows(list, 'panel'), [list])
  const inverterRows = useMemo(() => buildZenithLifecycleBrandBarRows(list, 'inverter'), [list])

  const onBrandNavigate = (brandLabel: string, kind: 'panel' | 'inverter') => {
    const href =
      kind === 'panel'
        ? buildProjectsUrl({ panelBrand: brandLabel, lifecycleSpecsComplete: true }, tileParams)
        : buildProjectsUrl({ inverterBrand: brandLabel, lifecycleSpecsComplete: true }, tileParams)
    navigate(href)
  }

  if (!canView) return null

  const chartHeight = 300

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
      <div className="w-full min-h-[360px] flex flex-col min-w-0">
        <LifecycleBrandBarCard
          title="Projects by panel brand"
          rows={panelRows}
          chartHeight={chartHeight}
          costTitle="Panel cost (est.)"
          kind="panel"
          onBrandNavigate={onBrandNavigate}
        />
      </div>
      <div className="w-full min-h-[360px] flex flex-col min-w-0">
        <LifecycleBrandBarCard
          title="Projects by inverter brand"
          rows={inverterRows}
          chartHeight={chartHeight}
          costTitle="Inverter cost (est.)"
          kind="inverter"
          onBrandNavigate={onBrandNavigate}
        />
      </div>
    </div>
  )
}
