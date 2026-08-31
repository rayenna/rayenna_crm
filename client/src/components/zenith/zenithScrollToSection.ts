import { ZENITH_SCROLL_IDS, type ZenithInsightScrollTarget } from './zenithAiInsights'

const STICKY_STACK_SELECTOR = '.zenith-command-offline-stack'
const SCROLL_GAP_PX = 14

function stickyCommandOffsetPx(): number {
  if (typeof document === 'undefined') return 0
  const sticky = document.querySelector(STICKY_STACK_SELECTOR)
  return sticky ? Math.ceil(sticky.getBoundingClientRect().height) : 0
}

export function scrollToZenithElementId(id: string) {
  const el = document.getElementById(id)
  if (!el || typeof window === 'undefined') return
  const reduceMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const offset = stickyCommandOffsetPx() + SCROLL_GAP_PX
  const top = el.getBoundingClientRect().top + window.scrollY - offset

  window.scrollTo({
    top: Math.max(0, top),
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
}

export function scrollToZenithInsightTarget(target: ZenithInsightScrollTarget) {
  const id = ZENITH_SCROLL_IDS[target]
  scrollToZenithElementId(id)
}
