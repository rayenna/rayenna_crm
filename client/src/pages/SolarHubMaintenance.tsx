import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import type {
  HubMaintenanceRequest,
  HubMaintenanceRequestStatus,
  HubMaintenanceListResponse,
} from '../types/solarHub'
import { solarHubTableScrollShell } from '../components/solarHub/tableScrollShell'

const STATUS_OPTIONS: { value: '' | HubMaintenanceRequestStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const NEXT_STATUS: Partial<Record<HubMaintenanceRequestStatus, HubMaintenanceRequestStatus[]>> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

function statusBadge(status: HubMaintenanceRequestStatus) {
  const map: Record<HubMaintenanceRequestStatus, string> = {
    OPEN: 'bg-[color:var(--accent-amber-muted)] text-[color:var(--accent-amber)]',
    IN_PROGRESS: 'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]',
    COMPLETED: 'bg-[color:var(--bg-muted)] text-[color:var(--text-muted)]',
    CANCELLED: 'bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]',
  }
  return map[status] ?? map.OPEN
}

export default function SolarHubMaintenance() {
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const canManage = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])

  const [statusFilter, setStatusFilter] = useState<'' | HubMaintenanceRequestStatus>('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['solar-hub-maintenance', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('limit', '50')
      const res = await axiosInstance.get(`/api/admin/solar-hub/maintenance-requests?${params}`)
      return res.data as HubMaintenanceListResponse
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: HubMaintenanceRequestStatus }) =>
      axiosInstance.patch(`/api/admin/solar-hub/maintenance-requests/${id}`, { status }),
    onSuccess: () => {
      toast.success('Status updated')
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-maintenance'] })
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.max(1, Math.ceil(data.total / data.limit))
  }, [data])

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--text-muted)]">
          Service requests submitted from the Solar Hub app
        </p>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as '' | HubMaintenanceRequestStatus)
            setPage(1)
          }}
          className="rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-6 text-center">
          <p className="text-sm font-semibold text-[color:var(--accent-red)]">Could not load maintenance requests</p>
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
            {data?.total ?? 0} request{(data?.total ?? 0) === 1 ? '' : 's'}
            {isFetching ? ' · Updating…' : ''}
          </p>
          <div className={solarHubTableScrollShell}>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-left text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Customer / Hub user</th>
                  <th className="px-4 py-3">Request</th>
                  <th className="px-4 py-3">Preferred date</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage ? <th className="px-4 py-3">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row: HubMaintenanceRequest) => (
                  <tr
                    key={row.id}
                    className="border-b border-[color:var(--border-default)] hover:bg-[color:var(--bg-card-hover)]"
                  >
                    <td className="px-4 py-3 text-[color:var(--text-muted)]">
                      {new Date(row.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[color:var(--text-primary)]">{row.customerName}</div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        <Link
                          to={`/solar-hub/users?search=${encodeURIComponent(row.username)}`}
                          className="text-[color:var(--accent-teal)] hover:underline"
                        >
                          @{row.username}
                        </Link>
                        {' · '}
                        <Link
                          to={`/projects/${row.projectId}`}
                          className="text-[color:var(--accent-teal)] hover:underline"
                        >
                          Project #{row.projectSlNo}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[color:var(--text-primary)]">{row.title}</div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        {row.requestType === 'SCHEDULE_SERVICE' ? 'Schedule service' : 'Report issue'}
                        {row.description ? ` · ${row.description.slice(0, 80)}${row.description.length > 80 ? '…' : ''}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                      {row.preferredDate
                        ? new Date(row.preferredDate).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(row.status)}`}
                      >
                        {row.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(NEXT_STATUS[row.status] ?? []).map((next) => (
                            <button
                              key={next}
                              type="button"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: row.id, status: next })}
                              className="rounded-lg border border-[color:var(--border-default)] px-2 py-1 text-[10px] font-bold uppercase text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-card-hover)] disabled:opacity-50"
                            >
                              → {next.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(data?.items ?? []).length === 0 ? (
            <p className="mt-6 text-center text-sm text-[color:var(--text-muted)]">No maintenance requests yet.</p>
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
