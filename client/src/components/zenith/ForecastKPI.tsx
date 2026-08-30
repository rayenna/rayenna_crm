import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import {
  buildForecastRoleAccent,
  computeForecast,
  computeForecastConcentration,
  explorerCohortLooksCapped,
  filterForecastSliceDeals,
  forecastBandLabel,
  forecastDimensionTitle,
  forecastTimingLabel,
  getForecastOpenDeals,
  weightedDealValue,
  FORECAST_STAGE_WEIGHT_CHIPS,
  ZENITH_EXPLORER_PROJECT_CAP,
  type ForecastBand,
  type ForecastBreakdownDimension,
  type ForecastTiming,
} from '../../utils/revenueForecast'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import type { UserRole } from '../../types'

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatINRCompact(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatWinRate(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '—'
  return `${Math.round(rate * 100)}%`
}

type TabKey = ForecastBreakdownDimension

type PortalPos = { top: number; left: number; width: number; maxHeight: number }

const BANDS: { key: ForecastBand; label: string; title: string }[] = [
  { key: 'all', label: 'All', title: 'All open deals (Lead through Subsidy submitted)' },
  { key: 'early', label: 'Early', title: 'Lead, Site Survey, Proposal' },
  {
    key: 'committed',
    label: 'Committed',
    title: 'Confirmed Order, Under Installation, Submitted for Subsidy',
  },
]

const TIMINGS: { key: ForecastTiming; label: string; title: string }[] = [
  { key: 'all', label: 'Any time', title: 'All open deals regardless of schedule date' },
  {
    key: 'month',
    label: 'Month',
    title: 'Expected commissioning this month or overdue (requires commissioning date)',
  },
  {
    key: 'quarter',
    label: 'Quarter',
    title: 'Expected commissioning by end of this Indian FY quarter (includes overdue)',
  },
  {
    key: 'rest_of_fy',
    label: 'Rest of FY',
    title: 'Expected commissioning after this quarter through end of the current Indian FY',
  },
]

function placeBelowOrAbove(anchor: DOMRect, preferredWidth: number, preferredMaxH: number): PortalPos {
  const pad = 10
  const gap = 8
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(preferredWidth, vw - pad * 2)
  let left = anchor.left
  if (left + width > vw - pad) left = vw - pad - width
  if (left < pad) left = pad

  const spaceBelow = vh - anchor.bottom - pad
  const spaceAbove = anchor.top - pad
  const openBelow = spaceBelow >= Math.min(preferredMaxH, 160) || spaceBelow >= spaceAbove
  const maxHeight = Math.min(preferredMaxH, openBelow ? spaceBelow - gap : spaceAbove - gap)
  const top = openBelow ? anchor.bottom + gap : Math.max(pad, anchor.top - gap - maxHeight)

  return { top, left, width, maxHeight: Math.max(120, maxHeight) }
}

export default function ForecastKPI({
  projects,
  onOpenForecastList,
  compactSidebar = false,
  role = null,
}: {
  projects: ZenithExplorerProject[] | null | undefined
  onOpenForecastList: (args: { filterLabel: string; filteredProjects: ZenithExplorerProject[] }) => void
  /** Narrower card when placed beside the executive KPI grid on lg+. */
  compactSidebar?: boolean
  /** Drives the thin role accent under concentration (shared tile). */
  role?: UserRole | string | null
}) {
  const [band, setBand] = useState<ForecastBand>('all')
  const [timing, setTiming] = useState<ForecastTiming>('all')
  const forecast = useMemo(
    () => computeForecast(projects, { band, timing }),
    [projects, band, timing],
  )
  const openDeals = useMemo(
    () => getForecastOpenDeals(projects, band, timing),
    [projects, band, timing],
  )
  const concentration = useMemo(
    () => computeForecastConcentration(openDeals, forecast.totalForecast, 3),
    [openDeals, forecast.totalForecast],
  )
  const roleAccent = useMemo(
    () => buildForecastRoleAccent(role, openDeals, forecast),
    [role, openDeals, forecast],
  )
  const cohortCapped = explorerCohortLooksCapped((projects ?? []).length)
  const [activeTab, setActiveTab] = useState<TabKey>('source')
  const [displayTotal, setDisplayTotal] = useState(0)
  const [legendOpen, setLegendOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [legendPos, setLegendPos] = useState<PortalPos | null>(null)
  const [morePos, setMorePos] = useState<PortalPos | null>(null)

  const legendBtnRef = useRef<HTMLButtonElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const legendPanelRef = useRef<HTMLDivElement>(null)
  const morePanelRef = useRef<HTMLDivElement>(null)

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

  const updateLegendPos = useCallback(() => {
    const el = legendBtnRef.current
    if (!el) return
    setLegendPos(placeBelowOrAbove(el.getBoundingClientRect(), 288, 280))
  }, [])

  const updateMorePos = useCallback(() => {
    const el = moreBtnRef.current
    if (!el) return
    setMorePos(placeBelowOrAbove(el.getBoundingClientRect(), Math.max(el.offsetWidth, 280), 320))
  }, [])

  useLayoutEffect(() => {
    if (!legendOpen) {
      setLegendPos(null)
      return
    }
    updateLegendPos()
    const onMove = () => updateLegendPos()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [legendOpen, updateLegendPos])

  useLayoutEffect(() => {
    if (!moreOpen) {
      setMorePos(null)
      return
    }
    updateMorePos()
    const onMove = () => updateMorePos()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [moreOpen, updateMorePos])

  useEffect(() => {
    if (!legendOpen && !moreOpen) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        legendOpen &&
        !legendBtnRef.current?.contains(t) &&
        !legendPanelRef.current?.contains(t)
      ) {
        setLegendOpen(false)
      }
      if (moreOpen && !moreBtnRef.current?.contains(t) && !morePanelRef.current?.contains(t)) {
        setMoreOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLegendOpen(false)
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [legendOpen, moreOpen])

  useEffect(() => {
    setMoreOpen(false)
  }, [activeTab, band, timing])

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
  const remainingRows = activeDimension.slice(3)
  const remaining = remainingRows.length
  const dimTitle = forecastDimensionTitle(activeTab)

  const openSlice = (label: string) => {
    setMoreOpen(false)
    const filtered = filterForecastSliceDeals(projects, activeTab, label, band, timing)
    const bandSuffix = band === 'all' ? '' : ` · ${forecastBandLabel(band)}`
    const timingSuffix = timing === 'all' ? '' : ` · ${forecastTimingLabel(timing)}`
    onOpenForecastList({
      filterLabel: `Weighted pipeline · ${dimTitle} · ${label}${bandSuffix}${timingSuffix}`,
      filteredProjects: filtered,
    })
  }

  const openTopConcentration = () => {
    if (concentration.dealCount === 0) return
    const top = [...openDeals]
      .sort((a, b) => weightedDealValue(b) - weightedDealValue(a))
      .slice(0, 3)
    const bandSuffix = band === 'all' ? '' : ` · ${forecastBandLabel(band)}`
    const timingSuffix = timing === 'all' ? '' : ` · ${forecastTimingLabel(timing)}`
    onOpenForecastList({
      filterLabel: `Weighted pipeline · Top ${top.length} deals${bandSuffix}${timingSuffix}`,
      filteredProjects: top,
    })
  }

  const emptyMessage = () => {
    if (timing !== 'all' && band === 'all') {
      return `No open deals scheduled for ${forecastTimingLabel(timing).toLowerCase()}.`
    }
    if (timing !== 'all' && band !== 'all') {
      return `No ${forecastBandLabel(band).toLowerCase()} deals for ${forecastTimingLabel(timing).toLowerCase()}.`
    }
    if (band !== 'all') {
      return `No ${forecastBandLabel(band).toLowerCase()} deals in this period.`
    }
    return 'No open pipeline in this period.'
  }

  const contextBits: string[] = []
  if (band !== 'all') contextBits.push(forecastBandLabel(band))
  if (timing !== 'all') contextBits.push(forecastTimingLabel(timing))
  if (timing === 'all' && forecast.unscheduledCount > 0) {
    contextBits.push(`${forecast.unscheduledCount} unscheduled`)
  }
  if ((timing === 'month' || timing === 'quarter' || timing === 'all') && forecast.pastDueCount > 0) {
    contextBits.push(`${forecast.pastDueCount} past due`)
  }

  const ROW_SLOT_PX = 34
  const BREAKDOWN_H = ROW_SLOT_PX * 3 + 6
  /** Keep “+N more” fully inside the card — never clipped by flex shrink. */
  const FOOTER_H = 40

  const weightsPortal =
    legendOpen && legendPos && typeof document !== 'undefined'
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[5890] bg-black/25"
              aria-hidden
              onClick={() => setLegendOpen(false)}
            />
            <div
              ref={legendPanelRef}
              id="forecast-weight-legend"
              role="dialog"
              aria-label="Stage win probabilities"
              className="fixed z-[5900] rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] p-3 shadow-xl ring-1 ring-[color:var(--border-default)] backdrop-blur-xl"
              style={{
                top: legendPos.top,
                left: legendPos.left,
                width: legendPos.width,
                maxHeight: legendPos.maxHeight,
                overflowY: 'auto',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[12px] font-semibold text-[color:var(--text-primary)]">
                  Deal value × stage %
                </p>
                <button
                  type="button"
                  onClick={() => setLegendOpen(false)}
                  className="rounded p-0.5 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] cursor-pointer"
                  aria-label="Close weights"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-[color:var(--text-muted)] mb-2.5 leading-snug">
                Early stages are discounted; Confirmed+ count at 100%. When filters use expected
                commissioning only (IST) — deals without that date stay under Any time. Not cash.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FORECAST_STAGE_WEIGHT_CHIPS.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1 rounded-full border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-2 py-0.5 text-[10px] text-[color:var(--accent-teal)]"
                  >
                    <span className="text-[color:var(--text-secondary)]">{chip.label}</span>
                    <span className="font-semibold">{Math.round(chip.probability * 100)}%</span>
                  </span>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )
      : null

  const morePortal =
    moreOpen && morePos && typeof document !== 'undefined'
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[5890] bg-black/25"
              aria-hidden
              onClick={() => setMoreOpen(false)}
            />
            <div
              ref={morePanelRef}
              id="forecast-more-categories"
              role="dialog"
              aria-label={`More ${dimTitle} categories`}
              className="fixed z-[5900] flex flex-col rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] shadow-xl ring-1 ring-[color:var(--border-default)] backdrop-blur-xl"
              style={{
                top: morePos.top,
                left: morePos.left,
                width: morePos.width,
                maxHeight: morePos.maxHeight,
              }}
            >
              <div className="flex items-start justify-between gap-2 border-b border-[color:var(--border-default)] px-3 py-2.5 shrink-0">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[color:var(--text-primary)]">
                    More {dimTitle.toLowerCase()}
                  </p>
                  <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5 leading-snug">
                    Choose a category to open its deals
                    {band !== 'all' ? ` · ${forecastBandLabel(band)}` : ''}
                    {timing !== 'all' ? ` · ${forecastTimingLabel(timing)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="rounded p-0.5 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul
                role="listbox"
                className="min-h-0 flex-1 overflow-y-auto p-1.5"
                aria-label={`Remaining ${dimTitle} categories`}
              >
                {remainingRows.map((row) => (
                  <li key={row.label} role="presentation">
                    <button
                      type="button"
                      role="option"
                      onClick={() => openSlice(row.label)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-[color:var(--accent-teal-muted)] cursor-pointer touch-manipulation"
                    >
                      <span className="min-w-0">
                        <span
                          className="block truncate text-[12px] font-medium text-[color:var(--text-primary)]"
                          title={row.label}
                        >
                          {row.label}
                        </span>
                        <span className="text-[10px] text-[color:var(--text-muted)]">
                          {row.count} deal{row.count === 1 ? '' : 's'} · raw {formatINRCompact(row.raw)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] font-semibold text-[color:var(--accent-teal)]">
                        {formatINR(row.weighted)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <div
      className={[
        'zenith-forecast-root relative box-border flex w-full shrink-0 flex-col overflow-hidden rounded-[14px] border border-[color:var(--accent-teal-border)] bg-[color:var(--bg-card)] p-3.5 pb-3 shadow-[0_1px_0_color-mix(in_srgb,#ffffff_55%,transparent)] sm:p-4 sm:pb-3.5',
        compactSidebar
          ? 'h-full min-h-0 w-full flex-1'
          : 'h-auto min-h-[448px] sm:min-h-[448px]',
      ].join(' ')}
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
          Weighted open pipeline
        </div>
        <button
          ref={legendBtnRef}
          type="button"
          onClick={() => {
            setLegendOpen((v) => !v)
            setMoreOpen(false)
          }}
          className="zenith-forecast-weights inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[color:var(--text-muted)] hover:bg-[color:var(--accent-teal-muted)] hover:text-[color:var(--accent-teal)] transition-colors cursor-pointer touch-manipulation"
          aria-expanded={legendOpen}
          aria-controls="forecast-weight-legend"
          title="Stage win probabilities"
        >
          <Info className="w-3 h-3 shrink-0 opacity-80" aria-hidden />
          Weights
        </button>
      </div>

      <div
        className="mt-1 text-[20px] font-bold leading-tight shrink-0 text-[color:var(--accent-teal)]"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {formatINR(displayTotal)}
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-[color:var(--text-muted)] shrink-0">
        <span title="Sum of order values for open deals in this band">
          Raw {formatINRCompact(forecast.totalRaw)}
        </span>
        <span className="opacity-40" aria-hidden>
          ·
        </span>
        <span title="Weighted expected ÷ raw open pipeline">
          Win rate {formatWinRate(forecast.impliedWinRate)}
        </span>
      </div>
      <div className="text-[11px] text-[color:var(--text-muted)] mt-0.5 shrink-0">
        Expected from {forecast.dealCount} open deal{forecast.dealCount === 1 ? '' : 's'}
        {contextBits.length > 0 ? (
          <span className="text-[color:var(--text-secondary)]"> · {contextBits.join(' · ')}</span>
        ) : null}
      </div>
      {concentration.dealCount > 0 && forecast.totalForecast > 0 ? (
        <button
          type="button"
          onClick={openTopConcentration}
          className="mt-1 text-left text-[11px] leading-snug text-[color:var(--text-secondary)] hover:text-[color:var(--accent-teal)] transition-colors cursor-pointer touch-manipulation shrink-0"
          title={concentration.names.join(' · ')}
        >
          Top {concentration.dealCount} = {Math.round(concentration.share * 100)}% of forecast
          <span className="text-[color:var(--text-muted)]">
            {' '}
            · {formatINRCompact(concentration.weighted)}
          </span>
        </button>
      ) : null}
      {roleAccent ? (
        <div
          className={`mt-0.5 text-[10px] leading-snug shrink-0 ${
            roleAccent.tone === 'warning'
              ? 'text-[color:var(--accent-gold)]'
              : roleAccent.tone === 'info'
                ? 'text-[color:var(--accent-teal)]'
                : 'text-[color:var(--text-muted)]'
          }`}
          title={roleAccent.title}
        >
          {roleAccent.text}
        </div>
      ) : null}
      {cohortCapped ? (
        <div
          className="mt-0.5 text-[10px] leading-snug text-[color:var(--text-muted)] shrink-0"
          title={`Zenith explorer loads at most ${ZENITH_EXPLORER_PROJECT_CAP} projects (newest updates first).`}
        >
          Based on explorer cohort (max {ZENITH_EXPLORER_PROJECT_CAP.toLocaleString('en-IN')})
        </div>
      ) : null}

      <div
        className="mt-2 flex rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-ticker)] p-0.5 shrink-0"
        role="group"
        aria-label="Pipeline band"
      >
        {BANDS.map((b) => (
          <button
            key={b.key}
            type="button"
            title={b.title}
            onClick={() => setBand(b.key)}
            className={`zenith-forecast-seg flex-1 rounded-md px-1.5 py-1 text-[10px] font-semibold leading-tight transition-colors cursor-pointer touch-manipulation ${
              band === b.key
                ? 'bg-[color:var(--bg-card)] text-[color:var(--accent-teal)] shadow-sm'
                : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]'
            }`}
            aria-pressed={band === b.key}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div
        className="mt-1.5 flex rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-ticker)] p-0.5 shrink-0"
        role="group"
        aria-label="When scheduled"
      >
        {TIMINGS.map((t) => (
          <button
            key={t.key}
            type="button"
            title={t.title}
            onClick={() => setTiming(t.key)}
            className={`zenith-forecast-seg flex-1 min-w-0 rounded-md px-0.5 py-1 text-[10px] font-semibold leading-tight transition-colors cursor-pointer touch-manipulation ${
              timing === t.key
                ? 'bg-[color:var(--bg-card)] text-[color:var(--accent-teal)] shadow-sm'
                : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]'
            }`}
            aria-pressed={timing === t.key}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className="flex flex-nowrap gap-1 mt-2.5 mb-1.5 pb-2 border-b border-[color:var(--border-default)] shrink-0 overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'thin' }}
        role="tablist"
        aria-label="Forecast breakdown"
      >
        {(
          [
            ['source', 'Source'],
            ['sales', 'Sales'],
            ['segment', 'Customer type'],
            ['stage', 'Stage'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`zenith-forecast-tab text-[10px] px-2 py-1 rounded transition-all cursor-pointer shrink-0 touch-manipulation ${
              activeTab === key
                ? 'text-[color:var(--accent-teal)] bg-[color:var(--accent-teal-muted)] border-b-2 border-[color:var(--accent-teal)] -mb-2.5 pb-1.5'
                : 'text-[color:var(--text-muted)] bg-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="mt-auto flex min-h-0 flex-1 flex-col justify-end"
        style={{ minHeight: BREAKDOWN_H + FOOTER_H }}
      >
        <div className="flex shrink-0 flex-col justify-start" style={{ height: BREAKDOWN_H }}>
          {activeDimension.length === 0 ? (
            <div className="flex h-full items-center justify-center px-2">
              <p className="text-center text-xs text-[color:var(--text-muted)]">{emptyMessage()}</p>
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
                <button
                  key={item.label}
                  type="button"
                  onClick={() => openSlice(item.label)}
                  className="flex w-full shrink-0 cursor-pointer touch-manipulation flex-col justify-center rounded-md px-0.5 -mx-0.5 text-left transition-colors hover:bg-[color:var(--accent-teal-muted)]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent-teal)]"
                  style={{ height: ROW_SLOT_PX }}
                  title={`Open ${item.count} deal${item.count === 1 ? '' : 's'} · raw ${formatINR(item.raw)}`}
                >
                  <div className="mb-0.5 flex justify-between gap-2">
                    <span
                      className="max-w-[60%] truncate text-[11px] text-[color:var(--text-secondary)]"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-[color:var(--accent-teal)]">
                      {formatINR(item.weighted)}
                    </span>
                  </div>
                  <div className="h-[3px] overflow-hidden rounded-sm bg-[color:var(--bg-ticker)]">
                    <div
                      className="h-full rounded-sm bg-[color:var(--accent-teal)] transition-[width] duration-[600ms] ease-out"
                      style={{
                        width: `${top > 0 ? (item.weighted / top) * 100 : 0}%`,
                        opacity: 1 - i * 0.25,
                      }}
                    />
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div
          className="flex shrink-0 items-center border-t border-transparent pt-1"
          style={{ minHeight: FOOTER_H }}
        >
          {remaining > 0 ? (
            <button
              ref={moreBtnRef}
              type="button"
              onClick={() => {
                setMoreOpen((v) => !v)
                setLegendOpen(false)
              }}
              className="zenith-forecast-more flex w-full cursor-pointer touch-manipulation items-center py-0.5 text-left text-[11px] leading-snug text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--accent-teal)]"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              aria-controls="forecast-more-categories"
            >
              +{remaining} more
            </button>
          ) : (
            <span
              className="pointer-events-none w-full select-none py-0.5 text-left text-[11px] leading-snug text-[color:var(--text-muted)] opacity-0"
              aria-hidden
            >
              +
            </span>
          )}
        </div>
      </div>

      {weightsPortal}
      {morePortal}
    </div>
  )
}
