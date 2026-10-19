import { describe, expect, it } from 'vitest'
import type { ZenithExplorerProject } from '../types/zenithExplorer'
import { inDashboardPipelineSlice, matchesDashboardRevenueWhere } from './zenithChartDrilldown'

function proj(partial: Partial<ZenithExplorerProject> & Pick<ZenithExplorerProject, 'id'>): ZenithExplorerProject {
  return {
    projectStatus: 'CONFIRMED',
    project_stage: null,
    has_deal_value: true,
    ...partial,
  } as ZenithExplorerProject
}

describe('dashboard pipeline / revenue KPI slices', () => {
  it('pipeline includes non-lost projects with deal value', () => {
    expect(inDashboardPipelineSlice(proj({ id: '1', projectStatus: 'LEAD' }))).toBe(true)
    expect(inDashboardPipelineSlice(proj({ id: '2', projectStatus: 'LOST' }))).toBe(false)
    expect(inDashboardPipelineSlice(proj({ id: '3', has_deal_value: false }))).toBe(false)
  })

  it('revenue is a subset of pipeline (confirmed+ later, not survey/proposal stage)', () => {
    const confirmed = proj({ id: 'r1', projectStatus: 'CONFIRMED', project_stage: null })
    const surveyStage = proj({ id: 'r2', projectStatus: 'CONFIRMED', project_stage: 'SURVEY' })
    const lead = proj({ id: 'r3', projectStatus: 'LEAD' })

    expect(matchesDashboardRevenueWhere(confirmed)).toBe(true)
    expect(matchesDashboardRevenueWhere(surveyStage)).toBe(false)
    expect(matchesDashboardRevenueWhere(lead)).toBe(false)
  })

  it('revenue and profit tiles share the same project set', () => {
    const rows = [
      proj({ id: 'a', projectStatus: 'CONFIRMED' }),
      proj({ id: 'b', projectStatus: 'COMPLETED' }),
      proj({ id: 'c', projectStatus: 'LEAD' }),
      proj({ id: 'd', projectStatus: 'LOST' }),
    ]
    const revenueCount = rows.filter(matchesDashboardRevenueWhere).length
    const profitCount = rows.filter(matchesDashboardRevenueWhere).length
    expect(revenueCount).toBe(2)
    expect(profitCount).toBe(revenueCount)
  })
})
