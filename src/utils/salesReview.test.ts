import { describe, expect, it } from 'vitest'
import {
  achievementFyColumns,
  buildSalesReview,
  forecastQuarterColumns,
  previousFyLabel,
  type SalesReviewProjectInput,
} from './salesReview'

const NOW = new Date('2026-10-29T06:30:00.000Z') // 12:00 IST 29 Oct 2026

function p(partial: Partial<SalesReviewProjectInput> & Pick<SalesReviewProjectInput, 'id'>): SalesReviewProjectInput {
  return {
    slNo: 1,
    projectStatus: 'LEAD',
    year: '2026-27',
    projectCost: 100000,
    grossProfit: 20000,
    expectedProfit: null,
    profitability: 20,
    salesProbability: 30,
    systemCapacity: 10,
    systemType: 'ON_GRID',
    type: 'SUBSIDY',
    confirmationDate: null,
    expectedCommissioningDate: null,
    availingLoan: false,
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'RAK Tower',
    customerType: 'APARTMENT',
    ...partial,
  }
}

describe('FY helpers', () => {
  it('steps back one Indian FY', () => {
    expect(previousFyLabel('2026-27')).toBe('2025-26')
    expect(previousFyLabel('2025-26')).toBe('2024-25')
  })

  it('uses two prior FYs plus current YTD on 29 Oct 2026', () => {
    const cols = achievementFyColumns(NOW)
    expect(cols.map((c) => c.label)).toEqual(['FY2024-25', 'FY2025-26', 'FY2026-27 YTD'])
    expect(cols[2].ytd).toBe(true)
  })

  it('forecast windows start at current Indian quarter', () => {
    const cols = forecastQuarterColumns(NOW)
    expect(cols.map((c) => c.shortLabel)).toEqual(['CQ', 'NQ', 'NQ+1', 'NQ+2'])
    expect(cols[0]).toMatchObject({ fy: '2026-27', quarter: 3, startYmd: '2026-10-01', endYmd: '2026-12-31' })
    expect(cols[1]).toMatchObject({ fy: '2026-27', quarter: 4, startYmd: '2027-01-01', endYmd: '2027-03-31' })
    expect(cols[2]).toMatchObject({ fy: '2027-28', quarter: 1 })
    expect(cols[3]).toMatchObject({ fy: '2027-28', quarter: 2 })
  })
})

describe('buildSalesReview', () => {
  it('attributes confirmed revenue to FY columns and computes YTD YoY vs same period last year', () => {
    const report = buildSalesReview(
      [
        p({
          id: 'fy24',
          year: '2024-25',
          projectStatus: 'COMPLETED',
          projectCost: 1_000_000,
          grossProfit: 200_000,
          confirmationDate: '2024-08-15T00:00:00.000Z',
        }),
        p({
          id: 'fy25-early',
          year: '2025-26',
          projectStatus: 'COMPLETED',
          projectCost: 2_000_000,
          grossProfit: 400_000,
          confirmationDate: '2025-06-01T00:00:00.000Z',
        }),
        p({
          id: 'fy25-late',
          year: '2025-26',
          projectStatus: 'COMPLETED',
          projectCost: 500_000,
          grossProfit: 50_000,
          confirmationDate: '2025-12-01T00:00:00.000Z',
        }),
        p({
          id: 'fy26',
          year: '2026-27',
          projectStatus: 'CONFIRMED',
          projectCost: 3_000_000,
          grossProfit: 600_000,
          confirmationDate: '2026-05-10T00:00:00.000Z',
        }),
      ],
      NOW,
    )

    const revenue = report.achievement.rows.find((r) => r.key === 'revenue')!.values
    expect(revenue).toEqual([1_000_000, 2_500_000, 3_000_000])

    const yoy = report.achievement.rows.find((r) => r.key === 'yoy')!.values
    // Current YTD vs last-year same period (only fy25-early, 2L) → (3L-2L)/2L = 50%
    expect(yoy[2]).toBe(50)
    expect(report.kpis.closedYtdRevenue).toBe(3_000_000)
  })

  it('buckets open pipeline by commissioning date and flags overdue / unscheduled', () => {
    const report = buildSalesReview(
      [
        p({
          id: 'overdue',
          projectStatus: 'PROPOSAL',
          projectCost: 100_000,
          salesProbability: 30,
          expectedCommissioningDate: '2026-09-01T00:00:00.000Z',
        }),
        p({
          id: 'cq',
          projectStatus: 'PROPOSAL',
          projectCost: 200_000,
          salesProbability: 30,
          expectedCommissioningDate: '2026-11-15T00:00:00.000Z',
        }),
        p({
          id: 'nq',
          projectStatus: 'CONFIRMED',
          projectCost: 400_000,
          salesProbability: 75,
          expectedCommissioningDate: '2027-02-01T00:00:00.000Z',
        }),
        p({
          id: 'none',
          projectStatus: 'LEAD',
          projectCost: 50_000,
          salesProbability: 10,
          expectedCommissioningDate: null,
        }),
      ],
      NOW,
    )

    const pipeline = report.forecast.rows.find((r) => r.key === 'pipeline')!.values
    const weighted = report.forecast.rows.find((r) => r.key === 'weighted')!.values
    expect(pipeline[0]).toBe(300_000) // overdue + CQ
    expect(pipeline[1]).toBe(400_000)
    expect(weighted[0]).toBe(90_000) // 30k + 60k
    expect(weighted[1]).toBe(300_000)
    expect(report.forecast.unscheduledPipeline).toBe(50_000)
    expect(report.deals.find((d) => d.id === 'overdue')?.pastDue).toBe(true)
    expect(report.deals.find((d) => d.id === 'none')?.unscheduled).toBe(true)
    expect(report.kpis.openDeals).toBe(4)
  })

  it('excludes Lost and Completed from the open deal list', () => {
    const report = buildSalesReview(
      [
        p({ id: 'lost', projectStatus: 'LOST', year: '2026-27', projectCost: 80_000 }),
        p({
          id: 'done',
          projectStatus: 'COMPLETED',
          year: '2026-27',
          projectCost: 90_000,
          confirmationDate: '2026-06-01T00:00:00.000Z',
        }),
        p({ id: 'open', projectStatus: 'SITE_SURVEY', projectCost: 10_000, salesProbability: 20 }),
      ],
      NOW,
    )
    expect(report.deals.map((d) => d.id)).toEqual(['open'])
    expect(report.kpis.lostYtdDeals).toBe(1)
    expect(report.kpis.lostYtdValue).toBe(80_000)
  })
})
