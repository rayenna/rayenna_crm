import { describe, expect, it } from 'vitest'
import {
  ASK_DOCK_TITLE_GRAB,
  clampAskDockFrame,
  type AskDockViewport,
} from './zenithAskDockFrame'

const baseVp = (over: Partial<AskDockViewport> = {}): AskDockViewport => ({
  vw: 390,
  vh: 844,
  offsetLeft: 0,
  offsetTop: 0,
  safeTop: 59,
  safeBottom: 34,
  safeLeft: 0,
  safeRight: 0,
  ...over,
})

describe('clampAskDockFrame', () => {
  it('keeps the dock below the iOS safe-area top', () => {
    const frame = clampAskDockFrame(20, 0, 360, 400, true, baseVp())
    expect(frame.y).toBeGreaterThanOrEqual(59 + 8)
  })

  it('never lets the title grab strip leave the visible viewport', () => {
    const vp = baseVp()
    const frame = clampAskDockFrame(20, -400, 360, 500, true, vp)
    expect(frame.y + ASK_DOCK_TITLE_GRAB).toBeLessThanOrEqual(vp.offsetTop + vp.vh)
    expect(frame.y).toBeGreaterThanOrEqual(vp.offsetTop + vp.safeTop + 8)
  })

  it('clamps into the visualViewport when iOS zooms the keyboard', () => {
    const vp = baseVp({ offsetTop: 120, vh: 420 })
    const frame = clampAskDockFrame(10, 0, 360, 380, true, vp)
    expect(frame.y).toBeGreaterThanOrEqual(vp.offsetTop + vp.safeTop + 8)
    expect(frame.y + ASK_DOCK_TITLE_GRAB).toBeLessThanOrEqual(vp.offsetTop + vp.vh)
  })
})
