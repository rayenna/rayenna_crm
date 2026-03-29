import { useEffect, useRef, useState } from 'react'

/**
 * Animates a numeric display from 0 (or `start`) toward `end` on mount / when `end` changes.
 */
export function useCountUp(
  end: number,
  options?: { durationMs?: number; start?: number; decimals?: number; enabled?: boolean },
) {
  const durationMs = options?.durationMs ?? 900
  const startVal = options?.start ?? 0
  const decimals = options?.decimals ?? 0
  const enabled = options?.enabled !== false

  const [value, setValue] = useState(enabled ? startVal : end)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setValue(end)
      return
    }
    startTimeRef.current = null
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
    }

    const tick = (now: number) => {
      if (startTimeRef.current == null) startTimeRef.current = now
      const t = Math.min(1, (now - startTimeRef.current) / durationMs)
      const eased = 1 - (1 - t) ** 3
      const v = startVal + (end - startVal) * eased
      setValue(decimals > 0 ? Number(v.toFixed(decimals)) : Math.round(v))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [end, startVal, durationMs, decimals, enabled])

  return value
}
