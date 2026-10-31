/** Stay compact until this much spare width exists, so the bar does not flicker. */
export const NAV_EXPAND_SLACK_PX = 48;
/** Switch to hamburger as soon as the desktop cluster would overflow. */
export const NAV_FIT_SLACK_PX = 8;

/**
 * Desktop vs hamburger: use the hamburger whenever the full menu cannot
 * sit in one row. Hysteresis avoids flipping on every pixel of resize.
 */
export function shouldUseCompactNav(
  needed: number,
  available: number,
  currentlyCompact: boolean,
): boolean {
  if (!Number.isFinite(needed) || !Number.isFinite(available) || available <= 0) {
    return true;
  }
  if (needed > available - NAV_FIT_SLACK_PX) return true;
  if (currentlyCompact && needed <= available - NAV_EXPAND_SLACK_PX) return false;
  return currentlyCompact;
}
