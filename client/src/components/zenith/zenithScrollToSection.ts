import { ZENITH_SCROLL_IDS, type ZenithInsightScrollTarget } from './zenithAiInsights'

export function scrollToZenithElementId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

export function scrollToZenithInsightTarget(target: ZenithInsightScrollTarget) {
  const id = ZENITH_SCROLL_IDS[target]
  scrollToZenithElementId(id)
}
