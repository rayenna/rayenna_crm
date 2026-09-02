import type { CSSProperties } from 'react'
import {
  ZENITH_MOBILE_ABOVE_NAV_BOTTOM,
  ZENITH_MOBILE_ABOVE_NAV_BOTTOM_STACKED,
} from '../constants/zenithMobileNav'
import { useZenithNarrowLayout } from '../hooks/useZenithNarrowLayout'

const TOAST_SHELL: CSSProperties = {
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 6100,
  maxWidth: 'min(24rem, calc(100vw - 2rem))',
}

/** Inline toast position for Zenith quick drawers — clears bottom nav on tablet/phone. */
export function useZenithDrawerToastStyle(opts?: { stacked?: boolean }): CSSProperties {
  const narrow = useZenithNarrowLayout()
  const bottom = narrow
    ? opts?.stacked
      ? ZENITH_MOBILE_ABOVE_NAV_BOTTOM_STACKED
      : ZENITH_MOBILE_ABOVE_NAV_BOTTOM
    : opts?.stacked
      ? 72
      : 24
  return { ...TOAST_SHELL, bottom }
}
