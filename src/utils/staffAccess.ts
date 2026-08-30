import { ProjectStatus, UserRole } from '@prisma/client'
import type { Request, Response } from 'express'
import prisma from '../prisma'

export const OPERATIONS_VISIBLE_PROJECT_STATUSES: ProjectStatus[] = [
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
]

export const SUPPORT_TICKET_QUEUE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.OPERATIONS,
  UserRole.MANAGEMENT,
]

type ProjectAccessSlice = {
  id: string
  salespersonId: string | null
  projectStatus: ProjectStatus
}

export function projectAccessDeniedMessage(
  project: ProjectAccessSlice,
  user: { id: string; role: UserRole } | undefined,
): string | null {
  if (!user) return 'Authentication required'
  if (user.role === UserRole.SALES && project.salespersonId !== user.id) {
    return 'Access denied'
  }
  if (user.role === UserRole.OPERATIONS) {
    if (!OPERATIONS_VISIBLE_PROJECT_STATUSES.includes(project.projectStatus)) {
      return 'Access denied. Operations users can only access projects with status: Confirmed, Installation, Completed, or Completed - Subsidy Credited.'
    }
  }
  return null
}

export async function requireProjectAccess(
  req: Request,
  res: Response,
  projectId: string,
): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, salespersonId: true, projectStatus: true },
  })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return false
  }
  const denied = projectAccessDeniedMessage(project, req.user)
  if (denied) {
    res.status(403).json({ error: denied })
    return false
  }
  return true
}

export async function requireCustomerAccess(
  req: Request,
  res: Response,
  customerId: string,
): Promise<boolean> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, salespersonId: true },
  })
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' })
    return false
  }
  if (req.user?.role !== UserRole.SALES) return true
  if (customer.salespersonId === req.user.id) return true
  const owned = await prisma.project.count({
    where: { customerId, salespersonId: req.user.id },
  })
  if (owned > 0) return true
  res.status(403).json({ error: 'Access denied' })
  return false
}

export function salesProjectListWhere(userId: string): { salespersonId: string } {
  return { salespersonId: userId }
}

export function operationsProjectListWhere(): { projectStatus: { in: ProjectStatus[] } } {
  return { projectStatus: { in: OPERATIONS_VISIBLE_PROJECT_STATUSES } }
}

/** Scope nested resources (invoices, AMC, service tickets) to the same project rules as the list APIs. */
export function nestedResourceListWhere(user: { id: string; role: UserRole }): { project: object } | undefined {
  if (user.role === UserRole.SALES) return { project: salesProjectListWhere(user.id) }
  if (user.role === UserRole.OPERATIONS) return { project: operationsProjectListWhere() }
  return undefined
}
