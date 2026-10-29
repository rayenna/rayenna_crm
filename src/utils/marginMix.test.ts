import { describe, expect, it } from 'vitest'
import {
  buildMarginMix,
  hasCrmCost,
  isOnMarginBook,
  jobQuarter,
  kwBand,
  marginBand,
  resolveProfit,
  type MarginMixProjectInput,
} from './marginMix'

const NOW = new Date('2026-10-29T06:30:00.000Z') // 12:00 IST 29 Oct 2026

function p(
  partial: Partial<MarginMixProjectInput> & Pick<MarginMixProjectInput, 'id'>,
): MarginMixProjectInput {
  return {
    slNo: 1,
    projectStatus: 'CONFIRMED',
    year: '2026-27',
    projectCost: 500_000,
    totalProjectCost: 400_000,
    grossProfit: 100_000,
    expectedProfit: null,
    profitability: 20,
    systemCapacity: 5,
    systemType: 'ON_GRID',
    type: 'SUBSIDY',
    confirmationDate: '2026-06-10T00:00:00.000Z',
    peCostingTotal: null,
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'Nair Villa',
    customerType: 'RESIDENTIAL',
    ...partial,
  }
}

describe('kwBand / marginBand / cost', () => {
  it('buckets kW and GP%', () => {
    expect(kwBand(null)).toBe('unknown')
    expect(kwBand(3)).toBe('b0_3')
    expect(kwBand(5)).toBe('b3_5')
    expect(kwBand(10)).toBe('b5_10')
    expect(kwBand(20)).toBe('b10_20')
    expect(kwBand(21)).toBe('b20')
    expect(marginBand(-1)).toBe('loss')
    expect(marginBand(9.9)).toBe('thin')
    expect(marginBand(10)).toBe('ok')
    expect(marginBand(20)).toBe('healthy')
    expect(marginBand(null)).toBe('unknown')
    expect(hasCrmCost(0)).toBe(false)
    expect(hasCrmCost(1)).toBe(true)
  })
})

describe('resolveProfit', () => {
  it('prefers gross profit, then expected, then order minus cost', () => {
    expect(resolveProfit(p({ id: 'gp' })).profit).toBe(100_000)
    expect(resolveProfit(p({ id: 'est', grossProfit: null, expectedProfit: 80_000 })).estimated).toBe(true)
    expect(
      resolveProfit(p({ id: 'calc', grossProfit: null, expectedProfit: null, totalProjectCost: 350_000 }))
        .profit,
    ).toBe(150_000)
    expect(
      resolveProfit(p({ id: 'none', grossProfit: null, expectedProfit: null, totalProjectCost: null })).profit,
    ).toBeNull()
  })
})

