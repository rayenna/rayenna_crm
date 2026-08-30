import { UserRole } from '../types'

export const ROUTE_ROLES = {
  allStaff: [
    UserRole.ADMIN,
    UserRole.SALES,
    UserRole.OPERATIONS,
    UserRole.FINANCE,
    UserRole.MANAGEMENT,
  ],
  supportTickets: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.MANAGEMENT],
  solarHub: [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.MANAGEMENT],
  tallyExport: [UserRole.ADMIN, UserRole.FINANCE],
  lostDeals: [UserRole.ADMIN, UserRole.MANAGEMENT],
  users: [UserRole.ADMIN],
  auditSecurity: [UserRole.ADMIN],
} as const
