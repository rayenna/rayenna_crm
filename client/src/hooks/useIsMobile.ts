import { useEffect, useState } from 'react'

const MOBILE_MAX = 767

/** True when viewport width is &lt; 768px (matches VictoryToast / Leaderboard spec). */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_MAX : false,
  )
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= MOBILE_MAX)
    handler()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return mobile
}
