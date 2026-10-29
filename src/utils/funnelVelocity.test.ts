import { describe, expect, it } from 'vitest'
import {
  buildFunnelVelocity,
  funnelAgingBucket,
  funnelSlaBand,
  isFunnelOpen,
  median,
  type FunnelVelocityProjectInput,
} from './funnelVelocity'

const NOW = new Date('2026-10-29T06:30:00.000Z') // 12:00 IST 29 Oct 2026

function p(
  partial: Partial<FunnelVelocityProjectInput> & Pick<FunnelVelocityProjectInput, 'id'>,
): FunnelVelocityProjectInput {
  return {
    slNo: 1,
    projectStatus: 'PROPOSAL',
    year: '2026-27',
    projectCost: 400_000,
    salesProbability: 40,
    systemCapacity: 5,
    systemType: 'ON_GRID',
    type: 'SUBSIDY',
    confirmationDate: null,
    expectedCommissioningDate: '2026-12-15T00:00:00.000Z',
    stageEnteredAt: '2026-10-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    lostDate: null,
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'Nair Villa',
    customerType: 'RESIDENTIAL',
    ...partial,
  }
}

describe('funnelAgingBucket', () => {
  it('splits 0–7 / 8–14 / 15–21 / 22–30 / 30+ / undated', () => {
    expect(funnelAgingBucket(0)).toBe('b0_7')
    expect(funnelAgingBucket(7)).toBe('b0_7')
    expect(funnelAgingBucket(8)).toBe('b8_14')
    expect(funnelAgingBucket(21)).toBe('b15_21')
    expect(funnelAgingBucket(22)).toBe('b22_30')
    expect(funnelAgingBucket(30)).toBe('b22_30')
    expect(funnelAgingBucket(31)).toBe('b30')
    expect(funnelAgingBucket(null)).toBe('undated')
  })
})

describe('funnelSlaBand', () => {
  it('uses Data Sense thresholds: <70% green, <90% amber, else red', () => {
    expect(funnelSlaBand(4, 7)).toBe('GREEN')
    expect(funnelSlaBand(5, 7)).toBe('AMBER')
    expect(funnelSlaBand(7, 7)).toBe('RED')
    expect(funnelSlaBand(10, 14)).toBe('AMBER')
    expect(funnelSlaBand(13, 14)).toBe('RED')
    expect(funnelSlaBand(null, 7)).toBe('NONE')
  })
})

describe('median', () => {
  it('returns null for empty, integer midpoint otherwise', () => {
    expect(median([])).toBeNull()
    expect(median([3])).toBe(3)
    expect(median([1, 3])).toBe(2)
    expect(median([1, 2, 100])).toBe(2)
  })
})

describe('buildFunnelVelocity', () => {
  it('ages open Lead/Survey/Proposal, clamps days, and keeps confirmed jobs off the stuck list', () => {
    const report = buildFunnelVelocity(
      [
        p({
          id: 'lead-fresh',
          projectStatus: 'LEAD',
          stageEnteredAt: '2026-10-27T00:00:00.000Z',
          customerName: 'Fresh lead',
          projectCost: 100_000,
        }),
        p({
          id: 'survey-stale',
          projectStatus: 'SITE_SURVEY',
          stageEnteredAt: '2026-09-01T00:00:00.000Z',
          customerName: 'Stale survey',
          projectCost: 200_000,
        }),
        p({
          id: 'proposal-est',
          projectStatus: 'PROPOSAL',
          stageEnteredAt: null,
          createdAt: '2026-09-29T00:00:00.000Z',
          customerName: 'Estimated proposal',
          salespersonId: null,
          salespersonName: null,
          projectCost: 300_000,
        }),
        p({
          id: 'won',
          projectStatus: 'CONFIRMED',
          confirmationDate: '2026-06-10T00:00:00.000Z',
          createdAt: '2026-04-01T00:00:00.000Z',
          projectCost: 500_000,
        }),
        p({
          id: 'lost',
          projectStatus: 'LOST',
          lostDate: '2026-07-15T00:00:00.000Z',
          createdAt: '2026-05-01T00:00:00.000Z',
          projectCost: 250_000,
        }),
        p({
          id: 'old-win',
          projectStatus: 'UNDER_INSTALLATION',
          confirmationDate: '2025-08-01T00:00:00.000Z',
          projectCost: 900_000,
        }),
        p({
          id: 'future-stage',
          projectStatus: 'LEAD',
          stageEnteredAt: '2026-11-01T00:00:00.000Z',
          customerName: 'Future dated',
          projectCost: 50_000,
        }),
      ],
      NOW,
    )

    expect(isFunnelOpen('PROPOSAL')).toBe(true)
    expect(isFunnelOpen('CONFIRMED')).toBe(false)
    expect(report.deals.map((d) => d.id).sort()).toEqual(
      ['future-stage', 'lead-fresh', 'proposal-est', 'survey-stale'].sort(),
    )
    expect(report.deals[0]?.id).toBe('survey-stale')
    expect(report.deals.find((d) => d.id === 'survey-stale')?.daysInStage).toBe(58)
    expect(report.deals.find((d) => d.id === 'survey-stale')?.slaBand).toBe('RED')
    expect(report.deals.find((d) => d.id === 'lead-fresh')?.slaBand).toBe('GREEN')
    expect(report.deals.find((d) => d.id === 'proposal-est')?.stageDateEstimated).toBe(true)
    expect(report.deals.find((d) => d.id === 'proposal-est')?.flags).toContain('estimated_date')
    expect(report.deals.find((d) => d.id === 'proposal-est')?.flags).toContain('unassigned')
    expect(report.deals.find((d) => d.id === 'future-stage')?.daysInStage).toBe(0)

    expect(report.kpis.openDeals).toBe(4)
    expect(report.kpis.slaRed).toBeGreaterThan(0)
    expect(report.kpis.confirmedYtdDeals).toBe(1)
    expect(report.kpis.confirmedYtdValue).toBe(500_000)
    expect(report.kpis.lostYtdDeals).toBe(1)
    expect(report.kpis.lostYtdValue).toBe(250_000)
    expect(report.kpis.winRate).toBe(50)
    expect(report.kpis.medianDaysToConfirm).toBe(70)
    expect(report.kpis.medianDaysToLose).toBe(75)

    const dealsRow = report.funnel.rows.find((r) => r.key === 'deals')
    expect(dealsRow?.values).toEqual([2, 1, 1])
    expect(report.sellerLoad.some((r) => r.salespersonName === 'Unassigned')).toBe(true)
  })

  it('treats lost without lostDate as YTD when project year matches', () => {
    const report = buildFunnelVelocity(
      [p({ id: 'lost-year', projectStatus: 'LOST', lostDate: null, year: '2026-27', projectCost: 80_000 })],
      NOW,
    )
    expect(report.kpis.lostYtdDeals).toBe(1)
    expect(report.deals).toHaveLength(0)
  })
})
