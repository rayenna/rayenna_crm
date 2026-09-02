/** Payment radar project name colours (pending / partial / paid). */

export const PAYMENT_RADAR_NAME_PENDING = 'var(--accent-blue)'
export const PAYMENT_RADAR_NAME_PARTIAL = 'var(--accent-gold)'
export const PAYMENT_RADAR_NAME_FULLY_PAID = 'var(--accent-teal)'

export function paymentRadarProjectNameColor(paymentStatus: string | undefined): string {
  const s = String(paymentStatus ?? 'PENDING').toUpperCase()
  if (s === 'FULLY_PAID') return PAYMENT_RADAR_NAME_FULLY_PAID
  if (s === 'PARTIAL') return PAYMENT_RADAR_NAME_PARTIAL
  if (s === 'PENDING') return PAYMENT_RADAR_NAME_PENDING
  return 'var(--text-primary)'
}
