import { describe, expect, it } from 'vitest'
import type { ZenithExplorerProject } from '../types/zenithExplorer'
import { UserRole } from '../types'
import {
  buildForecastRoleAccent,
  computeForecast,
  computeForecastConcentration,
  dealMatchesForecastTiming,
  getForecastOpenDeals,
  indianFyQuarterFromMonth,
  resolveForecastScheduleYmd,
} from './revenueForecast'

/** Noon IST on a calendar day → stable ISO for tests. */
function isoIst(ymd: string, time = '12:00:00'): string {
  return new Date(`${ymd}T${time}+05:30`).toISOString()
}

const NOW = new Date('2026-08-30T12:00:00+05:30')

function deal(
  partial: Partial<ZenithExplorerProject> & { stageLabel: string; deal_value: number },
): ZenithExplorerProject {
  return {
    id: partial.id ?? 'p1',
    projectStatus: 'PROPOSAL',
    lead_source: 'Sales',
    customer_segment: 'Residential',
    financial_year: '2026-27',
    assigned_to_name: 'A',
    updated_at: isoIst('2026-08-01'),
    customer_name: 'Test',
    expected_close_date: null,
    confirmation_date: null,
    stage_entered_at: null,
    ...partial,
  }
}

describe('indianFyQuarterFromMonth', () => {
  it('maps Indian FY quarters', () => {
    expect(indianFyQuarterFromMonth(4)).toBe(1)
    expect(indianFyQuarterFromMonth(6)).toBe(1)
    expect(indianFyQuarterFromMonth(7)).toBe(2)
    expect(indianFyQuarterFromMonth(9)).toBe(2)
    expect(indianFyQuarterFromMonth(10)).toBe(3)
    expect(indianFyQuarterFromMonth(12)).toBe(3)
    expect(indianFyQuarterFromMonth(1)).toBe(4)
    expect(indianFyQuarterFromMonth(3)).toBe(4)
  })
})

describe('resolveForecastScheduleYmd', () => {
  it('uses expected commissioning only', () => {
    const p = deal({
      stageLabel: 'Proposal',
      deal_value: 1,
      expected_close_date: isoIst('2026-08-15'),
      confirmation_date: isoIst('2026-05-01'),
      stage_entered_at: isoIst('2026-04-01'),
    })
    expect(resolveForecastScheduleYmd(p)).toBe('2026-08-15')
  })

  it('ignores confirmation / stage entered when commissioning is missing', () => {
    const p = deal({
      stageLabel: 'Confirmed Order',
      deal_value: 1,
      expected_close_date: null,
      confirmation_date: isoIst('2026-05-11'),
      stage_entered_at: isoIst('2026-05-11'),
    })
    expect(resolveForecastScheduleYmd(p)).toBeNull()
  })

  it('reads IST calendar day from UTC midnight storage', () => {
    const p = deal({
      stageLabel: 'Under Installation',
      deal_value: 1,
      // Same shape as Prisma date @ midnight UTC
      expected_close_date: '2026-08-31T00:00:00.000Z',
    })
    expect(resolveForecastScheduleYmd(p)).toBe('2026-08-31')
  })
})

