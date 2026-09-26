import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, useEffect, useRef } from 'react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import type { SolarHubUserListResponse } from '../types/solarHub'
import { solarHubTableScrollShell } from '../components/solarHub/tableScrollShell'
import HubHandoverScriptCard from '../components/solarHub/HubHandoverScriptCard'
import SolarHubUserListFilters from '../components/solarHub/SolarHubUserListFilters'
import SolarHubListHowToRead from '../components/solarHub/SolarHubListHowToRead'
import SolarHubUsersMobileCardList from '../components/solarHub/SolarHubUsersMobileCardList'
import SolarHubQuickPresets from '../components/solarHub/SolarHubQuickPresets'
import SolarHubListSkeleton from '../components/solarHub/SolarHubListSkeleton'
import { useSolarHubNarrowList } from '../components/solarHub/useSolarHubNarrowList'
import { useDebounce } from '../hooks/useDebounce'
import { setSessionStorageItem } from '../lib/safeLocalStorage'
import {
  applySolarHubUserListStateToSearchParams,
  buildSolarHubUserListQueryParams,
  defaultSolarHubUserListState,
  parseSolarHubUserListStateFromSearchParams,
  type SolarHubActiveFilter,
  type SolarHubPlantLinkFilter,
  type SolarHubUserSortBy,
} from '../utils/solarHubListQuery'
import {
  SOLAR_HUB_LAST_PRESET_KEY,
  SOLAR_HUB_PRESET_DEFS,
  matchSolarHubPreset,
  solarHubPresetPatch,
  type SolarHubPresetId,
} from '../utils/solarHubListPresets'

const LIST_VIEW_KEY = 'rayenna_solar_hub_users_list_view'

