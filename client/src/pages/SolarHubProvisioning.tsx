import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { UserPlus } from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import type { BulkProvisionSummary, ProvisioningGapListResponse } from '../types/solarHub'
import { solarHubTableScrollShell } from '../components/solarHub/tableScrollShell'

function formatSummary(summary: BulkProvisionSummary): string {
  const parts: string[] = []
  if (summary.created) parts.push(`${summary.created} created`)
  if (summary.reactivated) parts.push(`${summary.reactivated} reactivated`)
  if (summary.synced) parts.push(`${summary.synced} synced`)
  if (summary.unchanged) parts.push(`${summary.unchanged} unchanged`)
  if (summary.skipped) parts.push(`${summary.skipped} skipped`)
  if (summary.errors.length) parts.push(`${summary.errors.length} errors`)
  return parts.length ? parts.join(', ') : 'No changes'
}

export default function SolarHubProvisioning() {
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const canManage = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])
  const isAdmin = hasRole([UserRole.ADMIN])

  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['solar-hub-provisioning-gaps', page],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '50')
      const res = await axiosInstance.get(`/api/admin/solar-hub/provisioning/gaps?${params}`)
      return res.data as ProvisioningGapListResponse
    },
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['solar-hub-provisioning-gaps'] })
    void queryClient.invalidateQueries({ queryKey: ['solar-hub-users'] })
  }

  const provisionOneMutation = useMutation({
    mutationFn: (projectId: string) =>
      axiosInstance.post(`/api/admin/solar-hub/projects/${projectId}/provision`),
    onSuccess: (res) => {
      toast.success(`Provisioned: ${res.data.action}`)
      setSelected(new Set())
      invalidate()
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const bulkMutation = useMutation({
    mutationFn: (projectIds: string[]) =>
      axiosInstance.post('/api/admin/solar-hub/provisioning/bulk', { projectIds }),
    onSuccess: (res) => {
      toast.success(formatSummary(res.data as BulkProvisionSummary))
      setSelected(new Set())
      invalidate()
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const provisionAllMutation = useMutation({
    mutationFn: () => axiosInstance.post('/api/admin/solar-hub/provisioning/provision-all'),
    onSuccess: (res) => {
      toast.success(formatSummary(res.data as BulkProvisionSummary))
      setSelected(new Set())
      invalidate()
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.max(1, Math.ceil(data.total / data.limit))
  }, [data])

  const pageIds = useMemo(() => (data?.items ?? []).map((i) => i.projectId), [data])
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))

  const toggleAllPage = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const toggleOne = (projectId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const busy =
    provisionOneMutation.isPending || bulkMutation.isPending || provisionAllMutation.isPending

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--text-muted)]">
          Completed projects without a Solar Hub login
        </p>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={selected.size === 0 || busy}
              onClick={() => bulkMutation.mutate([...selected])}
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4 text-[color:var(--accent-teal)]" />
              Provision selected ({selected.size})
            </button>
            {isAdmin ? (
              <button
                type="button"
                disabled={busy || (data?.total ?? 0) === 0}
                onClick={() => {
                  if (
                    window.confirm(
                      `Provision Hub accounts for all ${data?.total ?? 0} gap project(s)? This may take a minute.`,
                    )
                  ) {
                    provisionAllMutation.mutate()
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)] disabled:opacity-50"
              >
                Provision all gaps
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isError ? (
        <div className="rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-6 text-center">
          <p className="text-sm font-semibold text-[color:var(--accent-red)]">Could not load provisioning gaps</p>
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
            {data?.total ?? 0} project{(data?.total ?? 0) === 1 ? '' : 's'} missing Hub account
            {isFetching ? ' · Updating…' : ''}
          </p>
          <div className={solarHubTableScrollShell}>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-left text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                  {canManage ? (
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAllPage}
                        aria-label="Select all on page"
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage ? <th className="px-4 py-3">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <tr
                    key={row.projectId}
                    className="border-b border-[color:var(--border-default)] hover:bg-[color:var(--bg-card-hover)]"
                  >
                    {canManage ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(row.projectId)}
                          onChange={() => toggleOne(row.projectId)}
                          aria-label={`Select project ${row.slNo}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <Link
                        to={`/projects/${row.projectId}`}
                        className="font-semibold text-[color:var(--accent-teal)] hover:underline"
                      >
                        #{row.slNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                      <div>{row.customerName}</div>
                      <div className="text-xs text-[color:var(--text-muted)]">{row.customerId}</div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                      {row.projectStatus.replace(/_/g, ' ')}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => provisionOneMutation.mutate(row.projectId)}
                          className="rounded-lg border border-[color:var(--border-default)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-teal)] hover:bg-[color:var(--bg-card-hover)] disabled:opacity-50"
                        >
                          Provision
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(data?.items ?? []).length === 0 ? (
            <p className="mt-6 text-center text-sm text-[color:var(--text-muted)]">
              All eligible projects have Hub accounts.
            </p>
          ) : null}

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
