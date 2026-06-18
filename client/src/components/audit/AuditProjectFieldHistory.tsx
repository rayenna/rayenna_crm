import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import axiosInstance from '../../utils/axios'
import {
  auditDatePresetRange,
  buildAuditFilterSummary,
  type AuditDatePreset,
} from '../../utils/auditSecurityUi'

const PAGE_SIZE = 20

const fieldLabelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)] sm:text-xs'
const fieldDateClass = 'zenith-native-filter-input mt-1.5 min-h-[44px] w-full rounded-xl px-3 py-2.5 text-sm'
const sectionShell =
  'rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] overflow-hidden min-w-0'

const DATE_PRESET_OPTIONS: { value: AuditDatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
]

type ProjectFieldLog = {
  id: string
  projectId: string
  projectSlNo: number | null
  userId: string
  userEmail: string | null
  userName: string | null
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  remarks: string | null
  createdAt: string
}

export default function AuditProjectFieldHistory() {
  const [page, setPage] = useState(1)
  const [projectId, setProjectId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const activeFilterSummary = buildAuditFilterSummary({
    actionType: '',
    entityType: projectId ? 'Project' : '',
    dateFrom,
    dateTo,
    userId: '',
    userLabel: projectId ? `Project id ${projectId.slice(0, 8)}…` : undefined,
  })

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(PAGE_SIZE))
  if (projectId.trim()) params.set('projectId', projectId.trim())
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  if (search.trim()) params.set('q', search.trim())

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', 'project-field-logs', page, projectId, dateFrom, dateTo, search],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/audit/project-field-logs?${params.toString()}`)
      return res.data as {
        logs: ProjectFieldLog[]
        pagination: { page: number; limit: number; total: number; totalPages: number }
      }
    },
  })

  const logs = data?.logs ?? []

  const summaryLine = useMemo(() => {
    const parts: string[] = []
    if (activeFilterSummary) parts.push(activeFilterSummary)
    if (search.trim()) parts.push(`Search: “${search.trim()}”`)
    return parts.length ? parts.join(' · ') : null
  }, [activeFilterSummary, search])

  const clearFilters = () => {
    setProjectId('')
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setPage(1)
  }

  const applyDatePreset = (preset: AuditDatePreset) => {
    const { from, to } = auditDatePresetRange(preset)
    setDateFrom(from)
    setDateTo(to)
    setPage(1)
  }

  return (
    <section className={sectionShell} aria-labelledby="audit-project-fields-heading">
      <div className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-3.5 sm:px-5 sm:py-4">
        <h2 id="audit-project-fields-heading" className="zenith-display text-base font-bold tracking-tight text-[color:var(--text-primary)] sm:text-lg">
          Project field history
        </h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)] sm:text-sm">
          Per-field edits stored on projects (payments, status, documents, and other tracked fields). Complements the security event timeline above.
        </p>
      </div>

      <div className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-4 sm:px-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {DATE_PRESET_OPTIONS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => applyDatePreset(preset.value)}
              className="inline-flex min-h-[36px] touch-manipulation items-center rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 text-xs font-semibold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--accent-teal-border)] hover:text-[color:var(--accent-teal)]"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-[36px] touch-manipulation items-center rounded-lg border border-[color:var(--border-strong)] bg-transparent px-3 text-xs font-semibold text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-primary)]"
          >
            Clear filters
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 lg:col-span-2">
            <label htmlFor="audit-pf-project-id" className={fieldLabelClass}>
              Project id (optional)
            </label>
            <input
              id="audit-pf-project-id"
              type="text"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value)
                setPage(1)
              }}
              placeholder="Paste project id to narrow results"
              className={fieldDateClass}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="audit-pf-from" className={fieldLabelClass}>
              From date
            </label>
            <input
              id="audit-pf-from"
              type="date"
              className={fieldDateClass}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="audit-pf-to" className={fieldLabelClass}>
              To date
            </label>
            <input
              id="audit-pf-to"
              type="date"
              className={fieldDateClass}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-4">
            <label htmlFor="audit-pf-search" className={fieldLabelClass}>
              Search field or value
            </label>
            <input
              id="audit-pf-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Field name, old/new value, or remarks"
              className={fieldDateClass}
            />
          </div>
        </div>
        {summaryLine ? (
          <p className="mt-4 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
            <span className="font-semibold text-[color:var(--accent-teal)]">Showing:</span> {summaryLine}
          </p>
        ) : null}
      </div>

      <div className="p-3 sm:p-4">
        {isLoading ? (
          <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-input)]">
            <p className="text-sm font-medium text-[color:var(--text-muted)]">Loading project field history…</p>
          </div>
        ) : logs.length ? (
          <>
            <ul className="space-y-3 md:hidden" aria-label="Project field history">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-gold)]">
                    {log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">
                    {log.field ?? log.action}
                    {log.projectSlNo != null ? ` · Prj #${log.projectSlNo}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {log.userName ?? log.userEmail ?? log.userId}
                  </p>
                  {(log.oldValue || log.newValue) && (
                    <p className="mt-2 text-sm text-[color:var(--text-secondary)] [overflow-wrap:anywhere]">
                      {log.oldValue ? `${log.oldValue} → ` : ''}
                      {log.newValue ?? '—'}
                    </p>
                  )}
                  {log.remarks ? (
                    <p className="mt-2 text-xs text-[color:var(--text-muted)]">{log.remarks}</p>
                  ) : null}
                  <Link
                    to={`/projects/${log.projectId}`}
                    className="mt-3 inline-block text-sm font-semibold text-[color:var(--accent-teal)]"
                  >
                    Open project →
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-[color:var(--border-default)]">
              <table className="min-w-[56rem] w-full border-collapse text-sm">
                <thead className="bg-[color:var(--bg-surface)]">
                  <tr className="border-b border-[color:var(--border-default)]">
                    {['Time', 'Project', 'User', 'Field', 'Change', 'Remarks'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border-default)]">
                  {logs.map((log) => (
                    <tr key={log.id} className="bg-[color:var(--bg-input)] hover:bg-[color:var(--bg-table-hover)]">
                      <td className="whitespace-nowrap px-3 py-2.5 text-[color:var(--text-secondary)]">
                        {log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link to={`/projects/${log.projectId}`} className="font-semibold text-[color:var(--accent-teal)] hover:underline">
                          {log.projectSlNo != null ? `#${log.projectSlNo}` : 'Project'}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-[color:var(--text-secondary)]">
                        {log.userName ?? log.userEmail ?? log.userId}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{log.field ?? log.action}</td>
                      <td className="max-w-xs px-3 py-2.5 text-[color:var(--text-secondary)] [overflow-wrap:anywhere]">
                        {log.oldValue || log.newValue
                          ? `${log.oldValue ?? '—'} → ${log.newValue ?? '—'}`
                          : '—'}
                      </td>
                      <td className="max-w-xs px-3 py-2.5 text-[color:var(--text-muted)]">{log.remarks ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data?.pagination && data.pagination.totalPages > 1 ? (
              <div className="mt-5 flex flex-col gap-3 border-t border-[color:var(--border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-center text-sm text-[color:var(--text-secondary)] sm:text-left">
                  Page <strong>{data.pagination.page}</strong> of <strong>{data.pagination.totalPages}</strong>
                  <span className="text-[color:var(--text-muted)]"> · {data.pagination.total} entries</span>
                </span>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    disabled={data.pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-[44px] rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 text-sm font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="min-h-[44px] rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 text-sm font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-10 text-center">
            <p className="text-sm font-medium text-[color:var(--text-secondary)]">No project field changes match the filters.</p>
          </div>
        )}
      </div>
    </section>
  )
}
