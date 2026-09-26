import { useEffect, useState } from 'react'

/** Match Projects / Solar Hub — cards default below this width. */
export const LOST_DEALS_CARDS_MAX_MQ = '(max-width: 743px)'

/**
 * True when viewport prefers Lost Deals card list (≤743px).
 */
export function useLostDealsNarrowList(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(LOST_DEALS_CARDS_MAX_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(LOST_DEALS_CARDS_MAX_MQ)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return narrow
}
