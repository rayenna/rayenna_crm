import { describe, expect, it } from 'vitest'
import { ProjectStatus, UserRole } from '@prisma/client'
import { projectAccessDeniedMessage, supportTicketAccessDeniedMessage } from './staffAccess'

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

  it('allows admin on any project', () => {
    expect(
      projectAccessDeniedMessage(project, { id: 'admin-1', role: UserRole.ADMIN }),
    ).toBeNull()
  })
})

describe('supportTicketAccessDeniedMessage', () => {
  it('allows operations on Lead-stage tickets', () => {
    expect(
      supportTicketAccessDeniedMessage(project, { id: 'ops-1', role: UserRole.OPERATIONS }),
    ).toBeNull()
  })

  it('still denies sales on another owner’s ticket', () => {
    expect(
      supportTicketAccessDeniedMessage(project, { id: 'sales-2', role: UserRole.SALES }),
    ).toBe('Access denied')
  })

  it('allows sales on their own project’s ticket', () => {
    expect(
      supportTicketAccessDeniedMessage(project, { id: 'sales-1', role: UserRole.SALES }),
    ).toBeNull()
  })
})
