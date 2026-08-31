import { useEffect, useState } from 'react'

const SHORT_VIEWPORT_MQ = '(max-height: 800px)'

/** True on short laptop screens (e.g. 1366×768) — EliteBook layout tweaks. */
export function useZenithShortViewport(): boolean {
  const [short, setShort] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(SHORT_VIEWPORT_MQ).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(SHORT_VIEWPORT_MQ)
    const sync = () => setShort(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return short
}
