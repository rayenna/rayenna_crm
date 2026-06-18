const PAYMENT_TRACKING_FIELDS = [
  'advanceReceived',
  'advanceReceivedDate',
  'payment1',
  'payment1Date',
  'payment2',
  'payment2Date',
  'payment3',
  'payment3Date',
  'lastPayment',
  'lastPaymentDate',
] as const

/** True when the project update payload touches payment tracking fields. */
export function updateTouchesPaymentTracking(updateData: Record<string, unknown>): boolean {
  return PAYMENT_TRACKING_FIELDS.some((field) => updateData[field] !== undefined)
}
