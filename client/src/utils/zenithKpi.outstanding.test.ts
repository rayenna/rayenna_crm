import { describe, expect, it } from 'vitest'
import { UserRole } from '../types'
import { buildExecutiveZenithKpis } from '../components/zenith/zenithKpi'

describe('buildExecutiveZenithKpis outstanding', () => {
  const paymentBuckets = [
    { status: 'N/A', count: 2, totalValue: 0, outstanding: 0 },
    { status: 'PENDING', count: 1, totalValue: 500000, outstanding: 200000 },
    { status: 'PARTIAL', count: 2, totalValue: 800000, outstanding: 150000 },
    { status: 'FULLY_PAID', count: 3, totalValue: 900000, outstanding: 0 },
  ]

  it('sums PENDING+PARTIAL outstanding for Sales', () => {
    const kpis = buildExecutiveZenithKpis(
      UserRole.SALES,
      {
        revenue: { totalCapacity: 10, totalRevenue: 100 },
        totalPipeline: 200,
        totalProfit: 50,
        projectsByPaymentStatus: paymentBuckets,
        availingLoanCount: 0,
        projectValueProfitByFY: [],
      },
      ['2025-26'],
    )
    const out = kpis.find((k) => k.key === 'outstanding')
    expect(out?.value).toBe(350000)
    expect(out?.format).toBe('currency')
    expect(kpis.some((k) => k.key === 'lost')).toBe(false)
  })

  it('includes outstanding after lost for Admin', () => {
    const kpis = buildExecutiveZenithKpis(
      UserRole.ADMIN,
      {
        sales: { totalCapacity: 10 },
        finance: { totalValue: 100, totalProfit: 50 },
        totalPipeline: 200,
        projectsByPaymentStatus: paymentBuckets,
        lostProjectsCount: 4,
        availingLoanCount: 1,
        projectValueProfitByFY: [],
      },
      ['2025-26'],
    )
    const keys = kpis.map((k) => k.key)
    expect(keys).toContain('lost')
    expect(keys[keys.length - 1]).toBe('outstanding')
    expect(kpis.find((k) => k.key === 'outstanding')?.value).toBe(350000)
  })

  it('prefers totalOutstanding API when provided', () => {
    const kpis = buildExecutiveZenithKpis(
      UserRole.MANAGEMENT,
      {
        sales: { totalCapacity: 1 },
        finance: { totalValue: 1, totalProfit: 1 },
        totalPipeline: 1,
        totalOutstanding: 999,
        projectsByPaymentStatus: paymentBuckets,
        lostProjectsCount: 0,
        projectValueProfitByFY: [],
      },
      [],
    )
    expect(kpis.find((k) => k.key === 'outstanding')?.value).toBe(999)
  })

  it('uses pipeline plus lost order value for conversion (not 100% when lost ₹ exists)', () => {
    const kpis = buildExecutiveZenithKpis(
      UserRole.ADMIN,
      {
        sales: { totalCapacity: 10 },
        finance: { totalValue: 100, totalProfit: 50 },
        totalPipeline: 100,
        lostOrderValue: 100,
        lostProjectsCount: 12,
        projectsByPaymentStatus: paymentBuckets,
        availingLoanCount: 0,
        projectValueProfitByFY: [],
      },
      ['2025-26'],
    )
    expect(kpis.find((k) => k.key === 'conversion')?.value).toBe(50)
    expect(kpis.find((k) => k.key === 'pipeline')?.value).toBe(100)
  })
})
