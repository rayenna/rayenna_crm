/**
 * Support ticket daily-queue rules.
 * KEEP IN SYNC with src/utils/supportTicketQueue.ts
 */

/** Open tickets with no next follow-up date are overdue after this many days idle. */
export const SUPPORT_TICKET_STALE_DAYS = 7

/** Default next follow-up when creating or logging an activity. */
export const DEFAULT_FOLLOW_UP_OFFSET_DAYS = 3

export type TicketQueueActivity = {
  createdAt: Date | string
  followUpDate?: Date | string | null
}

export type TicketQueueInput = {
  status: string
  createdAt: Date | string
  source?: string | null
  activities?: TicketQueueActivity[] | null
}

export function utcYmd(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString().slice(0, 10)
}

export function defaultNextFollowUpYmd(
  from: Date = new Date(),
  offsetDays: number = DEFAULT_FOLLOW_UP_OFFSET_DAYS,
): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getLatestTicketActivity<T extends TicketQueueActivity>(
  activities: T[] | undefined | null,
): T | null {
  if (!activities?.length) return null
  return [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]
}

export function ticketNextFollowUpDate(ticket: TicketQueueInput): Date | null {
  const latest = getLatestTicketActivity(ticket.activities)
  if (!latest?.followUpDate) return null
  return new Date(latest.followUpDate)
}

export function isSolarHubTicket(source: string | null | undefined): boolean {
  return source === 'CONSUMER_APP'
}

export function isSupportTicketOverdue(ticket: TicketQueueInput, now: Date = new Date()): boolean {
  if (ticket.status === 'CLOSED') return false
  const latest = getLatestTicketActivity(ticket.activities)
  if (latest?.followUpDate) {
    return utcYmd(latest.followUpDate) < utcYmd(now)
  }
  const lastTouch = latest?.createdAt ?? ticket.createdAt
  const days = (now.getTime() - new Date(lastTouch).getTime()) / 86_400_000
  return days >= SUPPORT_TICKET_STALE_DAYS
}

/** Overdue first, then Solar Hub, then oldest open. */
export function compareSupportTicketQueue(a: TicketQueueInput, b: TicketQueueInput): number {
  const ao = isSupportTicketOverdue(a) ? 0 : 1
  const bo = isSupportTicketOverdue(b) ? 0 : 1
  if (ao !== bo) return ao - bo
  const ah = isSolarHubTicket(a.source) ? 0 : 1
  const bh = isSolarHubTicket(b.source) ? 0 : 1
  if (ah !== bh) return ah - bh
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}

export function supportTicketMatchesSearch(
  ticket: {
    ticketNumber: string
    title: string
    project?: { slNo?: number; customer?: { customerName?: string | null } | null } | null
    hubUsername?: string | null
  },
  rawQuery: string,
): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const sl = ticket.project?.slNo != null ? String(ticket.project.slNo) : ''
  const hay = [
    ticket.ticketNumber,
    ticket.title,
    sl,
    ticket.project?.customer?.customerName ?? '',
    ticket.hubUsername ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export function supportTicketMyDayContent(ticket: { ticketNumber: string; title: string }): string {
  return `Follow up ticket ${ticket.ticketNumber} — ${ticket.title}`
}

export function supportTicketProjectLabel(ticket: {
  project?: { slNo?: number; customer?: { customerName?: string | null } | null } | null
}): string | null {
  if (!ticket.project) return null
  const name = ticket.project.customer?.customerName?.trim() || ''
  const sl = ticket.project.slNo != null ? `#${ticket.project.slNo}` : ''
  return `${sl} ${name}`.trim() || null
}
