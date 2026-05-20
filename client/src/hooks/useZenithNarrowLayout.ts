import { useEffect, useState } from 'react'

/** Zenith mobile/tablet layout breakpoint (matches Tailwind `lg` / zenith.css). */
export const ZENITH_NARROW_MQ = '(max-width: 1023px)'

export function useZenithNarrowLayout(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(ZENITH_NARROW_MQ).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(ZENITH_NARROW_MQ)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return narrow
}
