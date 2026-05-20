import type { LucideIcon } from 'lucide-react'
import { BarChart3, LayoutGrid, MoreHorizontal, Target, TrendingUp } from 'lucide-react'
import { UserRole } from '../../types'

export type ZenithMobileTab = 'overview' | 'pipeline' | 'charts' | 'more'

export type ZenithMobileNavItem = {
  id: ZenithMobileTab
  label: string
  icon: LucideIcon
}

export function getZenithMobileNavItems(
  role: UserRole,
  opts?: { showHitList?: boolean },
): ZenithMobileNavItem[] {
  const showHit =
    opts?.showHitList ??
    (role === UserRole.SALES || role === UserRole.MANAGEMENT || role === UserRole.ADMIN)

  switch (role) {
    case UserRole.SALES:
    case UserRole.MANAGEMENT:
    case UserRole.ADMIN:
      return [
        { id: 'overview', label: showHit ? 'Today' : 'KPIs', icon: TrendingUp },
        { id: 'pipeline', label: 'Pipeline', icon: Target },
        { id: 'charts', label: 'Charts', icon: BarChart3 },
        { id: 'more', label: 'More', icon: MoreHorizontal },
      ]
    case UserRole.OPERATIONS:
      return [
        { id: 'overview', label: 'KPIs', icon: TrendingUp },
        { id: 'pipeline', label: 'Ops', icon: Target },
        { id: 'charts', label: 'Charts', icon: BarChart3 },
      ]
    case UserRole.FINANCE:
      return [
        { id: 'overview', label: 'KPIs', icon: TrendingUp },
        { id: 'pipeline', label: 'Payments', icon: Target },
        { id: 'charts', label: 'Charts', icon: BarChart3 },
        { id: 'more', label: 'More', icon: MoreHorizontal },
      ]
    default:
      return [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'pipeline', label: 'Pipeline', icon: Target },
        { id: 'charts', label: 'Charts', icon: BarChart3 },
      ]
  }
}

/** First scroll anchor when landing on a mobile tab (desktop ignores tabs). */
export function zenithMobileTabScrollId(
  tab: ZenithMobileTab,
  role: UserRole,
  opts?: { showHitList?: boolean },
): string {
  const showHit =
    opts?.showHitList ??
    (role === UserRole.SALES || role === UserRole.MANAGEMENT || role === UserRole.ADMIN)

  switch (tab) {
    case 'overview':
      if (
        showHit &&
        (role === UserRole.SALES ||
          role === UserRole.MANAGEMENT ||
          role === UserRole.ADMIN)
      ) {
        return 'zenith-hit-list'
      }
      return 'zenith-kpis'
    case 'pipeline':
      return role === UserRole.FINANCE ? 'zenith-focus' : 'zenith-funnel'
    case 'charts':
      return 'zenith-charts'
    case 'more':
      if (role === UserRole.FINANCE || role === UserRole.OPERATIONS) {
        return 'zenith-segments'
      }
      return 'zenith-segments'
    default:
      return 'zenith-kpis'
  }
}
