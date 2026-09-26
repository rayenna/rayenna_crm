import { useEffect, useState } from 'react'
import { SOLAR_HUB_CARDS_MAX_MQ } from './solarHubListViewport'

/**
 * True when viewport prefers Solar Hub card lists (≤743px).
 */
export function useSolarHubNarrowList(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(SOLAR_HUB_CARDS_MAX_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(SOLAR_HUB_CARDS_MAX_MQ)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return narrow
}
