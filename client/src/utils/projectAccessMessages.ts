import { Project, ProjectStatus, User, UserRole } from '../types'
import { canEditProject } from './projectPermissions'

export type ProjectAccessNotice = {
  variant: 'info' | 'warning'
  title: string
  message: string
}

/** Banner on Project Detail when the page is read-only or partially locked. */
export function getProjectDetailAccessNotice(
  project: Pick<Project, 'projectStatus' | 'salespersonId'> | null | undefined,
  user: Pick<User, 'id' | 'role'> | null | undefined,
): ProjectAccessNotice | null {
  if (!project || !user) return null

  if (project.projectStatus === ProjectStatus.LOST) {
    return {
      variant: 'warning',
      title: 'Lost project',
      message:
        'This project is closed as Lost. Details are read-only. Only an Admin can delete it.',
    }
  }

  if (canEditProject(project, user)) return null

  if (user.role === UserRole.MANAGEMENT) {
    return {
      variant: 'info',
      title: 'View only',
      message:
        'Management can view project details but cannot edit them. Ask Sales or Admin to update this project.',
    }
  }

  if (user.role === UserRole.SALES) {
    return {
      variant: 'info',
      title: 'View only',
      message:
        'You can view this project because it is in the company list, but only the assigned salesperson (or Admin) can edit it.',
    }
  }

  if (user.role === UserRole.OPERATIONS) {
    return {
      variant: 'info',
      title: 'View only',
      message:
        'Operations can edit projects from Confirmed Order onward. Earlier stages are view-only here.',
    }
  }

  if (user.role === UserRole.FINANCE) {
    return {
      variant: 'info',
      title: 'Payments',
      message: 'Use Edit to update Payment Tracking. Other sections stay read-only for Finance.',
    }
  }

  return {
    variant: 'info',
    title: 'View only',
    message: 'You do not have permission to edit this project.',
  }
}

/** Banner at top of Project Form (edit mode). */
export function getProjectFormAccessNotice(
  project: Pick<Project, 'projectStatus' | 'salespersonId'> | null | undefined,
  user: Pick<User, 'id' | 'role'> | null | undefined,
  opts: { isEdit: boolean; isFinanceOnly: boolean; isLostLocked: boolean },
): ProjectAccessNotice | null {
  if (!opts.isEdit || !project || !user) return null

  if (opts.isLostLocked) {
    return {
      variant: 'warning',
      title: 'Lost project locked',
      message:
        'This project is already Lost and cannot be changed here. Only an Admin can delete it.',
    }
  }

  if (opts.isFinanceOnly) {
    return {
      variant: 'info',
      title: 'Finance edit mode',
      message:
        'Only Payment Tracking is editable. Sales, lifecycle, segment, and attachments are hidden or read-only.',
    }
  }

  if (user.role === UserRole.MANAGEMENT && canEditProject(project, user)) {
    return null
  }

  if (user.role === UserRole.OPERATIONS && canEditProject(project, user)) {
    return {
      variant: 'info',
      title: 'Operations',
      message:
        'You can update lifecycle milestones and financing. Sales & Commercial fields may be read-only depending on stage.',
    }
  }

  if (user.role === UserRole.SALES && canEditProject(project, user)) {
    return null
  }

  return null
}
