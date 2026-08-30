import { describe, expect, it } from 'vitest'
import { ProjectStatus, UserRole } from '@prisma/client'
import { projectAccessDeniedMessage } from './staffAccess'

const project = {
  id: 'p1',
  salespersonId: 'sales-1',
  projectStatus: ProjectStatus.LEAD,
}

describe('projectAccessDeniedMessage', () => {
  it('denies sales on another owner’s project', () => {
    expect(
      projectAccessDeniedMessage(project, { id: 'sales-2', role: UserRole.SALES }),
    ).toBe('Access denied')
  })

  it('allows sales on their own project', () => {
    expect(
      projectAccessDeniedMessage(project, { id: 'sales-1', role: UserRole.SALES }),
    ).toBeNull()
  })

  it('denies operations on pre-confirmed statuses', () => {
    expect(
      projectAccessDeniedMessage(project, { id: 'ops-1', role: UserRole.OPERATIONS }),
    ).toMatch(/Operations users/)
  })

  it('allows operations on confirmed', () => {
    expect(
      projectAccessDeniedMessage(
        { ...project, projectStatus: ProjectStatus.CONFIRMED },
        { id: 'ops-1', role: UserRole.OPERATIONS },
      ),
    ).toBeNull()
  })

  it('allows finance on any status', () => {
    expect(
      projectAccessDeniedMessage(project, { id: 'fin-1', role: UserRole.FINANCE }),
    ).toBeNull()
  })
})