describe('dealMatchesForecastTiming (frozen 2026-08-30 IST)', () => {
  const cases: {
    name: string
    commissioning: string | null
    expect: Record<'all' | 'month' | 'quarter' | 'rest_of_fy', boolean>
  }[] = [
    {
      name: 'overdue commissioning',
      commissioning: '2026-07-21',
      expect: { all: true, month: true, quarter: true, rest_of_fy: false },
    },
    {
      name: 'this month',
      commissioning: '2026-08-15',
      expect: { all: true, month: true, quarter: true, rest_of_fy: false },
    },
    {
      name: 'month end',
      commissioning: '2026-08-31',
      expect: { all: true, month: true, quarter: true, rest_of_fy: false },
    },
    {
      name: 'later in quarter (Sep)',
      commissioning: '2026-09-10',
      expect: { all: true, month: false, quarter: true, rest_of_fy: false },
    },
    {
      name: 'quarter end',
      commissioning: '2026-09-30',
      expect: { all: true, month: false, quarter: true, rest_of_fy: false },
    },
    {
      name: 'rest of FY (Oct)',
      commissioning: '2026-10-10',
      expect: { all: true, month: false, quarter: false, rest_of_fy: true },
    },
    {
      name: 'FY end (Mar)',
      commissioning: '2027-03-31',
      expect: { all: true, month: false, quarter: false, rest_of_fy: true },
    },
    {
      name: 'beyond FY (Apr)',
      commissioning: '2027-04-01',
      expect: { all: true, month: false, quarter: false, rest_of_fy: false },
    },
    {
      name: 'unscheduled',
      commissioning: null,
      expect: { all: true, month: false, quarter: false, rest_of_fy: false },
    },
  ]

  for (const c of cases) {
    it(c.name, () => {
      const p = deal({
        stageLabel: 'Proposal',
        deal_value: 100,
        expected_close_date: c.commissioning ? isoIst(c.commissioning) : null,
      })
      for (const timing of ['all', 'month', 'quarter', 'rest_of_fy'] as const) {
        expect(dealMatchesForecastTiming(p, timing, NOW)).toBe(c.expect[timing])
      }
    })
  }

  it('Q4 boundary: from Jan, rest of FY is through Mar only', () => {
    const nowQ4 = new Date('2027-01-15T12:00:00+05:30')
    const feb = deal({
      stageLabel: 'Proposal',
      deal_value: 1,
      expected_close_date: isoIst('2027-02-01'),
    })
    const apr = deal({
      stageLabel: 'Proposal',
      deal_value: 1,
      expected_close_date: isoIst('2027-04-05'),
    })
    // Jan is Q4; quarter ends 31 Mar; Feb is still in quarter (not rest)
    expect(dealMatchesForecastTiming(feb, 'quarter', nowQ4)).toBe(true)
    expect(dealMatchesForecastTiming(feb, 'rest_of_fy', nowQ4)).toBe(false)
    expect(dealMatchesForecastTiming(apr, 'rest_of_fy', nowQ4)).toBe(false)
    expect(dealMatchesForecastTiming(apr, 'all', nowQ4)).toBe(true)
  })
})

describe('computeForecast timing authenticity', () => {
  const cohort = [
    deal({
      id: 'overdue',
      stageLabel: 'Under Installation',
      deal_value: 200_000,
      expected_close_date: isoIst('2026-07-21'),
    }),
    deal({
      id: 'aug',
      stageLabel: 'Confirmed Order',
      deal_value: 100_000,
      expected_close_date: isoIst('2026-08-15'),
    }),
    deal({
      id: 'sep',
      stageLabel: 'Lead',
      deal_value: 1_000_000,
      expected_close_date: isoIst('2026-09-10'),
    }),
    deal({
      id: 'oct',
      stageLabel: 'Proposal',
      deal_value: 130_000,
      expected_close_date: isoIst('2026-10-10'),
    }),
    deal({
      id: 'no-date',
      stageLabel: 'Proposal',
      deal_value: 500_000,
      expected_close_date: null,
      confirmation_date: isoIst('2026-05-11'),
    }),
    deal({
      id: 'done',
      stageLabel: 'Completed',
      deal_value: 9_999_999,
      expected_close_date: isoIst('2026-08-01'),
    }),
  ]

  it('partitions scheduled open deals without double-counting month/quarter/rest', () => {
    const monthIds = getForecastOpenDeals(cohort, 'all', 'month', NOW).map((p) => p.id)
    const quarterIds = getForecastOpenDeals(cohort, 'all', 'quarter', NOW).map((p) => p.id)
    const restIds = getForecastOpenDeals(cohort, 'all', 'rest_of_fy', NOW).map((p) => p.id)
    const allIds = getForecastOpenDeals(cohort, 'all', 'all', NOW).map((p) => p.id)

    expect(monthIds.sort()).toEqual(['aug', 'overdue'])
    expect(quarterIds.sort()).toEqual(['aug', 'overdue', 'sep'])
    expect(restIds).toEqual(['oct'])
    expect(allIds.sort()).toEqual(['aug', 'no-date', 'oct', 'overdue', 'sep'])

    // month ⊆ quarter
    for (const id of monthIds) expect(quarterIds).toContain(id)
    // rest ∩ quarter = ∅
    for (const id of restIds) expect(quarterIds).not.toContain(id)
  })

  it('excludes confirmation-only deals from Month/Quarter/Rest', () => {
    const month = computeForecast(cohort, { timing: 'month', now: NOW })
    const any = computeForecast(cohort, { timing: 'all', now: NOW })
    expect(month.dealCount).toBe(2)
    expect(any.unscheduledCount).toBe(1)
    expect(any.dealCount).toBe(5)
    // confirmation-only 500k must not inflate month
    expect(month.totalRaw).toBe(300_000)
  })

  it('weights Confirmed+ at 100% and early stages discounted', () => {
    const month = computeForecast(cohort, { timing: 'month', now: NOW })
    // overdue install 200k@100% + confirmed 100k@100%
    expect(month.totalForecast).toBe(300_000)
    const quarter = computeForecast(cohort, { timing: 'quarter', now: NOW })
    // + lead 1M @ 10%
    expect(quarter.totalForecast).toBe(400_000)
    const rest = computeForecast(cohort, { timing: 'rest_of_fy', now: NOW })
    // proposal 130k @ 45%
    expect(rest.totalForecast).toBe(58_500)
  })

  it('excludes Completed from all buckets', () => {
    const any = computeForecast(cohort, { timing: 'all', now: NOW })
    expect(any.dealCount).toBe(5)
    expect(any.totalRaw).toBeLessThan(9_999_999)
  })
})

