import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, useEffect } from 'react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import type { SolarHubUserListResponse } from '../types/solarHub'
import { solarHubTableScrollShell } from '../components/solarHub/tableScrollShell'

export default function SolarHub() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const q = searchParams.get('search')
    if (q) setSearch(q)
  }, [searchParams])

  const queryKey = ['solar-hub-users', search, activeFilter, page]

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (activeFilter === 'active') params.set('active', 'true')
      if (activeFilter === 'inactive') params.set('active', 'false')
      params.set('page', String(page))
      params.set('limit', '50')
      const res = await axiosInstance.get(`/api/admin/solar-hub/users?${params}`)
      return res.data as SolarHubUserListResponse
    },
  })

  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.max(1, Math.ceil(data.total / data.limit))
  }, [data])

  return (
    <>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search username, customer, project #…"
            className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] sm:max-w-md"
          />
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')
              setPage(1)
            }}
            className="rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)]"
          >
            <option value="all">All accounts</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        {isError ? (
          <div className="rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-6 text-center">
            <p className="text-sm font-semibold text-[color:var(--accent-red)]">Could not load Solar Hub users</p>
            <p className="mt-2 text-xs text-[color:var(--text-secondary)]">{getFriendlyApiErrorMessage(error)}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)]"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-16 text-center text-sm text-[color:var(--text-muted)]">Loading…</div>
        ) : (
          <>
            <p className="mb-2 text-xs text-[color:var(--text-muted)]">
              {data?.total ?? 0} account{(data?.total ?? 0) === 1 ? '' : 's'}
              {isFetching ? ' · Updating…' : ''}
            </p>
            <div className={solarHubTableScrollShell}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-left text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Customer / Project</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items ?? []).map((user) => (
                    <tr key={user.id} className="border-b border-[color:var(--border-default)] hover:bg-[color:var(--bg-card-hover)]">
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
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-[color:var(--border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
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
                  className="rounded-lg border border-[color:var(--border-default)] px-3 py-1.5 text-sm disabled:opacity-40"
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
