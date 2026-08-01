import { format, parseISO } from 'date-fns'
import type { Customer, Project } from '../types'
import { parseCustomerStringList } from './customerContactFields'
import { getCustomerDisplayName } from './customerRecord'
import { loadBusinessContactsFromCustomer } from './customContacts'

function primaryPhoneFromCustomer(customer: Customer | null | undefined): string {
  if (!customer) return ''
  const fromNumbers = parseCustomerStringList(customer.contactNumbers)
  if (fromNumbers[0]) return fromNumbers[0]
  const contacts = loadBusinessContactsFromCustomer(customer)
  for (const c of contacts) {
    const phone = c.phones.find((p) => p.trim())
    if (phone) return phone.trim()
  }
  return ''
}

function primaryEmailFromCustomer(customer: Customer | null | undefined): string {
  if (!customer) return ''
  const fromEmail = parseCustomerStringList(customer.email)
  if (fromEmail[0]) return fromEmail[0]
  const contacts = loadBusinessContactsFromCustomer(customer)
  for (const c of contacts) {
    const email = c.emails.find((e) => e.trim())
    if (email) return email.trim()
  }
  return ''
}

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

/** Map a CRM Project into reminder template fields (Project Detail / shared drafter). */
export function projectToReminderTemplate(project: Project): ReminderTemplateProject {
  const totalReceived =
    (Number(project.advanceReceived) || 0) +
    (Number(project.payment1) || 0) +
    (Number(project.payment2) || 0) +
    (Number(project.payment3) || 0) +
    (Number(project.lastPayment) || 0)
  const order = Number(project.projectCost) || 0
  const balance =
    typeof project.balanceAmount === 'number' && Number.isFinite(project.balanceAmount)
      ? Math.max(0, project.balanceAmount)
      : Math.max(0, order - totalReceived)

  const displayName = project.customer
    ? getCustomerDisplayName(project.customer)
    : ''
  const phone = primaryPhoneFromCustomer(project.customer)
  const email = primaryEmailFromCustomer(project.customer)

  return {
    projectId: project.id,
    customerName: displayName,
    customer_name: displayName,
    customerPhone: phone,
    customer_phone: phone,
    customerEmail: email,
    customer_email: email,
    amount: balance,
    balanceAmount: balance,
    amount_outstanding: balance,
    projectCost: order,
    orderValue: order,
    totalAmountReceived: totalReceived,
    amountPaid: totalReceived,
    confirmationDate: project.confirmationDate ?? '',
    confirmed_date: project.confirmationDate ?? '',
  }
}

export function buildPaymentReminderRemark(
  channel: 'whatsapp' | 'email',
  project: ReminderTemplateProject,
): string {
  const amount = formatINR(getOutstanding(project))
  const via = channel === 'whatsapp' ? 'WhatsApp' : 'Email'
  return `Payment reminder drafted/opened via ${via} — outstanding ${amount}. (Client app send; not logged as delivered.)`
}

/** Whether Project Detail should offer the payment reminder drafter. */
export function projectAllowsPaymentReminder(project: Project): boolean {
  const status = project.projectStatus
  if (
    status === 'LEAD' ||
    status === 'SITE_SURVEY' ||
    status === 'PROPOSAL' ||
    status === 'LOST'
  ) {
    return false
  }
  const order = Number(project.projectCost) || 0
  if (order <= 0) return false
  const outstanding = getOutstanding(projectToReminderTemplate(project))
  return outstanding > 0
}
