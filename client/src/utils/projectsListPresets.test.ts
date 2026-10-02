import { describe, expect, it } from 'vitest'
import { ProjectStatus, UserRole } from '../types'
import {
  buildProjectsPresetPatch,
  openPipelineStatusValues,
  projectsPresetsForRole,
} from './projectsListPresets'
import {
  applyProjectsSlimCols,
  clearProjectsSlimCols,
  countProjectsTableVisibleCols,
  isProjectsSlimCols,
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
    const slim = projectsTableTotalRemWidth('comfortable', [
      'dh',
      'segment',
      'capacity',
      'order',
      'payment',
      'lead',
      'confirm',
    ])
    expect(slim).toBeLessThan(full)
  })

  it('counts visible columns from hidden prefs (Project + Stage always on)', () => {
    expect(countProjectsTableVisibleCols([])).toBe(9)
    expect(countProjectsTableVisibleCols(['segment', 'lead', 'confirm'])).toBe(6)
    expect(
      countProjectsTableVisibleCols([
        'dh',
        'segment',
        'capacity',
        'order',
        'payment',
        'lead',
        'confirm',
      ]),
    ).toBe(2)
  })

  it('Slim preset hides Segment / Lead / Confirm and can clear them', () => {
    expect(isProjectsSlimCols([])).toBe(false)
    const slim = applyProjectsSlimCols(['dh'])
    expect(slim).toEqual(['dh', 'segment', 'lead', 'confirm'])
    expect(isProjectsSlimCols(slim)).toBe(true)
    expect(clearProjectsSlimCols(slim)).toEqual(['dh'])
  })
})