describe('buildMarginMix', () => {
  it('keeps confirmed-and-beyond FY wins, flags thin/missing/PE, and excludes pipeline', () => {
    const report = buildMarginMix(
      [
        p({ id: 'healthy', customerName: 'Healthy', grossProfit: 120_000, totalProjectCost: 380_000 }),
        p({
          id: 'thin',
          customerName: 'Thin',
          projectCost: 500_000,
          totalProjectCost: 460_000,
          grossProfit: 40_000,
          profitability: 8,
        }),
        p({
          id: 'loss',
          customerName: 'Loss',
          projectCost: 400_000,
          totalProjectCost: 450_000,
          grossProfit: -50_000,
        }),
        p({
          id: 'no-cost',
          customerName: 'No cost',
          totalProjectCost: null,
          grossProfit: null,
          expectedProfit: null,
          peCostingTotal: 300_000,
        }),
        p({
          id: 'mismatch',
          customerName: 'Mismatch',
          totalProjectCost: 400_000,
          peCostingTotal: 500_000,
        }),
        p({
          id: 'pipeline',
          projectStatus: 'PROPOSAL',
          customerName: 'Still pipeline',
        }),
        p({
          id: 'lost',
          projectStatus: 'LOST',
          customerName: 'Lost',
        }),
        p({
          id: 'last-fy',
          confirmationDate: '2025-08-01T00:00:00.000Z',
          year: '2025-26',
          projectCost: 200_000,
          grossProfit: 20_000,
          totalProjectCost: 180_000,
          customerName: 'Last FY',
        }),
        p({
          id: 'submitted',
          projectStatus: 'SUBMITTED_FOR_SUBSIDY',
          customerName: 'Submitted',
          systemCapacity: 25,
          type: 'NON_SUBSIDY',
        }),
      ],
      NOW,
    )

    expect(isOnMarginBook('PROPOSAL')).toBe(false)
    expect(isOnMarginBook('SUBMITTED_FOR_SUBSIDY')).toBe(true)
    expect(report.jobs.map((j) => j.id).sort()).toEqual(
      ['healthy', 'loss', 'mismatch', 'no-cost', 'submitted', 'thin'].sort(),
    )
    expect(report.jobs[0]?.id).toBe('loss')
    expect(report.jobs.find((j) => j.id === 'thin')?.marginBand).toBe('thin')
    expect(report.jobs.find((j) => j.id === 'no-cost')?.flags).toEqual(
      expect.arrayContaining(['missing_cost', 'pe_only']),
    )
    expect(report.jobs.find((j) => j.id === 'mismatch')?.flags).toContain('pe_mismatch')
    expect(report.kpis.jobs).toBe(6)
    expect(report.kpis.missingCostJobs).toBe(1)
    expect(report.kpis.thinJobs).toBe(1)
    expect(report.kpis.lossJobs).toBe(1)
    expect(report.kpis.lastFyRevenue).toBe(200_000)
    expect(report.segmentMix.some((r) => r.label === 'Non-subsidy')).toBe(true)
    expect(report.kwMix.some((r) => r.key === 'b20')).toBe(true)
    expect(report.quarter).toBeNull()
    expect(report.periodLabel).toBe('FY2026-27')
    expect(report.availableFys).toEqual(expect.arrayContaining(['2026-27', '2025-26']))
  })

  it('filters by FY and Indian quarter on confirmation date', () => {
    const rows = [
      p({ id: 'q1', confirmationDate: '2026-05-10T00:00:00.000Z', customerName: 'May' }),
      p({ id: 'q3', confirmationDate: '2026-11-02T00:00:00.000Z', customerName: 'Nov' }),
      p({
        id: 'no-date',
        confirmationDate: null,
        year: '2026-27',
        customerName: 'No confirm date',
      }),
      p({
        id: 'prior-q3',
        confirmationDate: '2025-11-02T00:00:00.000Z',
        year: '2025-26',
        projectCost: 200_000,
        grossProfit: 20_000,
        customerName: 'Last FY Q3',
      }),
    ]
    expect(jobQuarter(rows[0])).toBe(1)
    expect(jobQuarter(rows[1])).toBe(3)
    expect(jobQuarter(rows[2])).toBeNull()

    const q3 = buildMarginMix(rows, NOW, { fy: '2026-27', quarter: 3 })
    expect(q3.jobs.map((j) => j.id)).toEqual(['q3'])
    expect(q3.periodLabel).toBe('Q3 FY2026-27')
    expect(q3.quarter).toBe(3)
    expect(q3.kpis.lastFyRevenue).toBe(200_000)

    const prior = buildMarginMix(rows, NOW, { fy: '2025-26' })
    expect(prior.jobs.map((j) => j.id)).toEqual(['prior-q3'])
    expect(prior.currentFy).toBe('2025-26')
    expect(prior.periodLabel).toBe('FY2025-26')

    const fyAll = buildMarginMix(rows, NOW, { fy: '2026-27' })
    expect(fyAll.jobs.map((j) => j.id).sort()).toEqual(['no-date', 'q1', 'q3'])
  })
})
