import { INVERTER_BRAND_OPTIONS } from '../constants/inverterBrands'

export type SolarHubActiveFilter = 'all' | 'active' | 'inactive'
export type SolarHubPlantLinkFilter = '' | 'solis' | 'deye' | 'none'
export type SolarHubUserSortBy =
  | 'default'
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'lastLogin_desc'
  | 'username_asc'

export const SOLAR_HUB_USER_SORT_OPTIONS: { value: SolarHubUserSortBy; label: string }[] = [
  { value: 'default', label: 'Active first' },
  { value: 'createdAt_desc', label: 'Newest first' },
  { value: 'createdAt_asc', label: 'Oldest first' },
  { value: 'lastLogin_desc', label: 'Last login' },
  { value: 'username_asc', label: 'Username A–Z' },
]

export const DEFAULT_SOLAR_HUB_USER_SORT: SolarHubUserSortBy = 'default'

/** Brands shown as quick chips; full list remains in the select. */
export const SOLAR_HUB_INVERTER_QUICK_BRANDS = ['Solis', 'Deye', 'Growatt', 'GoodWe'] as const

export const SOLAR_HUB_INVERTER_BRAND_OPTIONS = [...INVERTER_BRAND_OPTIONS]

export type SolarHubUserListFilterState = {
  search: string
  active: SolarHubActiveFilter
  inverterBrand: string
  plantLink: SolarHubPlantLinkFilter
  sortBy: SolarHubUserSortBy
}

export function buildSolarHubUserListQueryParams(
  state: SolarHubUserListFilterState & { page: number; limit?: number },
): URLSearchParams {
  const params = new URLSearchParams()
  if (state.search.trim()) params.set('search', state.search.trim())
  if (state.active === 'active') params.set('active', 'true')
  if (state.active === 'inactive') params.set('active', 'false')
  if (state.inverterBrand.trim()) params.set('inverterBrand', state.inverterBrand.trim())
  if (state.plantLink) params.set('plantLink', state.plantLink)
  if (state.sortBy && state.sortBy !== DEFAULT_SOLAR_HUB_USER_SORT) {
    params.set('sortBy', state.sortBy)
  } else {
    params.set('sortBy', DEFAULT_SOLAR_HUB_USER_SORT)
  }
  params.set('page', String(state.page))
  params.set('limit', String(state.limit ?? 50))
  return params
}

export function parseSolarHubUserListStateFromSearchParams(
  params: URLSearchParams,
): SolarHubUserListFilterState {
  const activeRaw = params.get('active')
  const plantRaw = params.get('plant') || params.get('plantLink') || ''
  const sortRaw = params.get('sort') || params.get('sortBy') || ''
  const brand = params.get('inverter') || params.get('inverterBrand') || ''

  let active: SolarHubActiveFilter = 'all'
  if (activeRaw === 'true' || activeRaw === 'active') active = 'active'
  if (activeRaw === 'false' || activeRaw === 'inactive') active = 'inactive'

  const plantLink: SolarHubPlantLinkFilter =
    plantRaw === 'solis' || plantRaw === 'deye' || plantRaw === 'none' ? plantRaw : ''

  const sortBy: SolarHubUserSortBy = (
    [
      'default',
      'createdAt_desc',
      'createdAt_asc',
      'lastLogin_desc',
      'username_asc',
    ] as const
  ).includes(sortRaw as SolarHubUserSortBy)
    ? (sortRaw as SolarHubUserSortBy)
    : DEFAULT_SOLAR_HUB_USER_SORT

  return {
    search: params.get('q') || params.get('search') || '',
    active,
    inverterBrand: brand,
    plantLink,
    sortBy,
  }
}

export function applySolarHubUserListStateToSearchParams(
  prev: URLSearchParams,
  state: SolarHubUserListFilterState,
): URLSearchParams {
  const next = new URLSearchParams(prev)
  for (const key of ['q', 'search', 'active', 'inverter', 'inverterBrand', 'plant', 'plantLink', 'sort', 'sortBy']) {
    next.delete(key)
  }

  if (state.search.trim()) next.set('q', state.search.trim())
  if (state.active === 'active') next.set('active', 'true')
  if (state.active === 'inactive') next.set('active', 'false')
  if (state.inverterBrand.trim()) next.set('inverter', state.inverterBrand.trim())
  if (state.plantLink) next.set('plant', state.plantLink)
  if (state.sortBy !== DEFAULT_SOLAR_HUB_USER_SORT) next.set('sort', state.sortBy)

  return next
}

export function defaultSolarHubUserListState(): SolarHubUserListFilterState {
  return {
    search: '',
    active: 'all',
    inverterBrand: '',
    plantLink: '',
    sortBy: DEFAULT_SOLAR_HUB_USER_SORT,
  }
}
