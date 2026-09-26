import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, useEffect, useRef } from 'react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import type { SolarHubUserListResponse } from '../types/solarHub'
import { solarHubTableScrollShell } from '../components/solarHub/tableScrollShell'
import HubHandoverScriptCard from '../components/solarHub/HubHandoverScriptCard'
import SolarHubUserListFilters from '../components/solarHub/SolarHubUserListFilters'
import { useDebounce } from '../hooks/useDebounce'
import {
  applySolarHubUserListStateToSearchParams,
  buildSolarHubUserListQueryParams,
  defaultSolarHubUserListState,
  parseSolarHubUserListStateFromSearchParams,
  type SolarHubActiveFilter,
  type SolarHubPlantLinkFilter,
  type SolarHubUserSortBy,
} from '../utils/solarHubListQuery'

export default function SolarHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlInit = parseSolarHubUserListStateFromSearchParams(searchParams)

  const [searchInput, setSearchInput] = useState(urlInit.search)
  const debouncedSearch = useDebounce(searchInput, 400)
  const [active, setActive] = useState<SolarHubActiveFilter>(urlInit.active)
  const [inverterBrand, setInverterBrand] = useState(urlInit.inverterBrand)
  const [plantLink, setPlantLink] = useState<SolarHubPlantLinkFilter>(urlInit.plantLink)
  const [sortBy, setSortBy] = useState<SolarHubUserSortBy>(urlInit.sortBy)
  const [page, setPage] = useState(1)
  const skipUrlSyncRef = useRef(true)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, active, inverterBrand, plantLink, sortBy])

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
    })
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on filter values only
  }, [debouncedSearch, active, inverterBrand, plantLink, sortBy])

  const queryKey = ['solar-hub-users', debouncedSearch, active, inverterBrand, plantLink, sortBy, page]

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = buildSolarHubUserListQueryParams({
        search: debouncedSearch,
        active,
        inverterBrand,
        plantLink,
        sortBy,
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

  const clearAllFilters = () => {
    const defaults = defaultSolarHubUserListState()
    setSearchInput(defaults.search)
    setActive(defaults.active)
    setInverterBrand(defaults.inverterBrand)
    setPlantLink(defaults.plantLink)
    setSortBy(defaults.sortBy)
  }

  return (
    <>
      <div className="mb-4">
        <HubHandoverScriptCard />
      </div>

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
        resultTotal={data?.total}
        onClearAll={clearAllFilters}
      />

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
        <div className="py-16 text-center text-sm text-[color:var(--text-muted)]">Loading…</div>
      ) : (
        <>
          <p className="mb-2 text-xs text-[color:var(--text-muted)]">
            {isFetching ? 'Updating…' : '\u00a0'}
          </p>
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
                {(data?.items ?? []).map((user) => {
                  const plantBits: string[] = []
                  if (user.project.solisStationId) plantBits.push('Solis')
                  if (user.project.deyeStationId) plantBits.push('Deye')
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[color:var(--border-default)] hover:bg-[color:var(--bg-card-hover)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/solar-hub/users/${user.id}`}
                          className="font-semibold text-[color:var(--accent-teal)] hover:underline"
                        >
                          {user.username}
                        </Link>
                        {user.isDemo ? (
                          <span className="ml-2 rounded-full bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent-gold)]">
                            DEMO
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        <div>{user.project.customerName}</div>
                        <div className="text-xs text-[color:var(--text-muted)]">
                          Project #{user.project.slNo} · {user.project.projectStatus.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {user.project.inverterBrand?.trim() || (
                          <span className="text-[color:var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {plantBits.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {plantBits.map((label) => (
                              <span
                                key={label}
                                className="rounded-full bg-[color:var(--accent-teal-muted)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent-teal)]"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase text-[color:var(--text-muted)]">
                            Unlinked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">{user.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            user.isActive
                              ? 'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                              : 'bg-[color:var(--bg-muted)] text-[color:var(--text-muted)]'
                          }`}
                        >
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

          {data != null && (data.items?.length ?? 0) === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-6 py-12 text-center">
              <p className="font-semibold text-[color:var(--text-primary)]">No accounts match your filters.</p>
              <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                Try another brand, plant status, or clear filters.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)]"
              >
                Clear filters
              </button>
            </div>
          ) : null}

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
