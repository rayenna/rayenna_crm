/** Fixed Zenith bottom tab bar height (see `zenith.css` `.zenith-mobile-bottom-nav`). */
export const ZENITH_MOBILE_BOTTOM_NAV_HEIGHT_PX = 58

/** Toast / FAB offset above bottom nav + safe area (matches sticky actions in zenith.css). */
export const ZENITH_MOBILE_ABOVE_NAV_BOTTOM = `calc(${ZENITH_MOBILE_BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 12px)`

/** Second stacked toast (~52px) above the first. */
export const ZENITH_MOBILE_ABOVE_NAV_BOTTOM_STACKED = `calc(${ZENITH_MOBILE_BOTTOM_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 68px)`
