import {
  isZenithProductAnnouncement,
  type ZenithTickerItem,
  type ZenithInsight,
  type ZenithInsightScrollTarget,
} from './zenithAiInsights'
import { scrollToZenithInsightTarget } from './zenithScrollToSection'
import { useEffect, useRef, useState } from 'react'

const ZENITH_TICKER_PX_PER_SEC = 32
const ZENITH_TICKER_MIN_S = 24
const ZENITH_TICKER_MAX_S = 110

function scrollToZenithSection(target: ZenithInsightScrollTarget) {
  scrollToZenithInsightTarget(target)
}

function renderTickerItems(items: ZenithTickerItem[], keySuffix: 'a' | 'b') {
  return items.map((item) => {
    if (isZenithProductAnnouncement(item)) {
      return (
        <span
          key={`${item.id}-${keySuffix}`}
          className="inline-flex shrink-0 items-center gap-2 text-[12px] sm:text-[13px] font-medium text-[color:var(--text-primary)]"
        >
          {item.showNewBadge ? (
            <span className="shrink-0 rounded-full bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--accent-gold)] shadow-sm ring-1 ring-[color:var(--accent-gold-border)]">
              New
            </span>
          ) : null}
          <span>{item.text}</span>
        </span>
      )
    }

    const ins = item as ZenithInsight
    return (
      <button
        key={`${ins.id}-${keySuffix}`}
        type="button"
        onClick={() => scrollToZenithSection(ins.scrollTarget)}
        className="shrink-0 text-left text-[12px] sm:text-[13px] font-medium text-[color:var(--accent-gold)] active:opacity-90 sm:hover:opacity-90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] rounded-full px-2 py-2 min-h-[44px] sm:min-h-0 sm:py-1 sm:rounded-sm sm:px-1 touch-manipulation"
      >
        {ins.text}
      </button>
    )
  })
}

/** Same marquee technique as Dashboard.tsx: duplicated row + translateX(-50%) keyframes (no JS scrollWidth). */
export default function ZenithAiInsightsTicker({
  items,
  isLoading,
  belowKpis = false,
}: {
  items: ZenithTickerItem[]
  isLoading: boolean
  /** Sit under the KPI strip: full-bleed in the body, borders above and below. */
  belowKpis?: boolean
}) {
  const marqueeRef = useRef<HTMLDivElement | null>(null)
  const [durationS, setDurationS] = useState<number>(32)

  useEffect(() => {
    const el = marqueeRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const compute = () => {
      const total = el.scrollWidth
      // We render the list twice (a + b) inside one track; half is one cycle distance.
      const half = total > 0 ? total / 2 : 0
      if (!half) return
      const next = Math.min(
        ZENITH_TICKER_MAX_S,
        Math.max(ZENITH_TICKER_MIN_S, half / ZENITH_TICKER_PX_PER_SEC),
      )
      setDurationS(next)
    }

    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    return () => ro.disconnect()
  }, [items.length])

  const rootClass = [
    'zenith-ai-insights-root bg-[color:color-mix(in srgb,var(--bg-surface) 96%, transparent)]',
    belowKpis
      ? 'zenith-ai-insights-root--below-kpis -mx-3 sm:-mx-5 border-y border-[color:var(--border-default)]'
      : 'border-b border-[color:var(--border-default)]',
  ].join(' ')

  const innerClass = belowKpis
    ? 'px-3 sm:px-5 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-h-0'
    : 'zenith-exec-main mx-auto px-3 sm:px-5 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-h-0'

  if (isLoading && items.length === 0) {
    return (
      <div className={rootClass}>
        <div className={belowKpis ? 'px-3 sm:px-5 py-2 flex flex-col sm:block' : 'zenith-exec-main mx-auto px-3 sm:px-5 py-2 flex flex-col sm:block'}>
          <div className="h-10 sm:h-9 rounded-full bg-[color:var(--bg-ticker)] zenith-skeleton" aria-hidden />
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className={rootClass}>
      <div className={innerClass}>
        <div className="flex items-center justify-center sm:justify-start shrink-0">
          <span className="zenith-display text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.22em] inline-flex items-center gap-1.5">
            <span
              className="zenith-command-live-dot"
              style={{
                background: 'var(--accent-green)',
                boxShadow: '0 0 0 2px color-mix(in srgb, var(--accent-green) 18%, transparent)',
              }}
              aria-hidden
            />
            <span className="bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-amber)] to-[color:var(--accent-teal)] bg-clip-text text-transparent drop-shadow-[0_1px_10px_color-mix(in_srgb,var(--accent-teal)_24%,transparent)]">
              AI insights
            </span>
          </span>
        </div>
        <div
          className="zenith-ai-insights-viewport flex-1 min-w-0 min-h-[44px] sm:min-h-0 rounded-full bg-transparent py-2 sm:py-1.5 flex items-center"
          role="region"
          aria-label="AI insights and product updates, auto-scrolling"
        >
          <div
            ref={marqueeRef}
            className="zenith-ai-insights-marquee inline-flex shrink-0 items-center gap-8 sm:gap-12 whitespace-nowrap px-4 sm:px-6"
            style={{ animation: `zenith-ai-insights-marquee-kf ${durationS}s linear infinite` }}
          >
            {renderTickerItems(items, 'a')}
            {renderTickerItems(items, 'b')}
          </div>
        </div>
      </div>
    </div>
  )
}
