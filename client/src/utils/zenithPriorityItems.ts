import { UserRole } from '../types'

export type ZenithPrioritySeverity = 'critical' | 'warn' | 'neutral'

export type ZenithPriorityItem = {
  id: string
  label: string
  scrollTargetId: string
  severity?: ZenithPrioritySeverity
}

export const ZENITH_PRIORITY_TARGETS = {
  hitList: 'zenith-hit-list',
  attention: 'zenith-things-needing-attention',
  paymentRadar: 'zenith-payment-radar',
  focus: 'zenith-focus',
  funnel: 'zenith-funnel',
} as const

export function buildExecutivePriorityItems(args: {
  hitListCount: number
  hitListAllClear: boolean
  dataSenseCount: number
  brandGapCount: number
  overdueCount?: number
  role: UserRole
}): ZenithPriorityItem[] {
  const items: ZenithPriorityItem[] = []

  if (!args.hitListAllClear && args.hitListCount > 0) {
    items.push({
      id: 'hit-list',
      label: `${args.hitListCount} deal${args.hitListCount === 1 ? '' : 's'}`,
      scrollTargetId: ZENITH_PRIORITY_TARGETS.hitList,
      severity: 'critical',
    })
  }

  const reviewCount = args.dataSenseCount
  if (reviewCount > 0) {
    items.push({
      id: 'data-sense',
      label: `${reviewCount} review`,
      scrollTargetId: ZENITH_PRIORITY_TARGETS.attention,
      severity: 'warn',
    })
  } else if (args.brandGapCount > 0) {
    items.push({
      id: 'brand-gaps',
      label: `${args.brandGapCount} brand gap${args.brandGapCount === 1 ? '' : 's'}`,
      scrollTargetId: ZENITH_PRIORITY_TARGETS.attention,
      severity: 'warn',
    })
  }

  if (
    (args.role === UserRole.MANAGEMENT || args.role === UserRole.ADMIN) &&
    (args.overdueCount ?? 0) > 0
  ) {
    items.push({
      id: 'overdue',
      label: `${args.overdueCount} overdue`,
      scrollTargetId: ZENITH_PRIORITY_TARGETS.paymentRadar,
      severity: 'critical',
    })
  }

  return items
}

export function buildFinancePriorityItems(args: {
  overdueCount: number
  pendingPaymentCount: number
}): ZenithPriorityItem[] {
  const items: ZenithPriorityItem[] = []
  if (args.overdueCount > 0) {
    items.push({
      id: 'overdue',
      label: `${args.overdueCount} overdue`,
      scrollTargetId: ZENITH_PRIORITY_TARGETS.paymentRadar,
      severity: 'critical',
    })
  }
  if (args.pendingPaymentCount > 0) {
    items.push({
      id: 'pending-pay',
      label: `${args.pendingPaymentCount} pending pay`,
      scrollTargetId: ZENITH_PRIORITY_TARGETS.paymentRadar,
      severity: 'warn',
    })
  }
  return items
}

export function buildOperationsPriorityItems(args: {
  underInstallationCount: number
}): ZenithPriorityItem[] {
  if (args.underInstallationCount <= 0) return []
  return [
    {
      id: 'install',
      label: `${args.underInstallationCount} installing`,
      scrollTargetId: ZENITH_PRIORITY_TARGETS.focus,
      severity: 'neutral',
    },
  ]
}
