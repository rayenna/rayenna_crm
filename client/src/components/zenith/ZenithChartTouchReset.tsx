import { useEffect, useState, type ReactNode } from 'react'
import { ZENITH_CHARTS_TOUCH_RESET_EVENT } from '../../utils/zenithEvents'

/**
 * Remounts chart children when the quick action drawer closes so Recharts tooltips / active
 * labels do not stick on touch. (A document-level touch listener would remount on every scroll.)
 */
export default function ZenithChartTouchReset({
  children,
  className = 'w-full min-w-0',
}: {
  children: (touchResetKey: number) => ReactNode
  className?: string
}) {
  const [k, setK] = useState(0)

  useEffect(() => {
    const inc = () => setK((n) => n + 1)
    window.addEventListener(ZENITH_CHARTS_TOUCH_RESET_EVENT, inc)
    return () => window.removeEventListener(ZENITH_CHARTS_TOUCH_RESET_EVENT, inc)
  }, [])

  return <div className={className}>{children(k)}</div>
}
