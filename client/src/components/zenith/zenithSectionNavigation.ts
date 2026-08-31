import { UserRole } from '../../types'
import { ZENITH_PRIORITY_TARGETS } from '../../utils/zenithPriorityItems'
import type { ZenithMobileTab } from './zenithMobileNav'

export const ZENITH_EXPAND_PANEL_EVENT = 'zenith-expand-panel'

/** Panels that start collapsed and must open before scroll (Your Focus accordions). */
export const ZENITH_COLLAPSIBLE_SECTION_IDS = new Set<string>([
  ZENITH_PRIORITY_TARGETS.paymentRadar,
])

export function resolveZenithSectionMobileTab(
  targetId: string,
  role: UserRole | undefined,
): ZenithMobileTab | null {
  if (!role) return null

  switch (targetId) {
    case ZENITH_PRIORITY_TARGETS.hitList:
    case ZENITH_PRIORITY_TARGETS.attention:
      if (
        role === UserRole.SALES ||
        role === UserRole.MANAGEMENT ||
        role === UserRole.ADMIN
      ) {
        return 'overview'
      }
      if (role === UserRole.OPERATIONS) return 'overview'
      return null

    case ZENITH_PRIORITY_TARGETS.paymentRadar:
    case ZENITH_PRIORITY_TARGETS.focus:
      if (
        role === UserRole.FINANCE ||
        role === UserRole.OPERATIONS ||
        role === UserRole.SALES ||
        role === UserRole.MANAGEMENT ||
        role === UserRole.ADMIN
      ) {
        return 'pipeline'
      }
      return null

    case ZENITH_PRIORITY_TARGETS.funnel:
      return 'pipeline'

    default:
      return null
  }
}

export function requestZenithPanelExpand(targetId: string): void {
  if (!ZENITH_COLLAPSIBLE_SECTION_IDS.has(targetId)) return
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(ZENITH_EXPAND_PANEL_EVENT, { detail: { id: targetId } }),
  )
}

const FLASH_CLASS = 'zenith-section-nav-flash'

export function flashZenithSection(targetId: string): void {
  const el = document.getElementById(targetId)
  if (!el) return
  el.classList.remove(FLASH_CLASS)
  // Force reflow so repeated clicks re-trigger animation
  void el.offsetWidth
  el.classList.add(FLASH_CLASS)
  const remove = () => el.classList.remove(FLASH_CLASS)
  el.addEventListener('animationend', remove, { once: true })
  window.setTimeout(remove, 1600)
}
