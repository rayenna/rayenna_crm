import {
  ZENITH_SCROLL_IDS,
  type ZenithInsight,
  type ZenithInsightScrollTarget,
} from './zenithAiInsights'
import { useEffect, useRef, useState } from 'react'

const ZENITH_TICKER_PX_PER_SEC = 32
const ZENITH_TICKER_MIN_S = 24
const ZENITH_TICKER_MAX_S = 110

function scrollToZenithSection(target: ZenithInsightScrollTarget) {
  const id = ZENITH_SCROLL_IDS[target]
  let el = document.getElementById(id)
  if (!el) {
    for (const fid of ['zenith-funnel', 'zenith-charts-row-1', 'zenith-kpis']) {
      el = document.getElementById(fid)
      if (el) break
    }
  }
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

function renderInsightButtons(
  insights: ZenithInsight[],
  keySuffix: 'a' | 'b',
) {
  return insights.map((ins) => (
    <button
      key={`${ins.id}-${keySuffix}`}
      type="button"
      onClick={() => scrollToZenithSection(ins.scrollTarget)}
      className="shrink-0 text-left text-[12px] sm:text-[13px] font-medium text-[color:var(--accent-gold)] active:opacity-90 sm:hover:opacity-90 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] rounded-full px-2 py-2 min-h-[44px] sm:min-h-0 sm:py-1 sm:rounded-sm sm:px-1 touch-manipulation"
    >
      {ins.text}
    </button>
  ))
}

/** Same marquee technique as Dashboard.tsx: duplicated row + translateX(-50%) keyframes (no JS scrollWidth). */
export default function ZenithAiInsightsTicker({
  insights,
  isLoading,
}: {
  insights: ZenithInsight[]
  isLoading: boolean
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
  }, [insights.length])

  if (isLoading && insights.length === 0) {
    return (
      <div className="zenith-ai-insights-root border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 96%, transparent)]">
        <div className="zenith-exec-main mx-auto px-3 sm:px-5 py-2 flex flex-col sm:block">
          <div className="h-10 sm:h-9 rounded-full bg-[color:var(--bg-ticker)] zenith-skeleton" aria-hidden />
        </div>
      </div>
    )
  }

  if (insights.length === 0) return null

  return (
    <div className="zenith-ai-insights-root border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 96%, transparent)]">
      <div className="zenith-exec-main mx-auto px-3 sm:px-5 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-h-0">
        <div className="flex items-center justify-center sm:justify-start shrink-0">
          <span className="zenith-display text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--accent-gold)] opacity-70 inline-flex items-center gap-1.5">
            <span
              className="zenith-command-live-dot"
              style={{
                background: 'var(--accent-green)',
                boxShadow: '0 0 0 2px color-mix(in srgb, var(--accent-green) 18%, transparent)',
              }}
              aria-hidden
            />
            AI insights
          </span>
        </div>
        <div
          className="zenith-ai-insights-viewport flex-1 min-w-0 min-h-[44px] sm:min-h-0 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-input)] py-2 sm:py-1.5 flex items-center"
          role="region"
          aria-label="AI insights, auto-scrolling"
        >
          <div
            ref={marqueeRef}
            className="zenith-ai-insights-marquee inline-flex shrink-0 items-center gap-8 sm:gap-12 whitespace-nowrap px-4 sm:px-6"
            style={{ animation: `zenith-ai-insights-marquee-kf ${durationS}s linear infinite` }}
          >
            {renderInsightButtons(insights, 'a')}
            {renderInsightButtons(insights, 'b')}
          </div>
        </div>
      </div>
    </div>
  )
}
