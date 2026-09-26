import type { CustomerType } from './customerRecord'

/** Server-supported customer list sort keys. */
export type CustomerListSortBy = 'createdAt_desc' | 'createdAt_asc' | 'name_asc'

export const CUSTOMER_LIST_SORT_OPTIONS: { value: CustomerListSortBy; label: string }[] = [
  { value: 'createdAt_desc', label: 'Newest first' },
  { value: 'createdAt_asc', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
]

export const DEFAULT_CUSTOMER_LIST_SORT: CustomerListSortBy = 'createdAt_desc'

/** Build query params for GET /api/customers and export endpoints (same filters, optional pagination). */

export type CustomerListFilterInput = {
  search?: string
  page?: number
  limit?: number
  isSalesUser: boolean
  customerFilter: 'all' | 'my'
  selectedSalespersonIds: string[]
  customerType?: CustomerType | ''
  sortBy?: CustomerListSortBy
}

export function buildCustomerListQueryParams(input: CustomerListFilterInput): URLSearchParams {
  const params = new URLSearchParams()

  if (input.search?.trim()) {
    params.append('search', input.search.trim())
  }

  if (input.page != null) {
    params.append('page', String(input.page))
  }
  if (input.limit != null) {
    params.append('limit', String(input.limit))
  }

  if (input.isSalesUser) {
    if (input.customerFilter === 'my') {
      params.append('myCustomers', 'true')
    }
  } else if (input.selectedSalespersonIds.length > 0) {
    for (const id of input.selectedSalespersonIds) {
      const trimmed = id?.trim()
      if (trimmed) params.append('salespersonId', trimmed)
    }
  }

  if (input.customerType) {
    params.append('customerType', input.customerType)
  }

  const sortBy = input.sortBy || DEFAULT_CUSTOMER_LIST_SORT
  params.append('sortBy', sortBy)

  return params
}

export function buildCustomerListFilterInput(
  debouncedSearch: string,
  page: number,
  isSalesUser: boolean,
  customerFilter: 'all' | 'my',
  selectedSalespersonIds: string[],
  customerType: CustomerType | '' = '',
  sortBy: CustomerListSortBy = DEFAULT_CUSTOMER_LIST_SORT,
): CustomerListFilterInput {
  return {
    search: debouncedSearch,
    page,
    limit: 25,
    isSalesUser,
    customerFilter,
    selectedSalespersonIds,
    customerType,
    sortBy,
  }
}

/** Export uses list filters but returns all matching rows (no page/limit). */
export function buildCustomerExportQueryParams(
  filters: Omit<CustomerListFilterInput, 'page' | 'limit'>,
): URLSearchParams {
  return buildCustomerListQueryParams({ ...filters, page: undefined, limit: undefined })
}

const VALID_TYPES = new Set(['RESIDENTIAL', 'APARTMENT', 'COMMERCIAL'])
const VALID_SORT = new Set(['createdAt_desc', 'createdAt_asc', 'name_asc'])

export function parseCustomerListStateFromSearchParams(params: URLSearchParams): {
  search: string
  customerFilter: 'all' | 'my'
  selectedSalespersonIds: string[]
  customerType: CustomerType | ''
  sortBy: CustomerListSortBy
} {
  const typeRaw = (params.get('type') || '').toUpperCase()
  const sortRaw = params.get('sort') || ''
  const scope = params.get('scope')
  const sp = params.getAll('sp').filter(Boolean)

  return {
    search: params.get('q') || '',
    customerFilter: scope === 'all' ? 'all' : 'my',
    selectedSalespersonIds: sp,
    customerType: VALID_TYPES.has(typeRaw) ? (typeRaw as CustomerType) : '',
    sortBy: VALID_SORT.has(sortRaw) ? (sortRaw as CustomerListSortBy) : DEFAULT_CUSTOMER_LIST_SORT,
  }
}

/** Sync list filters to the URL (keeps `new=1` and other unrelated keys). */
export function applyCustomerListStateToSearchParams(
  prev: URLSearchParams,
  state: {
    search: string
    customerFilter: 'all' | 'my'
    selectedSalespersonIds: string[]
    customerType: CustomerType | ''
    sortBy: CustomerListSortBy
    isSalesUser: boolean
  },
): URLSearchParams {
  const next = new URLSearchParams(prev)
  for (const key of ['q', 'type', 'sort', 'scope', 'sp']) {
    next.delete(key)
  }

  if (state.search.trim()) next.set('q', state.search.trim())
  if (state.customerType) next.set('type', state.customerType)
  if (state.sortBy !== DEFAULT_CUSTOMER_LIST_SORT) next.set('sort', state.sortBy)

  if (state.isSalesUser) {
    if (state.customerFilter === 'all') next.set('scope', 'all')
  } else if (state.selectedSalespersonIds.length > 0) {
    for (const id of state.selectedSalespersonIds) {
      if (id.trim()) next.append('sp', id.trim())
    }
  }

  return next
}
