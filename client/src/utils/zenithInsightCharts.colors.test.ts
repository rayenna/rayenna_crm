import { describe, expect, it } from 'vitest'
import {
  buildCommissioningTimelineRows,
  buildOutstandingBySalespersonRows,
  COMMISSIONING_SPECIAL_COLORS,
  getCommissioningBucketColor,
  getOutstandingSalesBarColor,
} from './zenithInsightCharts'
import type { ZenithExplorerProject } from '../types/zenithExplorer'

function baseProject(overrides: Partial<ZenithExplorerProject>): ZenithExplorerProject {
  return {
    id: 'p1',
    projectStatus: 'CONFIRMED',
    stageLabel: 'Confirmed',
    deal_value: 100000,
    lead_source: 'Referral',
    customer_segment: 'Residential',
    financial_year: '2025-26',
    assigned_to_name: 'A',
    updated_at: '2026-09-01T00:00:00.000Z',
    customer_name: 'Cust',
    ...overrides,
  }
}

describe('insight chart bar colors', () => {
  it('gives commissioning buckets distinct semantic colors', () => {
    expect(getCommissioningBucketColor('overdue')).toBe(COMMISSIONING_SPECIAL_COLORS.overdue)
    expect(getCommissioningBucketColor('this-month')).toBe(COMMISSIONING_SPECIAL_COLORS['this-month'])
    expect(getCommissioningBucketColor('unscheduled')).toBe(COMMISSIONING_SPECIAL_COLORS.unscheduled)
    expect(getCommissioningBucketColor('later')).toBe(COMMISSIONING_SPECIAL_COLORS.later)
    const m1 = getCommissioningBucketColor('month-2099-01')
    const m2 = getCommissioningBucketColor('month-2099-02')
    // Far future months still resolve via later path or gold fallback — near-horizon months differ
    expect(typeof m1).toBe('string')
    expect(typeof m2).toBe('string')
  })

  it('attaches fill on commissioning timeline rows', () => {
    const rows = buildCommissioningTimelineRows([
      baseProject({
        id: 'u1',
        expected_close_date: null,
        projectStatus: 'PROPOSAL',
      }),
      baseProject({
        id: 'u2',
        expected_close_date: null,
        projectStatus: 'LEAD',
      }),
    ])
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => typeof r.fill === 'string' && r.fill.length > 0)).toBe(true)
  })

  it('colors outstanding salesperson bars distinctly by rank', () => {
    expect(getOutstandingSalesBarColor('A', 0)).not.toBe(getOutstandingSalesBarColor('B', 1))
    const rows = buildOutstandingBySalespersonRows([
      baseProject({
        id: '1',
        assigned_to_name: 'Arjun',
        payment_status: 'PENDING',
        balance_amount: 500000,
      }),
      baseProject({
        id: '2',
        assigned_to_name: 'Kavya',
        payment_status: 'PARTIAL',
        balance_amount: 300000,
      }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]!.fill).toBe(getOutstandingSalesBarColor(rows[0]!.key, 0))
    expect(rows[1]!.fill).toBe(getOutstandingSalesBarColor(rows[1]!.key, 1))
    expect(rows[0]!.fill).not.toBe(rows[1]!.fill)
  })
})
