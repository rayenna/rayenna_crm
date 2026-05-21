/** Build query params for GET /api/customers and export endpoints (same filters, optional pagination). */

export type CustomerListFilterInput = {
  search?: string
  page?: number
  limit?: number
  isSalesUser: boolean
  customerFilter: 'all' | 'my'
  selectedSalespersonIds: string[]
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

  return params
}

export function buildCustomerListFilterInput(
  debouncedSearch: string,
  page: number,
  isSalesUser: boolean,
  customerFilter: 'all' | 'my',
  selectedSalespersonIds: string[],
): CustomerListFilterInput {
  return {
    search: debouncedSearch,
    page,
    limit: 25,
    isSalesUser,
    customerFilter,
    selectedSalespersonIds,
  }
}

/** Export uses list filters but returns all matching rows (no page/limit). */
export function buildCustomerExportQueryParams(
  filters: Omit<CustomerListFilterInput, 'page' | 'limit'>,
): URLSearchParams {
  return buildCustomerListQueryParams({ ...filters, page: undefined, limit: undefined })
}
