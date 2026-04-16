import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import axiosInstance from '../../utils/axios'
import type { ProjectRemark } from '../../types'

const DEFAULT_MAX = 30

/**
 * Read-only recent remarks for Zenith quick drawers (same API as Project detail → Remarks).
 * Newest first; scrolls inside a capped height so the drawer stays usable.
 */
export default function ZenithDrawerRemarksPanel({
  projectId,
  enabled,
  maxItems = DEFAULT_MAX,
  className = '',
}: {
  projectId: string | null | undefined
  enabled: boolean
  maxItems?: number
  className?: string
}) {
  const { data: remarks, isLoading, isError } = useQuery({
    queryKey: ['remarks', projectId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/remarks/project/${projectId}`)
      return res.data as ProjectRemark[]
    },
    enabled: enabled && !!projectId,
  })

  const sorted = useMemo(() => {
    if (!remarks?.length) return []
    return [...remarks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [remarks])

  const displayed = useMemo(() => sorted.slice(0, maxItems), [sorted, maxItems])
  const total = sorted.length
  const truncated = total > maxItems

  if (!enabled || !projectId) return null

  return (
    <div
      className={`rounded-xl border border-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-gold)] bg-[color:var(--bg-input)] px-3 py-3 ${className}`}
      style={{ fontFamily: 'var(--zenith-font-body)' }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
          Recent remarks
        </h3>
      </div>

      {isLoading ? (
        <p className="text-[12px] text-[color:var(--text-muted)]">Loading remarks…</p>
      ) : isError ? (
        <p className="text-[12px] text-[color:var(--text-muted)]">Could not load remarks.</p>
      ) : displayed.length === 0 ? (
        <p className="text-[12px] text-[color:var(--text-muted)]">No remarks yet.</p>
      ) : (
        <>
          <div className="max-h-[min(36vh,260px)] space-y-2.5 overflow-y-auto overscroll-y-contain pr-0.5">
            {displayed.map((remark) => {
              const edited = remark.updatedAt !== remark.createdAt
              const name = remark.user?.name?.trim() || 'Unknown user'
              const roleLabel = remark.user?.role != null ? String(remark.user.role) : 'N/A'
              return (
                <div
                  key={remark.id}
                  className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-2.5"
                >
                  <div className="mb-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                    <span className="text-[13px] font-semibold text-[color:var(--text-primary)]">{name}</span>
                    <span className="text-[11px] text-[color:var(--text-muted)]">({roleLabel})</span>
                  </div>
                  <p className="mb-2 text-[11px] text-[color:var(--text-muted)]">
                    {format(new Date(remark.createdAt), 'MMM d, yyyy • h:mm a')}
                    {edited ? <span className="ml-2 text-[color:var(--text-muted)]">(edited)</span> : null}
                  </p>
                  <p className="text-[13px] leading-relaxed text-[color:var(--text-primary)] whitespace-pre-wrap">
                    {remark.remark}
                  </p>
                </div>
              )
            })}
          </div>
          {truncated ? (
            <p className="mt-2 text-[11px] leading-snug text-[color:var(--text-muted)]">
              Showing {maxItems} most recent. Open full project for the full remarks history.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
