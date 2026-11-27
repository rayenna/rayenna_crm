import { PaymentStatus, type Project } from '../types'

/**
 * Same installment-routing rules as Finance Quick Drawer —
 * shared so Ask can record a payment note without opening the drawer.
 */
export function buildAskFinancePaymentBody(
  project: Pick<
    Project,
    | 'balanceAmount'
    | 'advanceReceived'
    | 'payment1'
    | 'payment2'
    | 'payment3'
    | 'lastPayment'
    | 'paymentStatus'
  >,
  add: number,
  paymentDateIso: string,
): Record<string, unknown> {
  const balance = Number(project.balanceAmount ?? 0)
  const prevAdv = Number(project.advanceReceived ?? 0)
  const p1 = Number(project.payment1 ?? 0)
  const p2 = Number(project.payment2 ?? 0)
  const p3 = Number(project.payment3 ?? 0)
  const prevLast = Number(project.lastPayment ?? 0)

  if (add >= balance) {
    return {
      lastPayment: prevLast + add,
      lastPaymentDate: paymentDateIso,
    }
  }

  if (project.paymentStatus === PaymentStatus.PENDING) {
    return {
      advanceReceived: prevAdv + add,
      advanceReceivedDate: paymentDateIso,
    }
  }

  if (prevAdv <= 0) {
    return {
      advanceReceived: add,
      advanceReceivedDate: paymentDateIso,
    }
  }
  if (p1 <= 0) {
    return { payment1: add, payment1Date: paymentDateIso }
  }
  if (p2 <= 0) {
    return { payment2: add, payment2Date: paymentDateIso }
  }
  if (p3 <= 0) {
    return { payment3: add, payment3Date: paymentDateIso }
  }
  return {
    payment3: p3 + add,
    payment3Date: paymentDateIso,
  }
}

export function todayIsoDateLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
