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

export default function ZenithAiInsightsTicker({
  insights,
  isLoading,
}: {
  insights: ZenithInsight[]
  isLoading: boolean
}) {
  if (isLoading && insights.length === 0) {
    return (
      <div className="zenith-ai-insights-root border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-2">
          <div className="h-9 rounded-full bg-white/[0.06] zenith-skeleton" aria-hidden />
        </div>
      </div>
    )
  }

  if (insights.length === 0) return null

  const loop = [...insights, ...insights]

  return (
    <div className="zenith-ai-insights-root border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-2 flex items-stretch gap-3 min-h-[2.75rem]">
        <div className="flex items-center shrink-0 pt-0.5">
          <span className="zenith-display text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#f5a623]/70">
            AI insights
          </span>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden rounded-full border border-white/10 bg-black/55 py-1.5 shadow-inner shadow-black/40">
          <div className="zenith-ai-insights-track flex items-center gap-12 whitespace-nowrap px-6">
            {loop.map((ins, i) => (
              <button
                key={`${ins.id}-${i}`}
                type="button"
                onClick={() => scrollToZenithSection(ins.scrollTarget)}
                className="shrink-0 text-left text-[12px] sm:text-[13px] font-medium text-[#f5a623] hover:text-[#ffc14a] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623]/50 rounded-sm px-1"
              >
                {ins.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
