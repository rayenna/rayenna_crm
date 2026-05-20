import type { ZenithMobileTab } from './zenithMobileNav'

/** Whether a Zenith section should render on mobile simplified (tab) layout. */
export function isZenithMobileTabActive(
  mobileTab: ZenithMobileTab | null | undefined,
  section: ZenithMobileTab,
): boolean {
  if (mobileTab == null) return true
  return mobileTab === section
}
