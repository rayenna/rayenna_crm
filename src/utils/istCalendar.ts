/** India calendar helpers. KEEP IN SYNC with client/src/utils/istCalendar.ts */

export const IST_TIMEZONE = 'Asia/Kolkata'

export function calendarYmdInTimeZone(date: Date, timeZone: string = IST_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Indian FY label, e.g. 2024-25, using the calendar date in Asia/Kolkata. */
export function calculateFYInIst(date: Date | string | null | undefined): string | null {
  const d = toDate(date)
  if (!d) return null
  const ymd = calendarYmdInTimeZone(d)
  const [y, m] = ymd.split('-').map(Number)
  if (!y || !m) return null
  if (m >= 4) return `${y}-${String(y + 1).slice(-2)}`
  return `${y - 1}-${String(y).slice(-2)}`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Inclusive IST month window as UTC instants (for Prisma DateTime filters). */
export function istMonthInclusiveBounds(calendarYear: number, month1to12: number): { start: Date; end: Date } {
  const y = calendarYear
  const m = month1to12
  const start = new Date(`${y}-${pad2(m)}-01T00:00:00+05:30`)
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  const nextStart = new Date(`${nextY}-${pad2(nextM)}-01T00:00:00+05:30`)
  return { start, end: new Date(nextStart.getTime() - 1) }
}

export function istMonthBoundsForFyMonth(fyStartYear: number, month1to12: number): { start: Date; end: Date } {
  const year = month1to12 >= 1 && month1to12 <= 3 ? fyStartYear + 1 : fyStartYear
  return istMonthInclusiveBounds(year, month1to12)
}