export default function SolarHub() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlInit = parseSolarHubUserListStateFromSearchParams(searchParams)
  const isNarrow = useSolarHubNarrowList()

  const [searchInput, setSearchInput] = useState(urlInit.search)
  const debouncedSearch = useDebounce(searchInput, 400)
  const [active, setActive] = useState<SolarHubActiveFilter>(urlInit.active)
  const [inverterBrand, setInverterBrand] = useState(urlInit.inverterBrand)
  const [plantLink, setPlantLink] = useState<SolarHubPlantLinkFilter>(urlInit.plantLink)
  const [sortBy, setSortBy] = useState<SolarHubUserSortBy>(urlInit.sortBy)
  const [neverLoggedIn, setNeverLoggedIn] = useState(urlInit.neverLoggedIn)
  const [page, setPage] = useState(1)
  const skipUrlSyncRef = useRef(true)
  const [listViewOverride, setListViewOverride] = useState<'cards' | 'table' | null>(() => {
    try {
      const v = sessionStorage.getItem(LIST_VIEW_KEY)
      return v === 'cards' || v === 'table' ? v : null
    } catch {
      return null
    }
  })

  const listViewMode: 'cards' | 'table' = listViewOverride ?? (isNarrow ? 'cards' : 'table')

  const setListViewMode = (mode: 'cards' | 'table') => {
    setListViewOverride(mode)
    setSessionStorageItem(LIST_VIEW_KEY, mode)
  }

  const activePresetId = matchSolarHubPreset({
    active,
    inverterBrand,
    plantLink,
    sortBy,
    neverLoggedIn,
  })

  const applyPreset = (id: SolarHubPresetId) => {
    const patch = solarHubPresetPatch(id)
    setActive(patch.active)
    setInverterBrand(patch.inverterBrand)
    setPlantLink(patch.plantLink)
    setSortBy(patch.sortBy)
    setNeverLoggedIn(patch.neverLoggedIn)
    setSessionStorageItem(SOLAR_HUB_LAST_PRESET_KEY, id)
  }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, active, inverterBrand, plantLink, sortBy, neverLoggedIn])

  useEffect(() => {
    if (window.location.hash !== '#hub-handover') return
    const el = document.getElementById('hub-handover')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false
      return
    }
    const next = applySolarHubUserListStateToSearchParams(searchParams, {
      search: debouncedSearch,
      active,
      inverterBrand,
      plantLink,
      sortBy,
      neverLoggedIn,
    })
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on filter values only
  }, [debouncedSearch, active, inverterBrand, plantLink, sortBy, neverLoggedIn])

  const queryKey = [
    'solar-hub-users',
    debouncedSearch,
    active,
    inverterBrand,
    plantLink,
    sortBy,
    neverLoggedIn,
    page,
  ]

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = buildSolarHubUserListQueryParams({
        search: debouncedSearch,
        active,
        inverterBrand,
        plantLink,
        sortBy,
        neverLoggedIn,
        page,
        limit: 50,
      })
      const res = await axiosInstance.get(`/api/admin/solar-hub/users?${params}`)
      return res.data as SolarHubUserListResponse
    },
  })

  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.max(1, Math.ceil(data.total / data.limit))
  }, [data])

  const items = data?.items ?? []
  const isEmpty = data != null && items.length === 0

  const clearAllFilters = () => {
    const defaults = defaultSolarHubUserListState()
    setSearchInput(defaults.search)
    setActive(defaults.active)
    setInverterBrand(defaults.inverterBrand)
    setPlantLink(defaults.plantLink)
    setSortBy(defaults.sortBy)
    setNeverLoggedIn(defaults.neverLoggedIn)
  }

  const emptySlot = (
    <div className="mx-auto max-w-md text-center">
      <p className="font-semibold text-[color:var(--text-primary)]">No accounts match your filters.</p>
      <p className="mt-2 text-xs text-[color:var(--text-muted)]">
        Try another brand, plant status, or clear filters. Unlinked means no Solis/Deye plant ID yet.
      </p>
      <button
        type="button"
        onClick={clearAllFilters}
        className="mt-4 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)]"
      >
        Clear filters
      </button>
    </div>
  )

  return (
    <>
      <div className="mb-4" id="hub-handover">
        <HubHandoverScriptCard compact />
      </div>

      <SolarHubQuickPresets
        presets={SOLAR_HUB_PRESET_DEFS}
        activeId={activePresetId}
        onSelect={applyPreset}
      />

      <SolarHubUserListFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        active={active}
        onActiveChange={setActive}
        inverterBrand={inverterBrand}
        onInverterBrandChange={setInverterBrand}
        plantLink={plantLink}
        onPlantLinkChange={setPlantLink}
        neverLoggedIn={neverLoggedIn}
        onNeverLoggedInChange={setNeverLoggedIn}
        resultTotal={data?.total}
        onClearAll={clearAllFilters}
      />

      <SolarHubListHowToRead />

      {isError ? (
        <div className="rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-6 text-center">
          <p className="text-sm font-semibold text-[color:var(--accent-red)]">Could not load Solar Hub users</p>
          <p className="mt-2 text-xs text-[color:var(--text-secondary)]">{getFriendlyApiErrorMessage(error)}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 min-h-[44px] touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)]"
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <SolarHubListSkeleton rows={6} variant={listViewMode === 'table' ? 'table' : 'cards'} />
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[color:var(--text-muted)]">
              {isFetching ? 'Updating…' : '\u00a0'}
            </p>
            {isNarrow ? (
              <div
                className="inline-flex rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-0.5"
                role="group"
                aria-label="List layout"
              >
                <button
                  type="button"
                  onClick={() => setListViewMode('cards')}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    listViewMode === 'cards'
                      ? 'bg-[color:var(--bg-card-hover)] text-[color:var(--text-primary)] ring-1 ring-[color:var(--accent-gold-border)]'
                      : 'text-[color:var(--text-muted)]'
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setListViewMode('table')}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    listViewMode === 'table'
                      ? 'bg-[color:var(--bg-card-hover)] text-[color:var(--text-primary)] ring-1 ring-[color:var(--accent-gold-border)]'
                      : 'text-[color:var(--text-muted)]'
                  }`}
                >
                  Table
                </button>
              </div>
            ) : null}
          </div>

          {listViewMode === 'cards' ? (
            <SolarHubUsersMobileCardList
              users={items}
              onOpen={(id) => navigate(`/solar-hub/users/${id}`)}
              emptySlot={emptySlot}
            />
          ) : isEmpty ? (
            emptySlot
          ) : (
            <div className={solarHubTableScrollShell}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-left text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Customer / Project</th>
                    <th className="px-4 py-3">Inverter</th>
                    <th className="px-4 py-3">Plant</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => {
                    const plantBits: string[] = []
                    if (user.project.solisStationId) plantBits.push('Solis')
                    if (user.project.deyeStationId) plantBits.push('Deye')
                    const unlinked = plantBits.length === 0
                    return (
                      <tr
                        key={user.id}
                        className="cursor-pointer border-b border-[color:var(--border-default)] hover:bg-[color:var(--bg-card-hover)]"
                        onClick={() => navigate(`/solar-hub/users/${user.id}`)}
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/solar-hub/users/${user.id}`}
                            className="font-semibold text-[color:var(--text-primary)] hover:text-[color:var(--accent-teal)] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {user.username}
                          </Link>
                          {user.isDemo ? (
                            <span className="ml-2 rounded-full bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent-gold)]">
                              DEMO
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[color:var(--text-secondary)]">{user.project.customerName}</div>
                          <div className="text-xs text-[color:var(--text-muted)]">
                            Project #{user.project.slNo} · {user.project.projectStatus.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-muted)]">
                          {user.project.inverterBrand?.trim() || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {unlinked ? (
                            <span className="rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--accent-gold)]">
                              Unlinked
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {plantBits.map((label) => (
                                <span
                                  key={label}
                                  className="rounded-md border border-[color:var(--border-default)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--text-secondary)]"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-muted)]">{user.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--text-muted)]">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                user.isActive
                                  ? 'bg-[color:var(--accent-teal)]'
                                  : 'bg-[color:var(--text-muted)] opacity-50'
                              }`}
                              aria-hidden
                            />
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-muted)]">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="min-h-[44px] touch-manipulation rounded-lg border border-[color:var(--border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-[color:var(--text-muted)]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="min-h-[44px] touch-manipulation rounded-lg border border-[color:var(--border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  )
}
