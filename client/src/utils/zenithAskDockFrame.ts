const STORAGE_KEY = 'zenith-ask-dock-frame'
const EDGE = 12
/** Keep enough of the title bar on-screen to grab even if the rest is off-frame. */
export const ASK_DOCK_TITLE_GRAB = 52
export const ASK_DOCK_MIN_W = 360
export const ASK_DOCK_MIN_H = 240

export type ZenithAskDockFrame = {
  x: number
  y: number
  w: number
  h: number
  sized: boolean
}

export type AskDockViewport = {
  vw: number
  vh: number
  offsetLeft: number
  offsetTop: number
  safeTop: number
  safeBottom: number
  safeLeft: number
  safeRight: number
}

function cssPx(varName: string): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

/** Visible viewport for clamp — prefers visualViewport so iOS input-zoom can't hide the dock. */
export function getAskDockViewport(): AskDockViewport {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  return {
    vw: vv?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1024),
    vh: vv?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 768),
    offsetLeft: vv?.offsetLeft ?? 0,
    offsetTop: vv?.offsetTop ?? 0,
    safeTop: cssPx('--sat'),
    safeBottom: cssPx('--sab'),
    safeLeft: cssPx('--sal'),
    safeRight: cssPx('--sar'),
  }
}

export function clampAskDockFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  sized: boolean,
  vp: AskDockViewport = getAskDockViewport(),
): ZenithAskDockFrame {
  const edgeL = Math.max(EDGE, vp.safeLeft + 8)
  const edgeR = Math.max(EDGE, vp.safeRight + 8)
  const edgeT = Math.max(EDGE, vp.safeTop + 8)
  const edgeB = Math.max(EDGE, vp.safeBottom + 8)

  const maxW = Math.max(ASK_DOCK_MIN_W, vp.vw - edgeL - edgeR)
  const maxH = Math.max(ASK_DOCK_MIN_H, vp.vh - edgeT - edgeB)
  const width = Math.min(Math.max(w, ASK_DOCK_MIN_W), maxW)
  const height = Math.min(Math.max(h, ASK_DOCK_MIN_H), maxH)

  // Coordinates are layout-viewport fixed; align clamp box to the visible visual viewport.
  const minX = vp.offsetLeft + edgeL
  const maxX = vp.offsetLeft + vp.vw - width - edgeR
  const minY = vp.offsetTop + edgeT
  // Always keep the title-grab strip inside the visible area so the window can be pulled back.
  const maxY = vp.offsetTop + vp.vh - Math.min(height, ASK_DOCK_TITLE_GRAB) - edgeB

  const left = Math.min(Math.max(x, minX), Math.max(minX, maxX))
  const top = Math.min(Math.max(y, minY), Math.max(minY, maxY))
  return { x: left, y: top, w: width, h: height, sized }
}

export function readAskDockFrame(): ZenithAskDockFrame | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ZenithAskDockFrame>
    if (
      typeof parsed.x !== 'number' ||
      typeof parsed.y !== 'number' ||
      typeof parsed.w !== 'number' ||
      typeof parsed.h !== 'number'
    ) {
      return null
    }
    return clampAskDockFrame(parsed.x, parsed.y, parsed.w, parsed.h, parsed.sized !== false)
  } catch {
    return null
  }
}

export function writeAskDockFrame(frame: ZenithAskDockFrame | null): void {
  try {
    if (!frame) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(frame))
  } catch {
    /* private mode / quota */
  }
}
