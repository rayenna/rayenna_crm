import { CustomerType, Prisma, UserRole } from '@prisma/client'
import prisma from '../prisma'

export type CustomerListSortBy = 'createdAt_desc' | 'createdAt_asc' | 'name_asc'

const CUSTOMER_TYPES = new Set<string>(Object.values(CustomerType))

export function parseCustomerTypeParam(raw: unknown): CustomerType | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const v = raw.trim().toUpperCase()
  return CUSTOMER_TYPES.has(v) ? (v as CustomerType) : undefined
}

export function parseCustomerSortBy(raw: unknown): CustomerListSortBy {
  if (raw === 'createdAt_asc' || raw === 'name_asc' || raw === 'createdAt_desc') return raw
  return 'createdAt_desc'
}

export function customerListOrderBy(sortBy: CustomerListSortBy): Prisma.CustomerOrderByWithRelationInput {
  switch (sortBy) {
    case 'createdAt_asc':
      return { createdAt: 'asc' }
    case 'name_asc':
      return { customerNameSortKey: 'asc' }
    case 'createdAt_desc':
    default:
      return { createdAt: 'desc' }
  }
}

function searchOrConditions(search: string): Prisma.CustomerWhereInput[] {
  return [
    { firstName: { contains: search, mode: 'insensitive' } },
    { middleName: { contains: search, mode: 'insensitive' } },
    { lastName: { contains: search, mode: 'insensitive' } },
    { customerName: { contains: search, mode: 'insensitive' } },
    { companyName: { contains: search, mode: 'insensitive' } },
    { customerId: { contains: search, mode: 'insensitive' } },
    { consumerNumber: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search, mode: 'insensitive' } },
    { contactNumbers: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
    { addressLine1: { contains: search, mode: 'insensitive' } },
    { city: { contains: search, mode: 'insensitive' } },
    { state: { contains: search, mode: 'insensitive' } },
    { pinCode: { contains: search, mode: 'insensitive' } },
  ]
}

export type BuildCustomerListWhereArgs = {
  role: UserRole
  userId: string
  search?: unknown
  salespersonId?: unknown
  myCustomers?: unknown
  customerType?: unknown
  /** Prefer `myCustomers=true` for Sales own-book; omit for All. */
}

/**
 * Shared where-clause for GET /api/customers and export endpoints.
 */
export async function buildCustomerListWhere(
  args: BuildCustomerListWhereArgs,
): Promise<Prisma.CustomerWhereInput> {
  const where: Prisma.CustomerWhereInput = {}
  const andParts: Prisma.CustomerWhereInput[] = []

  const customerType = parseCustomerTypeParam(args.customerType)
  if (customerType) {
    andParts.push({ customerType })
  }

  const wantMyOnly = args.role === UserRole.SALES && args.myCustomers === 'true'

  if (wantMyOnly) {
    andParts.push({ salespersonId: args.userId })
  } else if (args.role !== UserRole.SALES && args.salespersonId) {
    const salespersonIdArray = Array.isArray(args.salespersonId)
      ? args.salespersonId
      : [args.salespersonId]
    const validSalespersonIds = salespersonIdArray.filter(
      (id): id is string => typeof id === 'string' && id.trim() !== '',
    )

    if (validSalespersonIds.length > 0) {
      const userProjects = await prisma.project.findMany({
        where: { salespersonId: { in: validSalespersonIds } },
        select: { customerId: true },
        distinct: ['customerId'],
      })
      const customerIdsFromProjects = userProjects.map((p) => p.customerId)
      const orConditions: Prisma.CustomerWhereInput[] = [
        { salespersonId: { in: validSalespersonIds } },
      ]
      if (customerIdsFromProjects.length > 0) {
        orConditions.push({ id: { in: customerIdsFromProjects } })
      }
      andParts.push({ OR: orConditions })
    }
  }

  const search =
    typeof args.search === 'string' && args.search.trim() ? args.search.trim() : ''
  if (search) {
    andParts.push({ OR: searchOrConditions(search) })
  }

  if (andParts.length === 1) {
    return andParts[0]!
  }
  if (andParts.length > 1) {
    where.AND = andParts
  }
  return where
}
