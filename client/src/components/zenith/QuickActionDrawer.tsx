import { useCallback, useEffect, useMemo, useState } from 'react'
import { useModalEscape } from '../../contexts/ModalEscapeContext'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { Project, ProjectStatus } from '../../types'

const STATUS_ORDER: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
]

const TERMINAL_STATUSES: ProjectStatus[] = [
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
  ProjectStatus.LOST,
]

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.LEAD]: 'Lead',
  [ProjectStatus.SITE_SURVEY]: 'Site Survey',
  [ProjectStatus.PROPOSAL]: 'Proposal',
  [ProjectStatus.CONFIRMED]: 'Confirmed Order',
  [ProjectStatus.UNDER_INSTALLATION]: 'Under Installation',
  [ProjectStatus.SUBMITTED_FOR_SUBSIDY]: 'Submitted for Subsidy',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.COMPLETED_SUBSIDY_CREDITED]: 'Completed - Subsidy Credited',
  [ProjectStatus.LOST]: 'Cancelled / Lost',
}

function stagePillClass(stageLabel: string): string {
  const s = stageLabel.trim()
  if (s === 'Lead') return 'bg-[rgba(56,139,255,0.15)] text-[#3B8BFF]'
  if (s === 'Site Survey') return 'bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]'
  if (s === 'Proposal') return 'bg-[rgba(245,166,35,0.15)] text-[#F5A623]'
  if (s === 'Confirmed Order') return 'bg-[rgba(0,212,180,0.15)] text-[#00D4B4]'
  return 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)]'
}

function formatINR(value: number | null | undefined): string {
  if (!value) return 'Not set'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function toYmd(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]!
}

function todayYmd(): string {
  return new Date().toISOString().split('T')[0]!
}

function getNextStatus(current: ProjectStatus): ProjectStatus | null {
  const idx = STATUS_ORDER.indexOf(current)
  if (idx === -1 || idx >= STATUS_ORDER.length - 1) return null
  return STATUS_ORDER[idx + 1]!
}

type ToastState = { text: string; shownAt: number } | null

