import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'

const PAGE_SIZE = 20
const SUMMARY_DAYS = 7

const ACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: 'login', label: 'Login' },
  { value: 'password_reset_initiated', label: 'Password reset initiated' },
  { value: 'password_reset_completed', label: 'Password reset completed' },
  { value: 'user_created', label: 'User created' },
  { value: 'user_role_changed', label: 'User role changed' },
  { value: 'project_created', label: 'Project created' },
  { value: 'project_status_changed', label: 'Project status changed' },
  { value: 'support_ticket_created', label: 'Support ticket created' },
  { value: 'support_ticket_closed', label: 'Support ticket closed' },
  { value: 'proposal_generated', label: 'Proposal generated' },
]

const ENTITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All entities' },
  { value: 'User', label: 'User' },
  { value: 'Project', label: 'Project' },
  { value: 'SupportTicket', label: 'Support ticket' },
  { value: 'Proposal', label: 'Proposal' },
]

export default function AuditSecurity () {
  const { hasRole } = useAuth()
  const [page, setPage] = useState(1)
  const [actionType, setActionType] = useState('')
  const [entityType, setEntityType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'audit', 'security-summary', SUMMARY_DAYS],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/audit/security-summary?days=${SUMMARY_DAYS}`)
      return res.data as {
        since: string
        days: number
        failedLogins: number
        loginSuccessCount: number
        auditByAction: { actionType: string; count: number }[]
        accessByAction: { actionType: string; count: number }[]
      }
    },
    enabled: hasRole(['ADMIN']),
  })

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(PAGE_SIZE))
  if (actionType) params.set('actionType', actionType)
  if (entityType) params.set('entityType', entityType)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin', 'audit', 'logs', page, actionType, entityType, dateFrom, dateTo],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/audit/logs?${params.toString()}`)
      return res.data as { logs: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
    },
    enabled: hasRole(['ADMIN']),
  })

  const { data: failedLoginsData } = useQuery({
    queryKey: ['admin', 'audit', 'access-logs', 'failure'],
    queryFn: async () => {
      const res = await axiosInstance.get(
        '/api/admin/audit/access-logs?actionType=login_failure&limit=10'
      )
      return res.data as { logs: { email?: string; ip?: string; userAgent?: string; createdAt: string }[] }
    },
    enabled: hasRole(['ADMIN']),
  })

  if (!hasRole(['ADMIN'])) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <p className="text-red-600 font-medium">Access denied. This page is for Administrators only.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0 space-y-6">
      <h1 className="text-4xl font-extrabold text-primary-800">Audit & Security</h1>
      <p className="text-gray-600 font-medium">Accountability, traceability, and security visibility. Admin only.</p>

      {/* Security tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Failed logins (last {SUMMARY_DAYS}d)</div>
          <div className="mt-1 text-2xl font-bold text-red-600">
            {summaryLoading ? '…' : (summary?.failedLogins ?? 0)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Successful logins (last {SUMMARY_DAYS}d)</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {summaryLoading ? '…' : (summary?.loginSuccessCount ?? 0)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Audit events (last {SUMMARY_DAYS}d)</div>
          <div className="mt-1 text-2xl font-bold text-primary-700">
            {summaryLoading ? '…' : (summary?.auditByAction?.reduce((s, x) => s + x.count, 0) ?? 0)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Access events (last {SUMMARY_DAYS}d)</div>
          <div className="mt-1 text-2xl font-bold text-primary-700">
            {summaryLoading ? '…' : (summary?.accessByAction?.reduce((s, x) => s + x.count, 0) ?? 0)}
          </div>
        </div>
      </div>

      {/* Failed login trend / recent failures */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent failed logins</h2>
        {failedLoginsData?.logs?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {failedLoginsData.logs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{log.email ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{log.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No failed logins in recent access logs.</p>
        )}
      </div>

      {/* Activity timeline (security audit logs) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity timeline</h2>
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <label className="sr-only" htmlFor="audit-action-type">Action type</label>
          <select
            id="audit-action-type"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-48 bg-white"
            value={actionType}
            onChange={(e) => { setActionType(e.target.value); setPage(1); }}
          >
            {ACTION_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="audit-entity-type">Entity type</label>
          <select
            id="audit-entity-type"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-40 bg-white"
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          >
            {ENTITY_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="date"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
          <input
            type="date"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
        {logsLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : logsData?.logs?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User / Role</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logsData.logs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{log.userId} / {log.role}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{log.actionType}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {log.entityType && log.entityId ? `${log.entityType}#${log.entityId.slice(0, 8)}` : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 max-w-xs truncate" title={log.summary ?? ''}>
                        {log.summary ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logsData.pagination && logsData.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Page {logsData.pagination.page} of {logsData.pagination.totalPages} ({logsData.pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={logsData.pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={logsData.pagination.page >= logsData.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-500 space-y-1">
            <p>No audit logs match the filters.</p>
            <p className="text-gray-400">Activity includes logins, user creation/role changes, project creation/status changes, support ticket create/close, and proposal generation. Clear filters or perform those actions to see entries.</p>
          </div>
        )}
      </div>
    </div>
  )
}
