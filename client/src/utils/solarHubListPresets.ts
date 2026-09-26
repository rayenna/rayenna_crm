import type { SolarHubUserListFilterState } from './solarHubListQuery'
import { DEFAULT_SOLAR_HUB_USER_SORT } from './solarHubListQuery'

export type SolarHubPresetId =
  | 'unlinked'
  | 'inactive'
  | 'never-logged-in'
  | 'solis-linked'
  | 'deye-linked'

export type SolarHubPresetDef = {
  id: SolarHubPresetId
  label: string
  description: string
}

export const SOLAR_HUB_PRESET_DEFS: SolarHubPresetDef[] = [
  {
    id: 'unlinked',
    label: 'Unlinked plants',
    description: 'Active accounts with no Solis or Deye plant ID',
  },
  {
    id: 'inactive',
    label: 'Inactive',
    description: 'Deactivated Hub accounts',
  },
  {
    id: 'never-logged-in',
    label: 'Never logged in',
    description: 'Accounts that have never signed into the Hub',
  },
  {
    id: 'solis-linked',
    label: 'Solis linked',
    description: 'SolisCloud plant ID present',
  },
  {
    id: 'deye-linked',
    label: 'Deye linked',
    description: 'DeyeCloud plant ID present',
  },
]

export const SOLAR_HUB_LAST_PRESET_KEY = 'rayenna_solar_hub_last_preset'

export type SolarHubPresetPatch = Pick<
  SolarHubUserListFilterState,
  'active' | 'inverterBrand' | 'plantLink' | 'sortBy' | 'neverLoggedIn'
>

export function solarHubPresetPatch(id: SolarHubPresetId): SolarHubPresetPatch {
  const base: SolarHubPresetPatch = {
    active: 'all',
    inverterBrand: '',
    plantLink: '',
    sortBy: DEFAULT_SOLAR_HUB_USER_SORT,
    neverLoggedIn: false,
  }

  switch (id) {
    case 'unlinked':
      return { ...base, active: 'active', plantLink: 'none' }
    case 'inactive':
      return { ...base, active: 'inactive' }
    case 'never-logged-in':
      return { ...base, neverLoggedIn: true, sortBy: 'createdAt_desc' }
    case 'solis-linked':
      return { ...base, plantLink: 'solis' }
    case 'deye-linked':
      return { ...base, plantLink: 'deye' }
    default:
      return base
  }
}

/** Detect which preset matches current filters (search ignored). */
export function matchSolarHubPreset(
  state: Pick<
    SolarHubUserListFilterState,
    'active' | 'inverterBrand' | 'plantLink' | 'sortBy' | 'neverLoggedIn'
  >,
): SolarHubPresetId | null {
  for (const def of SOLAR_HUB_PRESET_DEFS) {
    const patch = solarHubPresetPatch(def.id)
    if (
      state.active === patch.active &&
      state.inverterBrand === patch.inverterBrand &&
      state.plantLink === patch.plantLink &&
      state.sortBy === patch.sortBy &&
      Boolean(state.neverLoggedIn) === Boolean(patch.neverLoggedIn)
    ) {
      return def.id
    }
  }
  return null
}

export function isSolarHubPresetId(v: string | null): v is SolarHubPresetId {
  return SOLAR_HUB_PRESET_DEFS.some((d) => d.id === v)
}
