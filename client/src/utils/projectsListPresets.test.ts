import { describe, expect, it } from 'vitest'
import { ProjectStatus, UserRole } from '../types'
import {
  buildProjectsPresetPatch,
  openPipelineStatusValues,
  projectsPresetsForRole,
} from './projectsListPresets'
import {
  countProjectsTableVisibleCols,
  projectsTableTotalRemWidth,
} from './projectsListPrefs'

describe('projectsListPresets', () => {
  const allStatuses = Object.values(ProjectStatus)

  it('exposes five presets for all roles', () => {
    expect(projectsPresetsForRole(UserRole.ADMIN)).toHaveLength(5)
    expect(projectsPresetsForRole(UserRole.OPERATIONS)).toHaveLength(5)
  })

  it('open pipeline excludes completed and lost', () => {
    const open = openPipelineStatusValues(allStatuses)
    expect(open).toContain(ProjectStatus.CONFIRMED)
    expect(open).not.toContain(ProjectStatus.COMPLETED)
    expect(open).not.toContain(ProjectStatus.LOST)
  })

  it('buildProjectsPresetPatch sets outstanding payment', () => {
    const patch = buildProjectsPresetPatch('outstanding-payment', {
      defaultStatusValues: [ProjectStatus.CONFIRMED],
      allowedStatusValues: allStatuses,
    })
    expect(patch.paymentStatus).toEqual(['PARTIAL', 'PENDING'])
    expect(patch.availingLoan).toBe(false)
  })

  it('buildProjectsPresetPatch sets needs review', () => {
    const patch = buildProjectsPresetPatch('needs-review', {
      defaultStatusValues: [ProjectStatus.LEAD, ProjectStatus.CONFIRMED],
      allowedStatusValues: allStatuses,
    })
    expect(patch.dataSenseNeedsReview).toBe(true)
    expect(patch.status).toEqual([ProjectStatus.LEAD, ProjectStatus.CONFIRMED])
  })
})

describe('projectsListPrefs', () => {
  it('shrinks total width when optional columns are hidden', () => {
    const full = projectsTableTotalRemWidth('comfortable', [])
    const slim = projectsTableTotalRemWidth('comfortable', ['segment', 'lead', 'confirm'])
    expect(slim).toBeLessThan(full)
  })

  it('counts visible columns with viewport + hidden prefs', () => {
    expect(countProjectsTableVisibleCols(1200, [])).toBe(9)
    expect(countProjectsTableVisibleCols(1200, ['segment', 'lead', 'confirm'])).toBe(6)
    expect(countProjectsTableVisibleCols(700, [])).toBe(7)
  })
})
