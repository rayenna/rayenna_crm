/**
 * iOS Safari / Home Screen PWA rubber-band killer.
 *
 * CSS `overscroll-behavior` alone is not enough on iPhone — WebKit still
 * visually stretches scrollports (and sometimes the whole frame) at edges.
 * A non-passive touchmove that preventDefaults when no scroller can absorb
 * the gesture is the reliable fix used by solid mobile PWAs.
 */

function isVerticallyScrollable(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  const oy = style.overflowY
  if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') return false
  return el.scrollHeight > el.clientHeight + 1
}

/** `dy > 0` = finger moved down (user pulling content down / past top). */
function canScrollVertically(el: HTMLElement, dy: number): boolean {
  if (dy > 0) return el.scrollTop > 0
  if (dy < 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1
  return false
}

function findScrollableThatCanAbsorb(target: EventTarget | null, dy: number): HTMLElement | null {
  let cur: HTMLElement | null = target instanceof HTMLElement ? target : null
  while (cur && cur !== document.body && cur !== document.documentElement) {
    if (cur.dataset.iosScrollLock === 'off') return cur
    if (isVerticallyScrollable(cur) && canScrollVertically(cur, dy)) return cur
    cur = cur.parentElement
  }
  return null
}

/**
 * Attach to a single scrollport (e.g. `.crm-main-scroll`).
 * Prefer `installCrmIosOverscrollGuard()` for app-wide coverage.
 */
export function attachIosEdgeOverscrollLock(root: HTMLElement): () => void {
  let startY = 0
  let startX = 0

  const onStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    startY = e.touches[0].clientY
    startX = e.touches[0].clientX
  }

  const onMove = (e: TouchEvent) => {
    if (e.defaultPrevented || e.touches.length !== 1) return
    const dy = e.touches[0].clientY - startY
    const dx = e.touches[0].clientX - startX
    if (dy === 0) return
    // Horizontal pans (tables, carousels) — do not block.
    if (Math.abs(dx) > Math.abs(dy)) return

    const scroller = findScrollableThatCanAbsorb(e.target, dy) ?? root
    if (scroller === root) {
      if (!canScrollVertically(root, dy)) e.preventDefault()
      return
    }
    // Nested scroller already can absorb — allow.
  }

  root.addEventListener('touchstart', onStart, { passive: true })
  root.addEventListener('touchmove', onMove, { passive: false })
  return () => {
    root.removeEventListener('touchstart', onStart)
    root.removeEventListener('touchmove', onMove)
  }
}

let guardInstalled = false

/**
 * Document-level guard: blocks rubber-band at top AND bottom everywhere in CRM,
 * while allowing real scrolling inside `.crm-main-scroll`, modals, drawers, etc.
 */
export function installCrmIosOverscrollGuard(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (guardInstalled) return () => {}
  guardInstalled = true

  let startY = 0
  let startX = 0

  const onStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    startY = e.touches[0].clientY
    startX = e.touches[0].clientX
  }

  const onMove = (e: TouchEvent) => {
    if (e.defaultPrevented || e.touches.length !== 1) return
    const dy = e.touches[0].clientY - startY
    const dx = e.touches[0].clientX - startX
    if (dy === 0) return
    if (Math.abs(dx) > Math.abs(dy) + 2) return

    // Allow intentional opt-outs (rare).
    const t = e.target
    if (t instanceof Element && t.closest('[data-ios-scroll-lock="off"]')) return

    if (!findScrollableThatCanAbsorb(e.target, dy)) {
      e.preventDefault()
    }
  }

  // Capture so we run before scroll chaining; still respect defaultPrevented from controls.
  document.addEventListener('touchstart', onStart, { passive: true, capture: true })
  document.addEventListener('touchmove', onMove, { passive: false, capture: true })

  return () => {
    document.removeEventListener('touchstart', onStart, true)
    document.removeEventListener('touchmove', onMove, true)
    guardInstalled = false
  }
}
