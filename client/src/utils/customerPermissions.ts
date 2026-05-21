import { Customer, User, UserRole } from '../types'

/**
 * Whether the user may edit this customer on the client.
 * Mirrors PUT /api/customers/:id in src/routes/customers.ts.
 */
export function canEditCustomer(
  customer: Pick<Customer, 'salespersonId'> | null | undefined,
  user: Pick<User, 'id' | 'role'> | null | undefined,
): boolean {
  if (!user) return false
  if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGEMENT) return true
  if (user.role === UserRole.SALES) {
    return customer?.salespersonId != null && customer.salespersonId === user.id
  }
  return false
}
