import { Project, ProjectStatus, User, UserRole } from '../types'

const OPERATIONS_EDIT_STATUSES: ProjectStatus[] = [
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
]

/**
 * Whether the user may edit this project (detail Edit button / form).
 * Mirrors PUT /api/projects/:id role rules at a high level; section-level
 * restrictions (Finance payments-only, Operations lifecycle, etc.) stay in ProjectForm.
 */
export function canEditProject(
  project: Pick<Project, 'projectStatus' | 'salespersonId'> | null | undefined,
  user: Pick<User, 'id' | 'role'> | null | undefined,
): boolean {
  if (!user || !project) return false
  if (project.projectStatus === ProjectStatus.LOST) return false

  if (user.role === UserRole.ADMIN) return true
  if (user.role === UserRole.SALES) {
    return project.salespersonId != null && project.salespersonId === user.id
  }
  if (user.role === UserRole.OPERATIONS) {
    return OPERATIONS_EDIT_STATUSES.includes(project.projectStatus)
  }
  if (user.role === UserRole.FINANCE) return true
  return false
}

export function canDeleteProject(
  project: Pick<Project, 'projectStatus'> | null | undefined,
  user: Pick<User, 'role'> | null | undefined,
): boolean {
  return !!user && user.role === UserRole.ADMIN && !!project
}
