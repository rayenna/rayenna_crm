import { describe, expect, it } from 'vitest'
import {
  dealExpectedValue,
  defaultSalesProbabilityForStatus,
  isSalesProbabilityLocked,
  resolveSalesProbabilityForSave,
} from './salesProbability'

describe('salesProbability (client)', () => {
  it('computes expected value from order value × Sales Probability', () => {
    expect(
      dealExpectedValue({
        projectCost: 200_000,
        salesProbability: 30,
        projectStatus: 'PROPOSAL',
      }),
    ).toBe(60_000)
  })

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
