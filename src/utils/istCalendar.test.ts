import { describe, expect, it } from 'vitest'
import { calculateFYInIst, istMonthBoundsForFyMonth } from './istCalendar'

describe('calculateFYInIst', () => {
  it('puts 31 Mar 2025 18:30 UTC (1 Apr IST) in FY 2025-26', () => {
    expect(calculateFYInIst(new Date('2025-03-31T18:30:00.000Z'))).toBe('2025-26')
  })

  it('puts 31 Mar 2025 18:29 UTC (still 31 Mar IST) in FY 2024-25', () => {
    expect(calculateFYInIst(new Date('2025-03-31T18:29:00.000Z'))).toBe('2024-25')
  })
})

describe('istMonthBoundsForFyMonth', () => {
  it('April of FY 2024-25 is 1 Apr 2024 00:00 IST through end of April IST', () => {
    const { start, end } = istMonthBoundsForFyMonth(2024, 4)
    expect(start.toISOString()).toBe('2024-03-31T18:30:00.000Z')
    expect(end.toISOString()).toBe('2024-04-30T18:29:59.999Z')
  })
})
