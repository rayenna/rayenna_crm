import {
  ZENITH_SCROLL_IDS,
  type ZenithInsight,
  type ZenithInsightScrollTarget,
} from './zenithAiInsights'

function scrollToZenithSection(target: ZenithInsightScrollTarget) {
  const id = ZENITH_SCROLL_IDS[target]
  let el = document.getElementById(id)
  if (!el) {
    for (const fid of ['zenith-funnel', 'zenith-charts-row-1', 'zenith-kpis']) {
      el = document.getElementById(fid)
      if (el) break
    }
  }
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      className="shrink-0 text-left text-[12px] sm:text-[13px] font-medium text-[#f5a623] active:text-[#ffc14a] sm:hover:text-[#ffc14a] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623]/50 rounded-full px-2 py-2 min-h-[44px] sm:min-h-0 sm:py-1 sm:rounded-sm sm:px-1 touch-manipulation"
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
  if (isLoading && insights.length === 0) {
    return (
      <div className="zenith-ai-insights-root border-b border-white/[0.06] bg-[#0a0a0f]/90">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-2 flex flex-col sm:block">
          <div className="h-10 sm:h-9 rounded-full bg-white/[0.06] zenith-skeleton" aria-hidden />
        </div>
      </div>
    )
  }

  if (insights.length === 0) return null

  return (
    <div className="zenith-ai-insights-root border-b border-white/[0.06] bg-[#0a0a0f]/90">
      <style>
        {`@keyframes zenith-ai-insights-marquee-kf {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }`}
      </style>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-h-0">
        <div className="flex items-center justify-center sm:justify-start shrink-0">
          <span className="zenith-display text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#f5a623]/70">
            AI insights
          </span>
        </div>
        <div
          className="zenith-ai-insights-viewport flex-1 min-w-0 min-h-[44px] sm:min-h-0 rounded-full border border-white/10 bg-black/55 py-2 sm:py-1.5 shadow-inner shadow-black/40 flex items-center"
          role="region"
          aria-label="AI insights, auto-scrolling"
        >
          <div
            className="zenith-ai-insights-marquee inline-flex shrink-0 items-center gap-8 sm:gap-12 whitespace-nowrap px-4 sm:px-6"
            style={{
              animation: 'zenith-ai-insights-marquee-kf 32s linear infinite',
            }}
          >
            {renderInsightButtons(insights, 'a')}
            {renderInsightButtons(insights, 'b')}
          </div>
        </div>
      </div>
    </div>
  )
}
