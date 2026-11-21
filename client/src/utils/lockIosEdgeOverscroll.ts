/**
 * Stop iOS Safari / Home Screen PWA rubber-banding a dedicated scrollport
 * when the gesture would pull past the top or bottom edge.
 * Nested scroll areas keep working; only the edge that cannot scroll further is locked.
 */
export function attachIosEdgeOverscrollLock(root: HTMLElement): () => void {
  let startY = 0

  const scrollParentOf = (node: EventTarget | null): HTMLElement => {
    let cur: HTMLElement | null = node instanceof HTMLElement ? node : null
    while (cur && cur !== root) {
      const style = window.getComputedStyle(cur)
      const oy = style.overflowY
      if (
        (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
        cur.scrollHeight > cur.clientHeight + 1
      ) {
        return cur
      }
      cur = cur.parentElement
    }
    return root
  }

  const onStart = (e: TouchEvent) => {
    if (e.touches.length === 1) startY = e.touches[0].clientY
  }

  const onMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    const dy = e.touches[0].clientY - startY
    if (dy === 0) return
    const scroller = scrollParentOf(e.target)
    const atTop = scroller.scrollTop <= 0
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
    if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
      e.preventDefault()
    }
  }

  root.addEventListener('touchstart', onStart, { passive: true })
  root.addEventListener('touchmove', onMove, { passive: false })
  return () => {
    root.removeEventListener('touchstart', onStart)
    root.removeEventListener('touchmove', onMove)
  }
}
