import { format, parseISO } from 'date-fns'

/** Loose shape from Zenith Payment Radar row → reminder copy + wa.me/mailto */
export type ReminderTemplateProject = Record<string, unknown>

function pickStr(p: ReminderTemplateProject, keys: string[]): string {
  for (const k of keys) {
    const v = p[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function pickNum(p: ReminderTemplateProject, keys: string[]): number {
  for (const k of keys) {
    const v = p[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

export function formatDateForReminder(isoOrDate: string | undefined | null): string {
  if (!isoOrDate) return '—'
  try {
    const d = parseISO(isoOrDate.includes('T') ? isoOrDate : `${isoOrDate}T00:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return format(d, 'd MMM yyyy')
  } catch {
    return '—'
  }
}

export function getOutstanding(project: ReminderTemplateProject): number {
  const direct = pickNum(project, ['amount_outstanding', 'amount', 'balanceAmount'])
  if (direct > 0) return direct
  const order = pickNum(project, ['order_value', 'orderValue', 'deal_value', 'projectCost'])
  const paid = pickNum(project, ['amount_paid', 'amountPaid', 'totalAmountReceived'])
  return Math.max(0, order - paid)
}

export function getDaysSinceConfirmed(project: ReminderTemplateProject): number {
  const d = pickNum(project, ['days_overdue', 'daysOverdue', 'daysSinceConfirmed'])
  if (d > 0) return Math.floor(d)
  const iso = pickStr(project, ['confirmed_date', 'dueSince', 'confirmationDate', 'order_date', 'orderDate'])
  if (!iso) return 0
  try {
    const start = parseISO(iso.includes('T') ? iso : `${iso}T00:00:00`)
    if (Number.isNaN(start.getTime())) return 0
    const days = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  } catch {
    return 0
  }
}

export function getWhatsAppMessage(project: ReminderTemplateProject): string {
  const name = pickStr(project, ['customer_name', 'customerName', 'name']) || 'Customer'
  const amount = formatINR(getOutstanding(project))
  const orderDate = formatDateForReminder(
    pickStr(project, ['confirmed_date', 'dueSince', 'confirmationDate', 'order_date', 'orderDate']) || null,
  )
  const days = getDaysSinceConfirmed(project)
  const companyName = 'Rayenna Energy'

  return `Dear ${name},

This is a friendly reminder from ${companyName} regarding your solar installation payment.

Outstanding Amount: ${amount}
Order Date: ${orderDate}
Days Pending: ${days} days

Kindly arrange the payment at your earliest convenience. Please contact us if you have any queries.

Thank you,
${companyName} Team`
}

export function getEmailSubject(project: ReminderTemplateProject): string {
  const name = pickStr(project, ['customer_name', 'customerName', 'name']) || 'Customer'
  const amount = formatINR(getOutstanding(project))
  return `Payment Reminder — ${name} — ${amount} Outstanding`
}

export function getEmailBody(project: ReminderTemplateProject): string {
  const name = pickStr(project, ['customer_name', 'customerName', 'name']) || 'Customer'
  const amount = formatINR(getOutstanding(project))
  const orderDate = formatDateForReminder(
    pickStr(project, ['confirmed_date', 'dueSince', 'confirmationDate', 'order_date', 'orderDate']) || null,
  )
  const days = getDaysSinceConfirmed(project)
  const companyName = 'Rayenna Energy'

  return `Dear ${name},

I hope this message finds you well.

This is a payment reminder for your solar installation project with ${companyName}.

Outstanding Amount: ${amount}
Order Confirmed: ${orderDate}
Days Pending: ${days} days

We would appreciate if you could arrange the payment at your earliest convenience.

For any queries, please feel free to reach out to us.

Warm regards,
${companyName} Team`
}
