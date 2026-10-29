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
  reports: [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE],
  salesReview: [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES],
  deliveryControl: [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES, UserRole.OPERATIONS],
  collectionsCash: [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.FINANCE, UserRole.SALES],
  users: [UserRole.ADMIN],
  auditSecurity: [UserRole.ADMIN],
} as const
