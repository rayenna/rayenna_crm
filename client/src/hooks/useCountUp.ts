import { useEffect, useRef, useState } from 'react'

/**
 * Animates from 0 toward `target` over `duration` ms with ease-out cubic.
 * Re-runs when `target` changes (e.g. Zenith date filters).
 */
export function useCountUp(target: number, duration = 1200, decimals = 0) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    setValue(0)

    let start = 0
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      const raw = eased * target
      setValue(decimals > 0 ? Number(raw.toFixed(decimals)) : Math.floor(raw))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, decimals])

  return value
}
