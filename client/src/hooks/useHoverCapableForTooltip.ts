import { useEffect, useState } from 'react'

/** True when the device is suited to hover tooltips (desktop / trackpad with fine pointer). */
export function useHoverCapableForTooltip(): boolean {
  const [ok, setOk] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  })
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const fn = () => setOk(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return ok
}