export default function QuickActionDrawer({
  isOpen,
  projectId,
  onClose,
}: {
  isOpen: boolean
  projectId: string | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [error, setError] = useState<string | null>(null)

  const [noteText, setNoteText] = useState('')
  const [valueInput, setValueInput] = useState<string>('')
  const [dateInput, setDateInput] = useState<string>('')

  const { data: project, isLoading } = useQuery({
    queryKey: ['quick-action-project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Missing project id')
      const res = await axiosInstance.get(`/api/projects/${projectId}`)
      return res.data as Project
    },
    enabled: isOpen && !!projectId,
    retry: 1,
  })

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setSaving(false)
    setToast(null)
  }, [isOpen])

  const closeAndClear = useCallback(() => {
    onClose()
    setNoteText('')
  }, [onClose])

  useModalEscape(isOpen, closeAndClear)

  useEffect(() => {
    if (!project) return
    setValueInput(project.projectCost != null ? String(project.projectCost) : '')
    setDateInput(toYmd(project.expectedCommissioningDate))
  }, [project])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast?.shownAt])

  const stageLabel = project ? (STATUS_LABELS[project.projectStatus] || String(project.projectStatus)) : ''
  const nextStatus = project ? getNextStatus(project.projectStatus) : null
  const nextLabel = nextStatus ? STATUS_LABELS[nextStatus] : null

  const canAdvance =
    !!project && !TERMINAL_STATUSES.includes(project.projectStatus) && !!nextStatus && !!nextLabel

  const valuePreview = useMemo(() => {
    const n = Number(valueInput)
    if (!Number.isFinite(n) || n <= 0) return ''
    return formatINR(n)
  }, [valueInput])

  const runToast = (text: string) => setToast({ text, shownAt: Date.now() })

  const invalidateAfterSave = async (id: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['zenith'] }),
      queryClient.invalidateQueries({ queryKey: ['zenith-focus'] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['project', id] }),
    ])
  }

  const updateProject = async (id: string, body: Record<string, unknown>) => {
    await axiosInstance.put(`/api/projects/${id}`, body)
    await invalidateAfterSave(id)
  }

  const logActivity = async (id: string, remark: string) => {
    await axiosInstance.post(`/api/remarks/project/${id}`, { remark })
    await invalidateAfterSave(id)
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm"
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 z-[901] h-[100dvh] w-[420px] max-w-[100vw] bg-[#0F0F1A] border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          // Keep footer buttons above OS/browser UI (mobile bars, desktop dock/taskbar overlays in webviews).
          // `safe-area-inset-bottom` helps iOS; desktop taskbars often need extra breathing room.
          paddingBottom: 'max(56px, env(safe-area-inset-bottom, 0px))',
        }}
        role="dialog"
        aria-label="Quick actions"
      >
        {/* Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02]">
          <div className="min-w-0">
            <div
              className="text-white font-bold text-[16px] truncate max-w-[260px]"
              style={{ fontFamily: "'Syne', sans-serif" }}
              title={project?.customer?.firstName || project?.customer?.customerName || undefined}
            >
              {project?.customer?.firstName || project?.customer?.customerName || (isLoading ? 'Loading…' : '—')}
            </div>
            <div className="mt-1">
              <span className={`inline-block rounded-[20px] px-3 py-1 text-[12px] ${stagePillClass(stageLabel)}`}>
                {stageLabel || '—'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto p-5"
          style={{
            scrollbarWidth: 'thin',
          }}
        >
          {error ? (
            <div className="mb-4 rounded-xl border border-[#ff4757]/30 bg-[#ff4757]/10 px-4 py-3 text-sm text-white/85">
              {error}
            </div>
          ) : null}

          {/* SECTION 1: Advance stage */}
          {canAdvance ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-white/35 mb-2">
                Advance stage
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-block rounded-[20px] px-3 py-1 text-[12px] ${stagePillClass(stageLabel)}`}>
                  {stageLabel}
                </span>
                <span className="text-white/30">→</span>
                <span
                  className="inline-block rounded-[20px] px-3 py-1 text-[12px]"
                  style={{
                    background: 'rgba(245,166,35,0.12)',
                    border: '1px solid #F5A623',
                    color: '#F5A623',
                  }}
                >
                  {nextLabel}
                </span>
              </div>

              <button
                type="button"
                disabled={saving || !project}
                onClick={async () => {
                  if (!project || !nextStatus) return
                  setSaving(true)
                  setError(null)
                  try {
                    await updateProject(project.id, { projectStatus: nextStatus })
                    runToast(`✓ Moved to ${STATUS_LABELS[nextStatus]}`)
                    window.setTimeout(() => closeAndClear(), 1500)
                  } catch (e: unknown) {
                    setError(getFriendlyApiErrorMessage(e))
                  } finally {
                    setSaving(false)
                  }
                }}
                className="mt-3 w-full rounded-xl bg-[#F5A623] text-[#0A0A0F] text-[14px] font-semibold py-3 transition-all disabled:opacity-60"
                style={{ transform: 'translateY(0)' }}
              >
                {saving ? `Moving…` : `Move to ${nextLabel}`}
              </button>

              <div className="my-5 h-px bg-white/[0.06]" />
            </div>
          ) : null}

          {/* SECTION 2: Log activity */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-white/35 mb-2">
              Log activity
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="What happened with this deal? Call made, site visited, proposal sent..."
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3 text-[14px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#f5a623]/40"
              style={{ resize: 'vertical', minHeight: 80 }}
            />
            <div className="mt-1 text-right text-[11px] text-white/25">{noteText.length}/500 characters</div>
            <button
              type="button"
              disabled={saving || !project || !noteText.trim()}
              onClick={async () => {
                if (!project) return
                const text = noteText.trim()
                if (!text) return
                setSaving(true)
                setError(null)
                try {
                  await logActivity(project.id, text)
                  setNoteText('')
                  runToast('✓ Activity logged')
                } catch (e: unknown) {
                  setError(getFriendlyApiErrorMessage(e))
                } finally {
                  setSaving(false)
                }
              }}
              className="mt-2 w-full rounded-xl border border-white/20 bg-transparent px-4 py-2.5 text-[14px] text-white hover:border-[#F5A623] hover:text-[#F5A623] hover:bg-[rgba(245,166,35,0.06)] transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Log activity'}
            </button>

            <div className="my-5 h-px bg-white/[0.06]" />
          </div>

          {/* SECTION 3: Edit deal value */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-white/35 mb-2">
              Deal value
            </div>
            <div className="text-[22px] font-bold" style={{ fontFamily: "'Syne', sans-serif", color: '#F5A623' }}>
              {formatINR(project?.projectCost ?? null)}
            </div>
            <input
              type="number"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder="Enter amount in ₹"
              className="mt-2 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3 text-[15px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#f5a623]/40"
            />
            {valuePreview ? <div className="mt-1 text-[12px] text-white/40">{valuePreview}</div> : null}
            <button
              type="button"
              disabled={saving || !project}
              onClick={async () => {
                if (!project) return
                const n = Number(valueInput)
                setSaving(true)
                setError(null)
                try {
                  await updateProject(project.id, { projectCost: Number.isFinite(n) ? n : 0 })
                  runToast('✓ Value updated')
                } catch (e: unknown) {
                  setError(getFriendlyApiErrorMessage(e))
                } finally {
                  setSaving(false)
                }
              }}
              className="mt-2 w-full rounded-xl border border-white/20 bg-transparent px-4 py-2.5 text-[14px] text-white hover:border-[#F5A623] hover:text-[#F5A623] hover:bg-[rgba(245,166,35,0.06)] transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Update value'}
            </button>

            <div className="my-5 h-px bg-white/[0.06]" />
          </div>

          {/* SECTION 4: Change close date */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-white/35 mb-2">
              Expected close date
            </div>
            <div className="text-[13px] text-white/60">
              {project?.expectedCommissioningDate ? new Date(project.expectedCommissioningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date set'}
            </div>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              min={todayYmd()}
              className="mt-2 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3 text-[14px] text-white focus:outline-none focus:ring-2 focus:ring-[#f5a623]/40"
              style={{ colorScheme: 'dark' }}
            />
            <button
              type="button"
              disabled={saving || !project}
              onClick={async () => {
                if (!project) return
                setSaving(true)
                setError(null)
                try {
                  await updateProject(project.id, {
                    expectedCommissioningDate: dateInput ? new Date(dateInput).toISOString() : null,
                  })
                  runToast('✓ Date updated')
                } catch (e: unknown) {
                  setError(getFriendlyApiErrorMessage(e))
                } finally {
                  setSaving(false)
                }
              }}
              className="mt-2 w-full rounded-xl border border-white/20 bg-transparent px-4 py-2.5 text-[14px] text-white hover:border-[#F5A623] hover:text-[#F5A623] hover:bg-[rgba(245,166,35,0.06)] transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Update date'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="h-14 px-5 flex items-center justify-between border-t border-white/[0.08] bg-black/20"
          style={{
            height: 'auto',
            minHeight: 56,
          }}
        >
          <button
            type="button"
            className="text-[13px] font-semibold text-white/70 hover:text-[#F5A623] transition-colors"
            onClick={() => {
              if (projectId) navigate(`/projects/${projectId}`)
              onClose()
            }}
          >
            Open full project →
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/20 bg-transparent px-4 py-1.5 text-[13px] text-white hover:border-[#F5A623] hover:text-[#F5A623] hover:bg-[rgba(245,166,35,0.06)] transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </motion.div>

      {/* Success toast */}
      {toast ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,212,180,0.15)',
            border: '1px solid #00D4B4',
            borderRadius: 10,
            padding: '10px 20px',
            color: '#00D4B4',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            zIndex: 1000,
          }}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      ) : null}
    </>
  )
}

