import { describe, expect, it } from 'vitest'
import { computeDealHealth, scoreDealValueForHealth } from './dealHealthScore'

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function daysAheadIso(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

describe('scoreDealValueForHealth (₹2L–₹8L sweet spot)', () => {
  it('scores sweet spot and mild large-deal discounts', () => {
    expect(scoreDealValueForHealth(0).score).toBe(0)
    expect(scoreDealValueForHealth(150_000).score).toBe(10)
    expect(scoreDealValueForHealth(200_000).score).toBe(20)
    expect(scoreDealValueForHealth(800_000).score).toBe(20)
    expect(scoreDealValueForHealth(800_001).score).toBe(15)
    expect(scoreDealValueForHealth(1_500_000).score).toBe(12)
    expect(scoreDealValueForHealth(1_850_000).score).toBe(12)
  })
})

describe('computeDealHealth v2', () => {
  it('does not show health for Lost / Completed', () => {
    expect(computeDealHealth({ projectStatus: 'LOST', updatedAt: daysAgoIso(1) })).toBeNull()
    expect(computeDealHealth({ projectStatus: 'COMPLETED', updatedAt: daysAgoIso(1) })).toBeNull()
  })

  it('treats ₹18.5L Management Connect neglected Proposal as Neglected, not value-punished Weak', () => {
    const health = computeDealHealth({
      stage: 'Proposal',
      updated_at: daysAgoIso(89),
      stage_entered_at: daysAgoIso(89),
      stage_anchor_is_fallback: false,
      deal_value: 1_850_000,
      confirmation_date: daysAgoIso(90),
      advance_received: 0,
      lead_source: 'MANAGEMENT_CONNECT',
    })
    expect(health).not.toBeNull()
    expect(health!.factors.find((f) => f.name === 'Deal Value')?.score).toBe(12)
    expect(health!.factors.find((f) => f.name === 'Commitment')?.name).toBe('Commitment')
    expect(health!.factors.find((f) => f.name === 'Close Date')).toBeUndefined()
    expect(health!.score).toBeGreaterThanOrEqual(20)
    expect(health!.label).toBe('Neglected')
    expect(health!.insight.toLowerCase()).toMatch(/stuck|neglect|update|call/)
  })

  it('dampens Activity when stage clock falls back to updatedAt', () => {
    const shared = daysAgoIso(5)
    const health = computeDealHealth({
      stage: 'Lead',
      updated_at: shared,
      stage_changed_at: shared,
      stage_anchor_is_fallback: true,
      deal_value: 250_000,
      lead_source: 'REFERRAL',
    })
    expect(health).not.toBeNull()
    // Fresh 5d would be 22; dampened ≈ 12
    expect(health!.raw.factor1).toBe(Math.round(22 * 0.55))
    expect(health!.raw.factor3).toBe(20)
  })

  it('scores Website and Google explicitly', () => {
    const web = computeDealHealth({
      stage: 'Lead',
      updated_at: daysAgoIso(1),
      stage_entered_at: daysAgoIso(1),
      stage_anchor_is_fallback: false,
      deal_value: 250_000,
      lead_source: 'WEBSITE',
    })
    expect(web?.raw.factor5).toBe(4)
  })

  it('folds payment weakness into Commitment (no new factor)', () => {
    const base = {
      stage: 'Confirmed Order',
      updated_at: daysAgoIso(2),
      stage_entered_at: daysAgoIso(5),
      stage_anchor_is_fallback: false,
      deal_value: 400_000,
      confirmation_date: daysAgoIso(10),
      advance_received: 250_000,
      lead_source: 'REFERRAL',
    }
    const paid = computeDealHealth({
      ...base,
      paymentStatus: 'FULLY_PAID',
      balanceAmount: 0,
    })!
    const pending = computeDealHealth({
      ...base,
      paymentStatus: 'PENDING',
      balanceAmount: 150_000,
    })!
    expect(paid.factors.some((f) => f.name === 'Payment')).toBe(false)
    expect(paid.raw.factor4).toBeGreaterThan(pending.raw.factor4)
    expect(pending.insight.toLowerCase()).toMatch(/collect|balance|payment/)
  })

  it('uses remark date for Activity when newer than updatedAt', () => {
    const h = computeDealHealth({
      stage: 'Proposal',
      updated_at: daysAgoIso(40),
      lastRemarkAt: daysAgoIso(2),
      stage_entered_at: daysAgoIso(10),
      stage_anchor_is_fallback: false,
      deal_value: 250_000,
      lead_source: 'SALES',
      expected_close_date: daysAheadIso(20),
    })!
    expect(h.raw.factor1).toBe(30)
    expect(h.factors.find((f) => f.name === 'Activity')!.detail.toLowerCase()).toContain('remark')
  })

  it('gives Under Installation install-confidence boost and softer activity', () => {
    const base = {
      updated_at: daysAgoIso(20),
      stage_entered_at: daysAgoIso(20),
      stage_anchor_is_fallback: false,
      deal_value: 400_000,
      confirmation_date: daysAgoIso(40),
      advance_received: 200_000,
      paymentStatus: 'PARTIAL',
      balanceAmount: 200_000,
      lead_source: 'REFERRAL',
    }
    const proposal = computeDealHealth({ ...base, stage: 'Proposal' })
    const install = computeDealHealth({ ...base, stage: 'Under Installation' })
    expect(install).not.toBeNull()
    expect(install!.factors.find((f) => f.name === 'Install confidence')?.score).toBe(15)
    expect(install!.raw.factor6).toBe(15)
    // 20d activity: under install → 15 (no dampen); proposal → 5 then ×0.55 when same clock → 3
    expect(install!.raw.factor1).toBe(15)
    expect(proposal!.raw.factor1).toBe(Math.round(5 * 0.55))
    expect(install!.score).toBeGreaterThan(proposal!.score)
  })
})
