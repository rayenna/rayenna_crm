const PAYMENT_COLLECTION_DATE_FIELDS = [
  'advanceReceivedDate',
  'payment1Date',
  'payment2Date',
  'payment3Date',
  'lastPaymentDate',
] as const

function startOfUtcDay(ref = new Date()): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()))
}

function toUtcDayMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** Reject payment collection dates that fall after today (UTC calendar day). */
export function assertPaymentCollectionDatesNotFuture(
  body: Record<string, unknown>,
): { field: string; label: string } | null {
  const labels: Record<string, string> = {
    advanceReceivedDate: 'Advance Received Date',
    payment1Date: 'Payment 1 Date',
    payment2Date: 'Payment 2 Date',
    payment3Date: 'Payment 3 Date',
    lastPaymentDate: 'Last Payment Date',
  }

  const todayMs = toUtcDayMs(startOfUtcDay())

  for (const field of PAYMENT_COLLECTION_DATE_FIELDS) {
    if (!(field in body)) continue
    const raw = body[field]
    if (raw === undefined || raw === null || raw === '' || raw === 'null' || raw === '0') continue

    const date = raw instanceof Date ? raw : new Date(String(raw))
    if (Number.isNaN(date.getTime())) continue

    if (toUtcDayMs(date) > todayMs) {
      return { field, label: labels[field] ?? field }
    }
  }

  return null
}
