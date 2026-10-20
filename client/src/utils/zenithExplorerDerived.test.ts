import { describe, expect, it } from 'vitest'
import type { ZenithExplorerProject } from '../types/zenithExplorer'
import {
  avgDaysByStatusFromExplorer,
  explorerToHitListRows,
  overlayDashboardAvgDays,
  revenueByLeadSourceFromExplorer,
  salesTeamPerformanceFromExplorer,
} from './zenithExplorerDerived'

function proj(
  partial: Partial<ZenithExplorerProject> & Pick<ZenithExplorerProject, 'id'>,
): ZenithExplorerProject {
  return {
    projectStatus: 'LEAD',
    project_stage: null,
    has_deal_value: true,
    stageLabel: 'Lead',
    deal_value: 100_000,
    lead_source: 'Referral',
    customer_segment: 'Residential',
    financial_year: '2025-26',
    assigned_to_id: 'u1',
    assigned_to_name: 'Asha',
    updated_at: '2026-10-01T00:00:00.000Z',
    customer_name: 'Patel',
    ...partial,
  }
}

describe('explorerToHitListRows', () => {
  it('keeps pipeline stages, oldest updated first, cap 80', () => {
    const rows = explorerToHitListRows([
      proj({ id: 'lost', projectStatus: 'LOST', stageLabel: 'Lost' }),
      proj({ id: 'newer', projectStatus: 'PROPOSAL', stageLabel: 'Proposal', updated_at: '2026-10-10T00:00:00.000Z' }),
      proj({ id: 'older', projectStatus: 'LEAD', updated_at: '2026-09-01T00:00:00.000Z' }),
    ])
    expect(rows.map((r) => r.projectId)).toEqual(['older', 'newer'])
  })

  it('computes daysSinceActivity from max(updated, last remark)', () => {
    const now = Date.parse('2026-10-20T00:00:00.000Z')
    const rows = explorerToHitListRows(
      [
        proj({
          id: 'a',
          updated_at: '2026-10-10T00:00:00.000Z',
          last_remark_at: '2026-10-18T00:00:00.000Z',
        }),
      ],
      now,
    )
    expect(rows[0]?.daysSinceActivity).toBe(2)
  })
})

describe('revenueByLeadSourceFromExplorer', () => {
  it('sums confirmed revenue and skips Unknown / non-revenue', () => {
    const rows = revenueByLeadSourceFromExplorer([
      proj({ id: '1', projectStatus: 'CONFIRMED', lead_source: 'Referral', deal_value: 50 }),
      proj({ id: '2', projectStatus: 'CONFIRMED', lead_source: 'Referral', deal_value: 25 }),
      proj({ id: '3', projectStatus: 'LEAD', lead_source: 'Google', deal_value: 999 }),
      proj({ id: '4', projectStatus: 'CONFIRMED', lead_source: 'Unknown', deal_value: 40 }),
    ])
    expect(rows).toEqual([{ leadSourceLabel: 'Referral', revenue: 75, projectCount: 2 }])
  })
})

describe('salesTeamPerformanceFromExplorer', () => {
  it('splits pipeline vs revenue and skips unassigned', () => {
    const perf = salesTeamPerformanceFromExplorer([
      proj({ id: 'p', projectStatus: 'LEAD', assigned_to_id: 'u1', assigned_to_name: 'Asha', deal_value: 10 }),
      proj({ id: 'r', projectStatus: 'CONFIRMED', assigned_to_id: 'u1', assigned_to_name: 'Asha', deal_value: 20 }),
      proj({ id: 'u', assigned_to_id: null, assigned_to_name: 'Unassigned', deal_value: 99 }),
    ])
    expect(perf.salesTeamData).toEqual([{ salespersonName: 'Asha', totalOrderValue: 30, projectCount: 2 }])
    expect(perf.revenueBySalesperson).toEqual([{ salespersonName: 'Asha', revenue: 20, projectCount: 1 }])
  })
})

describe('avgDaysByStatusFromExplorer', () => {
  it('averages stage_entered_at (else created_at) to 1 decimal', () => {
    const now = Date.parse('2026-10-11T00:00:00.000Z')
    const map = avgDaysByStatusFromExplorer(
      [
        proj({
          id: 'a',
          projectStatus: 'LEAD',
          stage_entered_at: '2026-10-01T00:00:00.000Z',
        }),
        proj({
          id: 'b',
          projectStatus: 'LEAD',
          stage_entered_at: null,
          created_at: '2026-10-06T00:00:00.000Z',
        }),
      ],
      now,
    )
    expect(map.LEAD).toBe(7.5)
  })

  it('overlays onto dashboard projectsByStatus', () => {
    const now = Date.parse('2026-10-11T00:00:00.000Z')
    const overlaid = overlayDashboardAvgDays(
      { projectsByStatus: [{ status: 'LEAD', count: 2, avgDaysInStage: null }] },
      [
        proj({
          id: 'a',
          projectStatus: 'LEAD',
          stage_entered_at: '2026-10-01T00:00:00.000Z',
        }),
      ],
      now,
    )
    const rows = overlaid.projectsByStatus as { avgDaysInStage: number }[]
    expect(rows[0]?.avgDaysInStage).toBe(10)
  })
})
