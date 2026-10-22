import { describe, expect, it } from 'vitest'
import {
  defaultSalesProbabilityForStatus,
  isSalesProbabilityLocked,
  resolveSalesProbabilityForSave,
} from './salesProbability'

describe('salesProbability (client)', () => {
  it('defaults Confirmation to 75% and Installation to 100%', () => {
    expect(defaultSalesProbabilityForStatus('CONFIRMED')).toBe(75)
    expect(defaultSalesProbabilityForStatus('UNDER_INSTALLATION')).toBe(100)
    expect(isSalesProbabilityLocked('UNDER_INSTALLATION')).toBe(false)
    expect(isSalesProbabilityLocked('COMPLETED')).toBe(true)
  })

  it('lets the user keep a custom early-stage value', () => {
    expect(
      resolveSalesProbabilityForSave({
        currentStatus: 'SITE_SURVEY',
        nextStatus: 'SITE_SURVEY',
        requested: 25,
      }),
    ).toEqual({ ok: true, value: 25 })
  })
})
