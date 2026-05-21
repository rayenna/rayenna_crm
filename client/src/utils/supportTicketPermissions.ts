import { UserRole } from '../types'

/** Roles that may create tickets, add follow-ups, and close tickets (matches API). */
export const SUPPORT_TICKET_MANAGER_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.OPERATIONS,
  UserRole.MANAGEMENT,
]

export function canManageSupportTickets(hasRole: (roles: UserRole[]) => boolean): boolean {
  return hasRole(SUPPORT_TICKET_MANAGER_ROLES)
}

export function canDeleteSupportTickets(hasRole: (roles: UserRole[]) => boolean): boolean {
  return hasRole([UserRole.ADMIN])
}
