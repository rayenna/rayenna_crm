import { useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { computeForecast } from '../../utils/revenueForecast'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import { buildFilterLabel, filterProjectsByChartSlice } from '../../utils/zenithChartDrilldown'

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

type TabKey = 'source' | 'sales' | 'segment' | 'stage'

export default function ForecastKPI({
  projects,
  onOpenForecastList,
}: {
  projects: ZenithExplorerProject[] | null | undefined
  onOpenForecastList: (args: { filterLabel: string; filteredProjects: ZenithExplorerProject[] }) => void
}) {
  const forecast = useMemo(() => computeForecast(projects), [projects])
  const [activeTab, setActiveTab] = useState<TabKey>('source')
  const [displayTotal, setDisplayTotal] = useState(0)

  useEffect(() => {
    const target = forecast.totalForecast
    setDisplayTotal(0)
    const dur = 600
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const ease = 1 - (1 - t) ** 2
      setDisplayTotal(Math.round(target * ease))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [forecast.totalForecast])

  const activeDimension = useMemo(() => {
    switch (activeTab) {
      case 'source':
        return forecast.byLeadSource
      case 'sales':
        return forecast.bySalesMember
      case 'segment':
        return forecast.bySegment
      case 'stage':
        return forecast.byStage
      default:
        return forecast.byLeadSource
    }
  }, [activeTab, forecast])

  const top = activeDimension[0]?.weighted ?? 1
  const remaining = Math.max(0, activeDimension.length - 3)

  const openAllOpenDeals = () => {
    const list = projects ?? []
    const filtered = filterProjectsByChartSlice(list, 'forecast', 'All Open Deals')
    onOpenForecastList({
      filterLabel: buildFilterLabel('forecast', 'All open deals'),
      filteredProjects: filtered,
    })
  }

  /** Fixed layout so KPI band height stays stable (Hit List / funnel sync off `kpiBandRef`). */
  const ROW_SLOT_PX = 36
  const BREAKDOWN_H = ROW_SLOT_PX * 3 + 10
  /** Room for "+N more" line + padding so it is not clipped at the card edge */
  const FOOTER_H = 32

  return (
    <div
      className="w-full box-border rounded-[14px] p-3.5 sm:p-4 flex flex-col shrink-0 h-[300px] sm:h-[306px] border border-[color:var(--accent-teal-border)] bg-[color:var(--bg-card)] shadow-[0_1px_0_color-mix(in_srgb,#ffffff_55%,transparent)]"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] shrink-0">
        Revenue forecast
      </div>
      <div
        className="mt-1 text-[20px] font-bold leading-tight shrink-0 text-[color:var(--accent-teal)]"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {formatINR(displayTotal)}
      </div>
      <div className="text-[11px] text-[color:var(--text-muted)] mt-0.5 shrink-0">
        Expected from {forecast.dealCount} open deals
      </div>
      <div className="flex items-center gap-1 mt-1 text-[10px] text-[color:var(--text-muted)] italic shrink-0">
        <span
          className="inline-flex items-center gap-1"
          title="Forecast = deal value × win probability by stage (e.g. Lead 10%, Proposal 45%, Confirmed Order 85%, Under Installation 90%, Submitted for Subsidy 95%). Terminal stages are excluded."
        >
          <Info className="w-2.5 h-2.5 shrink-0 opacity-70" aria-hidden />
          Stage-weighted probability
        </span>
      </div>

      <div
        className="flex flex-nowrap gap-1 mt-2.5 mb-2 pb-2 border-b border-[color:var(--border-default)] shrink-0 overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'thin' }}
        role="tablist"
        aria-label="Forecast breakdown"
      >
        {(
          [
            ['source', 'Source'],
            ['sales', 'Sales'],
            ['segment', 'Segment'],
            ['stage', 'Stage'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`text-[10px] px-2 py-1 rounded transition-all cursor-pointer shrink-0 ${
              activeTab === key
                ? 'text-[color:var(--accent-teal)] bg-[color:var(--accent-teal-muted)] border-b-2 border-[color:var(--accent-teal)] -mb-2.5 pb-1.5'
                : 'text-[color:var(--text-muted)] bg-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col shrink-0" style={{ height: BREAKDOWN_H + FOOTER_H }}>
        <div className="flex flex-col justify-start shrink-0" style={{ height: BREAKDOWN_H }}>
          {activeDimension.length === 0 ? (
            <div className="h-full flex items-center justify-center px-2">
              <p className="text-xs text-[color:var(--text-muted)] text-center">No open pipeline in this period.</p>
            </div>
          ) : (
            [0, 1, 2].map((slot) => {
              const item = activeDimension[slot]
              if (!item) {
                return (
                  <div
                    key={`forecast-slot-${slot}`}
                    className="shrink-0"
                    style={{ height: ROW_SLOT_PX }}
                    aria-hidden
                  />
                )
              }
              const i = slot
              return (
                <div key={item.label} className="shrink-0 flex flex-col justify-center" style={{ height: ROW_SLOT_PX }}>
                  <div className="flex justify-between gap-2 mb-0.5">
                    <span
                      className="text-[11px] text-[color:var(--text-secondary)] truncate max-w-[60%]"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                    <span className="text-[11px] font-medium shrink-0 text-[color:var(--accent-teal)]">
                      {formatINR(item.weighted)}
                    </span>
                  </div>
                  <div className="h-[3px] rounded-sm bg-[color:var(--bg-ticker)] overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-[width] duration-[600ms] ease-out bg-[color:var(--accent-teal)]"
                      style={{
                        width: `${top > 0 ? (item.weighted / top) * 100 : 0}%`,
                        opacity: 1 - i * 0.25,
                      }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="shrink-0 flex items-center pb-1" style={{ height: FOOTER_H }}>
          {remaining > 0 ? (
            <button
              type="button"
              onClick={openAllOpenDeals}
              className="text-[11px] leading-snug text-left w-full cursor-pointer hover:text-[color:var(--text-secondary)] text-[color:var(--text-muted)] transition-colors"
            >
              +{remaining} more
            </button>
          ) : (
            <span
              className="text-[11px] leading-snug text-left w-full text-[color:var(--text-muted)] opacity-0 pointer-events-none select-none"
              aria-hidden
            >
              +
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
