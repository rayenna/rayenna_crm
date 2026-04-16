import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useModalEscape } from '../../contexts/ModalEscapeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { safePutProject, safePostProjectRemark } from '../../utils/safeOfflineMutation'
import type { SyncActionType } from '../../utils/syncQueue'
import { Project, ProjectStatus, UserRole } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import type { ZenithAutoFocusSection, ZenithListAmountMode } from '../../hooks/useQuickAction'
import DrawerProjectList from './DrawerProjectList'
import HealthBadge from './HealthBadge'
import { projectDetailToHealthProject } from '../../utils/dealHealthScore'
import { ZENITH_CHARTS_TOUCH_RESET_EVENT, ZENITH_FLOATING_DISMISS_EVENT } from '../../utils/zenithEvents'
import { fireVictoryToast } from '../../hooks/useVictoryToast'
import { zenithDrawerStagePillClass } from './zenithDealCardUi'
import ZenithDrawerRemarksPanel from './ZenithDrawerRemarksPanel'
import ZenithDrawerProjectTitle from './ZenithDrawerProjectTitle'
import ZenithDrawerPaymentSummary from './ZenithDrawerPaymentSummary'
import { formatZenithSystemCapacityKw } from '../../utils/zenithSystemCapacityFormat'

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

function formatINR(value: number | null | undefined): string {
  if (!value) return 'Not set'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatINRAlways(value: number): string {
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

function getNextStatus(current: ProjectStatus): ProjectStatus | null {
  const idx = STATUS_ORDER.indexOf(current)
  if (idx === -1 || idx >= STATUS_ORDER.length - 1) return null
  return STATUS_ORDER[idx + 1]!
}

type ToastState = { text: string; shownAt: number } | null
type QueuedToastState = { text: string; shownAt: number } | null

type ListSubview = 'list' | 'single'

function sumListAmount(projects: ZenithExplorerProject[], mode: ZenithListAmountMode): number {
  return projects.reduce((s, p) => {
    if (mode === 'gross_profit') return s + Number(p.gross_profit ?? 0)
    return s + Number(p.deal_value ?? 0)
  }, 0)
}

export default function QuickActionDrawer({
  isOpen,
  projectId,
  onClose,
  listMode = false,
  filterLabel = '',
  filteredProjects = [],
  listAmountMode = 'deal_value',
  autoFocusSection = null,
  projectsPageHref = null,
  /** Admin / Management / Operations: picking a row opens the operations lifecycle drawer instead of this drawer’s single view. */
  onSelectProjectFromList,
}: {
  isOpen: boolean
  projectId: string | null
  onClose: () => void
  listMode?: boolean
  filterLabel?: string
  filteredProjects?: ZenithExplorerProject[]
  listAmountMode?: ZenithListAmountMode
  autoFocusSection?: ZenithAutoFocusSection
  /** List mode: deep link to Projects with the same filters as this drawer list. */
  projectsPageHref?: string | null
  onSelectProjectFromList?: (projectId: string) => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, hasRole } = useAuth()

  const [listSubview, setListSubview] = useState<ListSubview>('list')
  const [listPickId, setListPickId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [queuedToast, setQueuedToast] = useState<QueuedToastState>(null)
  const [error, setError] = useState<string | null>(null)

  const [noteText, setNoteText] = useState('')
  const [valueInput, setValueInput] = useState<string>('')
  const [dateInput, setDateInput] = useState<string>('')
  /** Narrow viewport: lighter motion + no backdrop blur (Android GPU / stutter). */
  const [narrowViewport, setNarrowViewport] = useState(false)

  const effectiveProjectId = listMode
    ? listSubview === 'single' && listPickId
      ? listPickId
      : null
    : projectId

  const { data: project, isLoading } = useQuery({
    queryKey: ['quick-action-project', effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) throw new Error('Missing project id')
      const res = await axiosInstance.get(`/api/projects/${effectiveProjectId}`)
      return res.data as Project
    },
    enabled: isOpen && !!effectiveProjectId,
    retry: 1,
  })

  useEffect(() => {
    if (!isOpen) {
      setListSubview('list')
      setListPickId(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && listMode) {
      setListSubview('list')
      setListPickId(null)
    }
  }, [isOpen, listMode])

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setSaving(false)
    setToast(null)
  }, [isOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setNarrowViewport(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('zenith-drawer-open')
    window.dispatchEvent(new CustomEvent(ZENITH_FLOATING_DISMISS_EVENT))
    return () => {
      document.body.classList.remove('zenith-drawer-open')
    }
  }, [isOpen])

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      window.dispatchEvent(new CustomEvent(ZENITH_CHARTS_TOUCH_RESET_EVENT))
    }
    wasOpenRef.current = isOpen
  }, [isOpen])

  const closeAndClear = useCallback(() => {
    onClose()
    setNoteText('')
  }, [onClose])

  useModalEscape(isOpen, closeAndClear)

  useEffect(() => {
    if (!project) return
    setValueInput(project.projectCost != null ? String(project.projectCost) : '')
    setDateInput(toYmd(project.confirmationDate))
  }, [project])

  useEffect(() => {
    if (!isOpen || autoFocusSection !== 'note' || !effectiveProjectId || !project) return
    const t = window.setTimeout(() => {
      const textarea = document.getElementById('quick-action-note-textarea') as HTMLTextAreaElement | null
      if (textarea) {
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
        textarea.focus()
      }
    }, 350)
    return () => window.clearTimeout(t)
  }, [isOpen, autoFocusSection, effectiveProjectId, project?.id])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast?.shownAt])

  useEffect(() => {
    if (!queuedToast) return
    const t = window.setTimeout(() => setQueuedToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [queuedToast?.shownAt])

  const stageLabel = project ? (STATUS_LABELS[project.projectStatus] || String(project.projectStatus)) : ''
  const nextStatus = project ? getNextStatus(project.projectStatus) : null
  const nextLabel = nextStatus ? STATUS_LABELS[nextStatus] : null

  const singleDrawerTitle =
    project?.customer?.firstName?.trim() ||
    project?.customer?.customerName?.trim() ||
    (isLoading ? 'Loading…' : '—')
  const singleDrawerSalesperson = project?.salesperson?.name ?? null

  const canAdvance =
    !!project && !TERMINAL_STATUSES.includes(project.projectStatus) && !!nextStatus && !!nextLabel

  /**
   * Quick Actions: Admin; Sales on own project; Operations can edit stage/notes/value/date.
   * Management & Finance are view-only here — Finance edits payments via Payment radar → Finance drawer
   * or Project detail (Payment Tracking), not this drawer.
   */
  const canEditProjectInDrawer =
    !!project &&
    project.projectStatus !== ProjectStatus.LOST &&
    (hasRole([UserRole.ADMIN]) ||
      (hasRole([UserRole.SALES]) && project.salespersonId === user?.id) ||
      hasRole([UserRole.OPERATIONS]))

  const valuePreview = useMemo(() => {
    const n = Number(valueInput)
    if (!Number.isFinite(n) || n <= 0) return ''
    return formatINR(n)
  }, [valueInput])

  const runToast = (text: string) => setToast({ text, shownAt: Date.now() })
  const runQueuedToast = (text = '✓ Saved — will sync when back online') =>
    setQueuedToast({ text, shownAt: Date.now() })

  const patchQuickActionProjectCache = useCallback(
    (id: string, patch: Partial<Project>) => {
      queryClient.setQueryData(['quick-action-project', id], (prev: Project | undefined) =>
        prev ? { ...prev, ...patch } : prev,
      )
    },
    [queryClient],
  )

  const invalidateAfterSave = async (id: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['zenith'] }),
      queryClient.invalidateQueries({ queryKey: ['zenith-focus'] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['project', id] }),
      queryClient.invalidateQueries({ queryKey: ['remarks', id] }),
    ])
  }

  const putProjectWithOfflineQueue = async (
    id: string,
    body: Record<string, unknown>,
    actionType: SyncActionType,
  ): Promise<'queued' | 'ok'> => {
    const result = await safePutProject(id, body, actionType)
    if (result.queued) return 'queued'
    await invalidateAfterSave(id)
    return 'ok'
  }

  const listTotal = useMemo(
    () => sumListAmount(filteredProjects, listAmountMode),
    [filteredProjects, listAmountMode],
  )

  const showSingleChrome = !listMode || listSubview === 'single'
  const showListBody = listMode && listSubview === 'list'

  const openFromListRow = (p: ZenithExplorerProject) => {
    if (onSelectProjectFromList) {
      onSelectProjectFromList(p.id)
      return
    }
    setListPickId(p.id)
    setListSubview('single')
  }

  const backToList = () => {
    setListSubview('list')
    setListPickId(null)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: narrowViewport ? 0.18 : 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-[6000] zenith-quick-drawer-backdrop backdrop-blur-none lg:backdrop-blur-sm"
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={
          narrowViewport
            ? { type: 'tween', duration: 0.2, ease: [0.22, 1, 0.36, 1] }
            : { type: 'spring', damping: 30, stiffness: 300 }
        }
        className="zenith-quick-drawer-panel fixed top-0 right-0 z-[6001] h-[100dvh] w-full max-w-full lg:w-[420px] lg:max-w-[420px] flex flex-col overflow-hidden"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          paddingBottom: 'max(56px, env(safe-area-inset-bottom, 0px))',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          ...(narrowViewport ? { willChange: 'transform' as const } : {}),
        }}
        role="dialog"
        aria-label="Quick actions"
      >
        {/* Header */}
        <div className="zenith-quick-drawer-header min-h-16 px-5 py-3 flex flex-col gap-2">
          {showListBody ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div
                  className="text-[color:var(--text-primary)] font-bold text-[16px] truncate"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                  title={filterLabel}
                >
                  {filterLabel}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-block rounded-[20px] px-2.5 py-0.5 text-[12px]"
                    style={{
                      background: 'var(--accent-gold-muted)',
                      border: '1px solid var(--accent-gold-border)',
                      color: 'var(--accent-gold)',
                    }}
                  >
                    {filteredProjects.length} projects
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex flex-row items-center gap-3">
                <div
                  className="text-[13px] font-medium text-right"
                  style={{
                    color:
                      listAmountMode === 'gross_profit' ? 'var(--accent-teal)' : 'var(--accent-gold)',
                  }}
                >
                  {formatINRAlways(listTotal)}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[color:var(--bg-badge)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-table-hover)] hover:text-[color:var(--text-primary)] transition-colors"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
          ) : listMode && listSubview === 'single' ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={backToList}
                  className="text-left text-[13px] text-[color:var(--accent-gold)] hover:opacity-90 transition-colors truncate min-w-0"
                >
                  ← Back to {filterLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 shrink-0 rounded-full bg-[color:var(--bg-badge)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-table-hover)] hover:text-[color:var(--text-primary)] transition-colors"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="min-w-0 flex-1 pr-1">
                <ZenithDrawerProjectTitle title={singleDrawerTitle} salespersonName={singleDrawerSalesperson} />
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={zenithDrawerStagePillClass(stageLabel)}>
                    {stageLabel || '—'}
                  </span>
                  {project ? (
                    <HealthBadge project={projectDetailToHealthProject(project)} tooltipZIndex={12000} />
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 pr-1">
                <ZenithDrawerProjectTitle title={singleDrawerTitle} salespersonName={singleDrawerSalesperson} />
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={zenithDrawerStagePillClass(stageLabel)}>
                    {stageLabel || '—'}
                  </span>
                  {project ? (
                    <HealthBadge project={projectDetailToHealthProject(project)} tooltipZIndex={12000} />
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 shrink-0 rounded-full bg-[color:var(--bg-badge)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-table-hover)] hover:text-[color:var(--text-primary)] transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div
          className="flex-1 flex flex-col min-h-0 overflow-hidden p-5"
          style={{ scrollbarWidth: 'thin' }}
        >
          <AnimatePresence mode="wait">
            {showListBody ? (
              <motion.div
                key="drawer-list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <DrawerProjectList
                  projects={filteredProjects}
                  filterLabel={filterLabel}
                  amountMode={listAmountMode}
                  onOpen={openFromListRow}
                />
              </motion.div>
            ) : showSingleChrome && effectiveProjectId ? (
              <motion.div
                key={`drawer-single-${effectiveProjectId}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-y-auto -mx-1 px-1 min-h-0"
              >
                {error ? (
                  <div className="mb-4 rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-4 py-3 text-sm text-[color:var(--text-primary)]">
                    {error}
                  </div>
                ) : null}

                {project && !canEditProjectInDrawer ? (
                  <div className="mb-4 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2.5 text-[12px] text-[color:var(--text-muted)]">
                    View-only for your role — stage, value, and dates are shown below; use{' '}
                    <span className="text-[color:var(--text-secondary)]">Open full project</span> for the full record.
                  </div>
                ) : null}

                {canAdvance ? (
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] mb-2">
                      Advance stage
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={zenithDrawerStagePillClass(stageLabel)}>
                        {stageLabel}
                      </span>
                      <span className="text-[color:var(--text-muted)]">→</span>
                      <span
                        className="inline-block rounded-[20px] px-3 py-1 text-[12px]"
                        style={{
                          background: 'var(--accent-gold-muted)',
                          border: '1px solid var(--accent-gold-border)',
                          color: 'var(--accent-gold)',
                        }}
                      >
                        {nextLabel}
                      </span>
                    </div>
                    {canEditProjectInDrawer ? (
                      <button
                        type="button"
                        disabled={saving || !project}
                        onClick={async () => {
                          if (!project || !nextStatus) return
                          setSaving(true)
                          setError(null)
                          try {
                            const prevStatus = project.projectStatus
                            const r = await putProjectWithOfflineQueue(
                              project.id,
                              { projectStatus: nextStatus },
                              'STAGE_CHANGE',
                            )
                            if (r === 'queued') {
                              patchQuickActionProjectCache(project.id, { projectStatus: nextStatus })
                              fireVictoryToast({ ...project, projectStatus: nextStatus }, prevStatus)
                              runQueuedToast()
                              window.setTimeout(() => closeAndClear(), 1500)
                            } else {
                              fireVictoryToast({ ...project, projectStatus: nextStatus }, prevStatus)
                              runToast(`✓ Moved to ${STATUS_LABELS[nextStatus]}`)
                              window.setTimeout(() => closeAndClear(), 1500)
                            }
                          } catch (e: unknown) {
                            setError(getFriendlyApiErrorMessage(e))
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="mt-3 w-full rounded-xl bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] text-[14px] font-semibold py-3 transition-all disabled:opacity-60"
                      >
                        {saving ? `Moving…` : `Move to ${nextLabel}`}
                      </button>
                    ) : null}
                    <div className="my-5 h-px bg-[color:var(--border-default)]" />
                  </div>
                ) : null}

                {effectiveProjectId ? (
                  <div className="mb-5">
                    <ZenithDrawerRemarksPanel
                      projectId={effectiveProjectId}
                      enabled={isOpen && !!effectiveProjectId}
                    />
                  </div>
                ) : null}

                {canEditProjectInDrawer ? (
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] mb-2">
                      Log activity
                    </div>
                    <textarea
                      id="quick-action-note-textarea"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="What happened with this deal? Call made, site visited, proposal sent..."
                      className="w-full rounded-xl bg-[color:var(--bg-input)] border border-[color:var(--border-input)] px-3 py-3 text-[14px] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] focus:border-[color:var(--accent-gold)]"
                      style={{ resize: 'vertical', minHeight: 80 }}
                    />
                    <div className="mt-1 text-right text-[11px] text-[color:var(--text-muted)]">
                      {noteText.length}/500 characters
                    </div>
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
                          const r = await safePostProjectRemark(project.id, text)
                          setNoteText('')
                          if (r.queued) {
                            runQueuedToast()
                          } else {
                            await invalidateAfterSave(project.id)
                            runToast('✓ Activity logged')
                          }
                        } catch (e: unknown) {
                          setError(getFriendlyApiErrorMessage(e))
                        } finally {
                          setSaving(false)
                        }
                      }}
                      className="mt-2 w-full rounded-xl border border-[color:var(--border-strong)] bg-transparent px-4 py-2.5 text-[14px] text-[color:var(--text-primary)] hover:border-[color:var(--accent-gold-border)] hover:text-[color:var(--accent-gold)] hover:bg-[color:var(--accent-gold-muted)] transition-colors disabled:opacity-60"
                    >
                      {saving ? 'Saving…' : 'Log activity'}
                    </button>
                    <div className="my-5 h-px bg-[color:var(--border-default)]" />
                  </div>
                ) : null}

                <div>
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] mb-2">
                    Deal value
                  </div>
                  <div
                    className="text-[22px] font-bold text-[color:var(--accent-gold)]"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {formatINR(project?.projectCost ?? null)}
                  </div>
                  {canEditProjectInDrawer ? (
                    <>
                      <input
                        type="number"
                        value={valueInput}
                        onChange={(e) => setValueInput(e.target.value)}
                        placeholder="Enter amount in ₹"
                        className="mt-2 w-full rounded-xl bg-[color:var(--bg-input)] border border-[color:var(--border-input)] px-3 py-3 text-[15px] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] focus:border-[color:var(--accent-gold)]"
                      />
                      {valuePreview ? (
                        <div className="mt-1 text-[12px] text-[color:var(--text-muted)]">{valuePreview}</div>
                      ) : null}
                      <button
                        type="button"
                        disabled={saving || !project}
                        onClick={async () => {
                          if (!project) return
                          const n = Number(valueInput)
                          setSaving(true)
                          setError(null)
                          try {
                            const cost = Number.isFinite(n) ? n : 0
                            const r = await putProjectWithOfflineQueue(
                              project.id,
                              { projectCost: cost },
                              'UPDATE_VALUE',
                            )
                            if (r === 'queued') {
                              patchQuickActionProjectCache(project.id, { projectCost: cost })
                              runQueuedToast()
                            } else {
                              runToast('✓ Value updated')
                            }
                          } catch (e: unknown) {
                            setError(getFriendlyApiErrorMessage(e))
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="mt-2 w-full rounded-xl border border-[color:var(--border-strong)] bg-transparent px-4 py-2.5 text-[14px] text-[color:var(--text-primary)] hover:border-[color:var(--accent-gold-border)] hover:text-[color:var(--accent-gold)] hover:bg-[color:var(--accent-gold-muted)] transition-colors disabled:opacity-60"
                      >
                        {saving ? 'Saving…' : 'Update value'}
                      </button>
                    </>
                  ) : null}
                  <div className="my-5 h-px bg-[color:var(--border-default)]" />
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] mb-2">
                    System capacity
                  </div>
                  <div
                    className="text-[22px] font-bold text-[color:var(--text-primary)]"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {formatZenithSystemCapacityKw(project?.systemCapacity, 'notSet')}
                  </div>
                  <div className="my-5 h-px bg-[color:var(--border-default)]" />
                </div>

                {project ? (
                  <div className="mb-5">
                    <ZenithDrawerPaymentSummary project={project} />
                  </div>
                ) : null}

                <div>
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] mb-2">
                    Confirmation date
                  </div>
                  <div className="text-[13px] text-[color:var(--text-secondary)]">
                    {project?.confirmationDate
                      ? new Date(project.confirmationDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'No date set'}
                  </div>
                  {canEditProjectInDrawer ? (
                    <>
                      <input
                        type="date"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                        className="zenith-quick-drawer-date mt-2 w-full rounded-xl bg-[color:var(--bg-input)] border border-[color:var(--border-input)] px-3 py-3 text-[14px] text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] focus:border-[color:var(--accent-gold)]"
                      />
                      <button
                        type="button"
                        disabled={saving || !project}
                        onClick={async () => {
                          if (!project) return
                          setSaving(true)
                          setError(null)
                          try {
                            const iso = dateInput ? new Date(dateInput).toISOString() : null
                            const r = await putProjectWithOfflineQueue(
                              project.id,
                              { confirmationDate: iso },
                              'UPDATE_DATE',
                            )
                            if (r === 'queued') {
                              patchQuickActionProjectCache(project.id, {
                                confirmationDate: iso === null ? undefined : iso,
                              })
                              runQueuedToast()
                            } else {
                              runToast('✓ Date updated')
                            }
                          } catch (e: unknown) {
                            setError(getFriendlyApiErrorMessage(e))
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="mt-2 w-full rounded-xl border border-[color:var(--border-strong)] bg-transparent px-4 py-2.5 text-[14px] text-[color:var(--text-primary)] hover:border-[color:var(--accent-gold-border)] hover:text-[color:var(--accent-gold)] hover:bg-[color:var(--accent-gold-muted)] transition-colors disabled:opacity-60"
                      >
                        {saving ? 'Saving…' : 'Update date'}
                      </button>
                    </>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div
          className="zenith-quick-drawer-footer h-14 px-5 flex items-center justify-between"
          style={{ height: 'auto', minHeight: 56 }}
        >
          {showListBody ? (
            <>
              {projectsPageHref ? (
                <Link
                  to={projectsPageHref}
                  onClick={onClose}
                  className="text-[13px] font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--accent-gold)] transition-colors shrink-0 min-w-0 truncate pr-2"
                >
                  Open in Projects →
                </Link>
              ) : (
                <span className="w-0 flex-1 min-w-0" aria-hidden />
              )}
              <button
                type="button"
                className="ml-auto rounded-xl border border-[color:var(--border-strong)] bg-transparent px-4 py-1.5 text-[13px] text-[color:var(--text-primary)] hover:border-[color:var(--accent-gold-border)] hover:text-[color:var(--accent-gold)] hover:bg-[color:var(--accent-gold-muted)] transition-colors shrink-0"
                onClick={onClose}
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="text-[13px] font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--accent-gold)] transition-colors disabled:opacity-40"
                disabled={!effectiveProjectId}
                onClick={() => {
                  if (effectiveProjectId) navigate(`/projects/${effectiveProjectId}`)
                  onClose()
                }}
              >
                Open full project →
              </button>
              <button
                type="button"
                className="rounded-xl border border-[color:var(--border-strong)] bg-transparent px-4 py-1.5 text-[13px] text-[color:var(--text-primary)] hover:border-[color:var(--accent-gold-border)] hover:text-[color:var(--accent-gold)] hover:bg-[color:var(--accent-gold-muted)] transition-colors"
                onClick={onClose}
              >
                Close
              </button>
            </>
          )}
        </div>
      </motion.div>

      {toast ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent-teal-muted)',
            border: '1px solid var(--accent-teal-border)',
            borderRadius: 10,
            padding: '10px 20px',
            color: 'var(--accent-teal)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            zIndex: 6100,
          }}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      ) : null}

      {queuedToast ? (
        <div
          style={{
            position: 'fixed',
            bottom: toast ? 72 : 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent-gold-muted)',
            border: '1px solid var(--accent-gold-border)',
            borderRadius: 10,
            padding: '10px 20px',
            color: 'var(--accent-gold)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            zIndex: 6100,
          }}
          role="status"
          aria-live="polite"
        >
          {queuedToast.text}
        </div>
      ) : null}
    </>
  )
}