describe('Phase C concentration + role accents', () => {
  it('computes top-3 share of weighted forecast', () => {
    const deals = [
      deal({ id: 'a', stageLabel: 'Confirmed Order', deal_value: 100, customer_name: 'A' }),
      deal({ id: 'b', stageLabel: 'Confirmed Order', deal_value: 100, customer_name: 'B' }),
      deal({ id: 'c', stageLabel: 'Confirmed Order', deal_value: 100, customer_name: 'C' }),
      deal({ id: 'd', stageLabel: 'Confirmed Order', deal_value: 100, customer_name: 'D' }),
    ]
    const c = computeForecastConcentration(deals, 400, 3)
    expect(c.dealCount).toBe(3)
    expect(c.weighted).toBe(300)
    expect(c.share).toBe(0.75)
  })

  it('warns Management when one source ≥ 50%', () => {
    const deals = [
      deal({
        stageLabel: 'Confirmed Order',
        deal_value: 800_000,
        lead_source: 'Management Connect',
      }),
      deal({ stageLabel: 'Proposal', deal_value: 200_000, lead_source: 'Referral' }),
    ]
    const forecast = computeForecast(deals, { timing: 'all', now: NOW })
    const accent = buildForecastRoleAccent(UserRole.MANAGEMENT, deals, forecast)
    expect(accent?.tone).toBe('warning')
    expect(accent?.text).toMatch(/Management Connect/)
  })

  it('Finance accent sums weighted open-balance deals', () => {
    const deals = [
      deal({
        stageLabel: 'Confirmed Order',
        deal_value: 100_000,
        payment_status: 'PARTIAL',
        balance_amount: 40_000,
      }),
      deal({
        stageLabel: 'Proposal',
        deal_value: 200_000,
        payment_status: 'FULLY_PAID',
        balance_amount: 0,
      }),
    ]
    const forecast = computeForecast(deals, { timing: 'all', now: NOW })
    const accent = buildForecastRoleAccent(UserRole.FINANCE, deals, forecast)
    expect(accent?.tone).toBe('info')
    expect(accent?.text).toMatch(/1,00,000/)
    expect(accent?.text).toMatch(/1 deal/)
  })

  it('Ops accent reports Confirmed+ value and kW', () => {
    const deals = [
      deal({
        stageLabel: 'Under Installation',
        deal_value: 200_000,
        system_capacity_kw: 5,
      }),
      deal({ stageLabel: 'Lead', deal_value: 1_000_000, system_capacity_kw: 10 }),
    ]
    const forecast = computeForecast(deals, { timing: 'all', now: NOW })
    const open = getForecastOpenDeals(deals, 'all', 'all', NOW)
    const accent = buildForecastRoleAccent(UserRole.OPERATIONS, open, forecast)
    expect(accent?.text).toMatch(/Committed/)
    expect(accent?.text).toMatch(/5/)
  })

  it('Sales accent nudges commissioning when unscheduled', () => {
    const deals = [
      deal({
        stageLabel: 'Proposal',
        deal_value: 100_000,
        expected_close_date: null,
        confirmation_date: isoIst('2026-05-01'),
      }),
    ]
    const forecast = computeForecast(deals, { timing: 'all', now: NOW })
    const accent = buildForecastRoleAccent(UserRole.SALES, deals, forecast)
    expect(accent?.tone).toBe('info')
    expect(accent?.text).toMatch(/commissioning/)
  })
})
