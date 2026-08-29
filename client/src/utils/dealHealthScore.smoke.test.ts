/**
 * Thorough Deal Health smoke matrix — stages, edges, adapters, UI factor labels.
 * Run: npx vitest run src/utils/dealHealthScore.smoke.test.ts
 */
import { describe, expect, it } from 'vitest'
import {
  computeDealHealth,
  pipelineRowToHealthProject,
  projectDetailToHealthProject,
  zenithExplorerProjectToHealthProject,
  scoreDealValueForHealth,
} from './dealHealthScore'
import type { Project } from '../types'
import type { ZenithExplorerProject } from '../types/zenithExplorer'

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

describe('Deal Health smoke — value bands', () => {
  const cases: Array<[number, number]> = [
    [0, 0],
    [1, 10],
    [199_999, 10],
    [200_000, 20],
    [800_000, 20],
    [800_001, 15],
    [1_499_999, 15],
    [1_500_000, 12],
    [5_000_000, 12],
  ]
  it.each(cases)('order value %s → %s pts', (value, pts) => {
    expect(scoreDealValueForHealth(value).score).toBe(pts)
  })
})

describe('Deal Health smoke — terminal stages hidden', () => {
  for (const status of ['LOST', 'COMPLETED', 'COMPLETED_SUBSIDY_CREDITED'] as const) {
    it(`null for ${status}`, () => {
      expect(
        computeDealHealth({
          projectStatus: status,
          updated_at: daysAgoIso(1),
          deal_value: 300_000,
        }),
      ).toBeNull()
    })
  }
  for (const stage of ['Lost', 'Completed', 'Completed - Subsidy Credited'] as const) {
    it(`null for stage label ${stage}`, () => {
      expect(
        computeDealHealth({
          stage,
          updated_at: daysAgoIso(1),
          deal_value: 300_000,
        }),
      ).toBeNull()
    })
  }
})

describe('Deal Health smoke — stage matrix', () => {
  const rich = {
    updated_at: daysAgoIso(2),
    stage_entered_at: daysAgoIso(5),
    stage_anchor_is_fallback: false,
    deal_value: 350_000,
    confirmation_date: daysAgoIso(10),
    advance_received: 200_000,
    lead_source: 'REFERRAL',
  }

  it('Under Installation scores above Proposal with same commercial fields', () => {
    // Keep below cap so +15 Install confidence is visible (fresh rich deals both hit 100).
    const mid = {
      updated_at: daysAgoIso(20),
      stage_entered_at: daysAgoIso(20),
      stage_anchor_is_fallback: false,
      deal_value: 350_000,
      confirmation_date: daysAgoIso(30),
      advance_received: 50_000,
      lead_source: 'REFERRAL',
    }
    const proposal = computeDealHealth({ ...mid, stage: 'Proposal' })!
    const install = computeDealHealth({ ...mid, stage: 'Under Installation' })!
    expect(install.factors.some((f) => f.name === 'Install confidence')).toBe(true)
    expect(proposal.factors.some((f) => f.name === 'Install confidence')).toBe(false)
    expect(install.score).toBeGreaterThan(proposal.score)
    expect(install.raw.factor6).toBe(15)
    expect(install.score).toBeLessThanOrEqual(100)
    expect(proposal.score).toBeLessThan(100)
  })

  it('Confirmed Order has no Install confidence factor', () => {
    const h = computeDealHealth({ ...rich, stage: 'Confirmed Order' })!
    expect(h.factors.find((f) => f.name === 'Install confidence')).toBeUndefined()
    expect(h.factors.find((f) => f.name === 'Commitment')).toBeTruthy()
  })

  it('Lead pre-order commitment uses expected commissioning', () => {
    const h = computeDealHealth({
      stage: 'Lead',
      updated_at: daysAgoIso(1),
      stage_entered_at: daysAgoIso(1),
      stage_anchor_is_fallback: false,
      deal_value: 250_000,
      lead_source: 'SALES',
      expected_close_date: daysAheadIso(14),
    })!
    expect(h.factors.find((f) => f.name === 'Commitment')!.score).toBe(15)
    expect(h.factors.find((f) => f.name === 'Close Date')).toBeUndefined()
  })

  it('Lead with overdue expected close scores lower commitment', () => {
    const future = computeDealHealth({
      stage: 'Lead',
      updated_at: daysAgoIso(1),
      stage_entered_at: daysAgoIso(1),
      stage_anchor_is_fallback: false,
      deal_value: 250_000,
      lead_source: 'SALES',
      expected_close_date: daysAheadIso(14),
    })!
    const overdue = computeDealHealth({
      stage: 'Lead',
      updated_at: daysAgoIso(1),
      stage_entered_at: daysAgoIso(1),
      stage_anchor_is_fallback: false,
      deal_value: 250_000,
      lead_source: 'SALES',
      expected_close_date: daysAgoIso(14),
    })!
    expect(overdue.raw.factor4).toBeLessThan(future.raw.factor4)
  })
})

