const STORAGE_KEY = 'zenith-ask-dock-frame'
const EDGE = 12
export const ASK_DOCK_MIN_W = 360
export const ASK_DOCK_MIN_H = 240

export type ZenithAskDockFrame = {
  x: number
  y: number
  w: number
  h: number
  sized: boolean
}

function viewport(): { vw: number; vh: number } {
  return { vw: window.innerWidth, vh: window.innerHeight }
}

export function clampAskDockFrame(
  x: number,
  y: number,
  w: number,
  h: number,
  sized: boolean,
): ZenithAskDockFrame {
  const { vw, vh } = viewport()
  const maxW = Math.max(ASK_DOCK_MIN_W, vw - EDGE * 2)
  const maxH = Math.max(ASK_DOCK_MIN_H, vh - EDGE * 2)
  const width = Math.min(Math.max(w, ASK_DOCK_MIN_W), maxW)
  const height = Math.min(Math.max(h, ASK_DOCK_MIN_H), maxH)
  const left = Math.min(Math.max(x, EDGE), Math.max(EDGE, vw - width - EDGE))
  const top = Math.min(Math.max(y, EDGE), Math.max(EDGE, vh - height - EDGE))
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
