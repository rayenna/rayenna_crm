export const PAYMENT_COLLECTION_DATE_FIELDS = [
  'advanceReceivedDate',
  'payment1Date',
  'payment2Date',
  'payment3Date',
  'lastPaymentDate',
] as const

export type PaymentCollectionDateField = (typeof PAYMENT_COLLECTION_DATE_FIELDS)[number]

export const PAYMENT_COLLECTION_DATE_LABELS: Record<PaymentCollectionDateField, string> = {
  advanceReceivedDate: 'Advance Received Date',
  payment1Date: 'Payment 1 Date',
  payment2Date: 'Payment 2 Date',
  payment3Date: 'Payment 3 Date',
  lastPaymentDate: 'Last Payment Date',
}

/** `type="date"` max value for today in the user's local timezone (YYYY-MM-DD). */
export function paymentCollectionDateInputMax(): string {
  const today = startOfLocalDay()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfLocalDay(ref = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
}

/** Parse a date input value (YYYY-MM-DD) in local time. */
export function parsePaymentCollectionDateInput(value: string): Date | null {
  const trimmed = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }
  return date
}

export function isFuturePaymentCollectionDate(value: string): boolean {
  const date = parsePaymentCollectionDateInput(value)
  if (!date) return false
  return date.getTime() > startOfLocalDay().getTime()
}

/** True when the date is strictly more than one calendar month before today. */
export function isPaymentCollectionDateOlderThanOneMonth(value: string): boolean {
  const date = parsePaymentCollectionDateInput(value)
  if (!date) return false
  const cutoff = startOfLocalDay()
  cutoff.setMonth(cutoff.getMonth() - 1)
  return date.getTime() < cutoff.getTime()
}

export function formatPaymentCollectionDateLabel(value: string): string {
  const date = parsePaymentCollectionDateInput(value)
  if (!date) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function normalizePaymentCollectionDateValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  const fromInput = parsePaymentCollectionDateInput(trimmed)
  if (fromInput) {
    const y = fromInput.getFullYear()
    const m = String(fromInput.getMonth() + 1).padStart(2, '0')
    const d = String(fromInput.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return trimmed
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function validatePaymentCollectionDates(
  values: Record<string, unknown>,
  options?: { unchangedValues?: Record<string, unknown> },
): { errors: string[]; staleConfirmations: string[] } {
  const errors: string[] = []
  const staleConfirmations: string[] = []

  for (const field of PAYMENT_COLLECTION_DATE_FIELDS) {
    const raw = values[field]
    if (raw === undefined || raw === null || raw === '') continue

    const value = String(raw).trim()
    if (!value) continue

    const label = PAYMENT_COLLECTION_DATE_LABELS[field]
    const normalized = normalizePaymentCollectionDateValue(value)
    if (isFuturePaymentCollectionDate(normalized)) {
      errors.push(`${label} cannot be a future date.`)
      continue
    }

    const previous = normalizePaymentCollectionDateValue(options?.unchangedValues?.[field])
    const changed = !options?.unchangedValues || normalized !== previous
    if (changed && isPaymentCollectionDateOlderThanOneMonth(normalized)) {
      staleConfirmations.push(`${label}: ${formatPaymentCollectionDateLabel(normalized)}`)
    }
  }

  return { errors, staleConfirmations }
}

export function buildStalePaymentDateConfirmMessage(lines: string[]): string {
  return [
    'The following payment dates are more than one month in the past.',
    'Please check that each date is accurate before saving.',
    '',
    ...lines.map((line) => `• ${line}`),
    '',
    'Continue with these dates?',
  ].join('\n')
}