describe('Deal Health smoke — adapters align', () => {
  it('projectDetailToHealthProject preserves stageEnteredAt', () => {
    const project = {
      id: 'p1',
      projectStatus: 'PROPOSAL',
      updatedAt: daysAgoIso(3),
      stageEnteredAt: daysAgoIso(20),
      projectCost: 400_000,
      confirmationDate: null,
      advanceReceived: 0,
      leadSource: 'GOOGLE',
      expectedCommissioningDate: daysAheadIso(30),
    } as unknown as Project

    const mapped = projectDetailToHealthProject(project)
    expect(mapped.stage_anchor_is_fallback).toBe(false)
    expect(mapped.stage_entered_at).toBe(project.stageEnteredAt)

    const health = computeDealHealth(mapped)!
    expect(health.raw.factor5).toBe(4)
    expect(health.factors.map((f) => f.name)).toEqual([
      'Activity',
      'Momentum',
      'Deal Value',
      'Commitment',
      'Lead Source',
    ])
  })

  it('pipelineRow without stageEnteredAt marks fallback', () => {
    const mapped = pipelineRowToHealthProject({
      stage: 'Proposal',
      updatedAt: daysAgoIso(10),
      dealValue: 300_000,
      leadSource: 'WEBSITE',
    })
    expect(mapped.stage_anchor_is_fallback).toBe(true)
    const health = computeDealHealth(mapped)!
    expect(health.score).toBeGreaterThanOrEqual(0)
    expect(health.score).toBeLessThanOrEqual(100)
  })

  it('zenithExplorerProjectToHealthProject uses stage_entered_at', () => {
    const row = {
      id: 'x',
      projectStatus: 'UNDER_INSTALLATION',
      stageLabel: 'Under Installation',
      deal_value: 500_000,
      lead_source: 'REFERRAL',
      customer_segment: 'Residential',
      financial_year: '2025-26',
      assigned_to_name: 'A',
      updated_at: daysAgoIso(10),
      stage_entered_at: daysAgoIso(25),
      confirmation_date: daysAgoIso(40),
      advance_received: 300_000,
      customer_name: 'Test',
    } as ZenithExplorerProject

    const health = computeDealHealth(zenithExplorerProjectToHealthProject(row))!
    expect(health.factors.find((f) => f.name === 'Install confidence')?.score).toBe(15)
    expect(health.label === 'On track' || health.label === 'In delivery' || health.grade === 'A' || health.grade === 'B').toBe(
      true,
    )
  })
})

describe('Deal Health smoke — invariants', () => {
  it('every open-stage result has score 0–100 and factor scores within max', () => {
    const stages = [
      'Lead',
      'Site Survey',
      'Proposal',
      'Confirmed Order',
      'Under Installation',
      'Submitted for Subsidy',
    ]
    for (const stage of stages) {
      const h = computeDealHealth({
        stage,
        updated_at: daysAgoIso(4),
        stage_entered_at: daysAgoIso(10),
        stage_anchor_is_fallback: false,
        deal_value: 275_000,
        confirmation_date: stage === 'Lead' || stage === 'Site Survey' || stage === 'Proposal' ? null : daysAgoIso(20),
        advance_received: stage === 'Lead' || stage === 'Site Survey' || stage === 'Proposal' ? 0 : 100_000,
        lead_source: 'CHANNEL_PARTNER',
        expected_close_date: daysAheadIso(20),
      })
      expect(h, stage).not.toBeNull()
      expect(h!.score).toBeGreaterThanOrEqual(0)
      expect(h!.score).toBeLessThanOrEqual(100)
      const sum = h!.factors.reduce((s, f) => s + f.score, 0)
      expect(Math.min(100, sum)).toBe(h!.score)
      for (const f of h!.factors) {
        expect(f.score).toBeGreaterThanOrEqual(0)
        expect(f.score).toBeLessThanOrEqual(f.max)
      }
      expect(h!.factors.some((f) => f.name === 'Close Date')).toBe(false)
      expect(h!.factors.some((f) => f.name === 'Commitment')).toBe(true)
    }
  })

  it('grade letters match score bands', () => {
    const samples = [
      {
        stage: 'Under Installation',
        updated_at: daysAgoIso(1),
        stage_entered_at: daysAgoIso(1),
        stage_anchor_is_fallback: false,
        deal_value: 400_000,
        confirmation_date: daysAgoIso(5),
        advance_received: 250_000,
        lead_source: 'REFERRAL',
      },
      {
        stage: 'Proposal',
        updated_at: daysAgoIso(90),
        stage_entered_at: daysAgoIso(90),
        stage_anchor_is_fallback: false,
        deal_value: 50_000,
        lead_source: '',
      },
    ]
    for (const s of samples) {
      const h = computeDealHealth(s)!
      if (h.score >= 75) expect(h.grade).toBe('A')
      else if (h.score >= 55) expect(h.grade).toBe('B')
      else if (h.score >= 35) expect(h.grade).toBe('C')
      else if (h.score >= 15) expect(h.grade).toBe('D')
      else expect(h.grade).toBe('F')
    }
  })
})
