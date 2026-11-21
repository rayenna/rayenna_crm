import { useEffect, useState } from 'react'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Ease-out count from 0 → target once when `enabled` becomes true. */
export function useCountUp(target: number, enabled: boolean, durationMs = 900): number {
  const [value, setValue] = useState(() => (enabled ? 0 : target))

  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    if (prefersReducedMotion() || !Number.isFinite(target) || target <= 0) {
      setValue(target)
      return
    }

    let frame = 0
    const start = performance.now()
    setValue(0)

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) frame = window.requestAnimationFrame(tick)
      else setValue(target)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [target, enabled, durationMs])

  return value
}
