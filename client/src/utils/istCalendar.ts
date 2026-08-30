/** India calendar helpers. KEEP IN SYNC with src/utils/istCalendar.ts */

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
