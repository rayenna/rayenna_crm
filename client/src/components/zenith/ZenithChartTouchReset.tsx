import { useEffect, useState, type ReactNode } from 'react'
import {
  ZENITH_CHARTS_TOUCH_RESET_EVENT,
  type ZenithChartsTouchResetDetail,
} from '../../utils/zenithEvents'
import type { ZenithChartGroup } from '../../constants/zenithChartGroups'

/**
 * Remounts chart children when a matching quick drawer closes so Recharts tooltips
 * do not stick on touch. Only the chart group that opened the drawer is reset.
 */
export default function ZenithChartTouchReset({
  children,
  className = 'w-full min-w-0',
  chartGroup,
}: {
  children: (touchResetKey: number) => ReactNode
  className?: string
  chartGroup: ZenithChartGroup
}) {
  const [k, setK] = useState(0)

  useEffect(() => {
    const handler = (e: Event) => {
      const group = (e as CustomEvent<ZenithChartsTouchResetDetail>).detail?.chartGroup
      if (group === chartGroup) setK((n) => n + 1)
    }
    window.addEventListener(ZENITH_CHARTS_TOUCH_RESET_EVENT, handler)
    return () => window.removeEventListener(ZENITH_CHARTS_TOUCH_RESET_EVENT, handler)
  }, [chartGroup])

  return <div className={className}>{children(k)}</div>
}
