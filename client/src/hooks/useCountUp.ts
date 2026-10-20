import { useEffect, useRef, useState } from 'react'

/** Zenith KPI tiles: short tween from the previous value, not a reset to 0. */
export const ZENITH_KPI_COUNT_UP_MS = 400

/**
 * Animates from the last displayed value toward `target` over `duration` ms with ease-out cubic.
 * First mount still counts from 0; filter / refetch changes tween from the previous number.
 */
export function useCountUp(target: number, duration = ZENITH_KPI_COUNT_UP_MS, decimals = 0) {
  const safeTarget = Number.isFinite(target) ? target : 0
  const [value, setValue] = useState(0)
  const valueRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    const from = valueRef.current
    if (from === safeTarget) {
      setValue(safeTarget)
      return
    }

    let start = 0
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      const raw = from + (safeTarget - from) * eased
      const next = decimals > 0 ? Number(raw.toFixed(decimals)) : Math.floor(raw)
      valueRef.current = next
      setValue(next)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        valueRef.current = safeTarget
        setValue(decimals > 0 ? Number(safeTarget.toFixed(decimals)) : Math.floor(safeTarget))
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [safeTarget, duration, decimals])

  return value
}
