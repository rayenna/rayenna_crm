import { useCallback, useEffect, useRef, useState } from 'react'
import { useModalEscape } from '../../contexts/ModalEscapeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { safePutProject, safePostProjectRemark } from '../../utils/safeOfflineMutation'
import type { SyncActionType } from '../../utils/syncQueue'
import { Project, ProjectStatus, PaymentStatus, UserRole } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import HealthBadge from './HealthBadge'
import { projectDetailToHealthProject } from '../../utils/dealHealthScore'
import { ZENITH_CHARTS_TOUCH_RESET_EVENT, ZENITH_FLOATING_DISMISS_EVENT } from '../../utils/zenithEvents'
import { zenithDrawerStagePillClass } from './zenithDealCardUi'
import ZenithDrawerRemarksPanel from './ZenithDrawerRemarksPanel'
import ZenithDrawerProjectTitle from './ZenithDrawerProjectTitle'

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
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function paymentStatusLabel(s: PaymentStatus | string | null | undefined): string {
  if (!s) return '—'
  if (s === PaymentStatus.PENDING) return 'Pending'
  if (s === PaymentStatus.PARTIAL) return 'Partial'
  if (s === PaymentStatus.FULLY_PAID) return 'Fully paid'
  return String(s)
}

/**
 * Route a new receipt from Payment radar → Finance drawer to PAYMENT TRACKING fields (same PUT as project form).
 * - If amount ≥ balance pending → Last Payment (+ date) only; server recalculates totals / status.
 * - If Pending and amount &lt; balance → Advance Received (+ date).
 * - If Partial and amount &lt; balance → Payment 1, then 2, then 3; further receipts add to Payment 3.
 */
function buildFinanceRadarPaymentBody(
  project: Project,
  add: number,
  paymentDateIso: string,
): Record<string, unknown> {
  const balance = Number(project.balanceAmount ?? 0)
  const prevAdv = Number(project.advanceReceived ?? 0)
  const p1 = Number(project.payment1 ?? 0)
  const p2 = Number(project.payment2 ?? 0)
  const p3 = Number(project.payment3 ?? 0)
  const prevLast = Number(project.lastPayment ?? 0)

  if (add >= balance) {
    return {
      lastPayment: prevLast + add,
      lastPaymentDate: paymentDateIso,
    }
  }

  if (project.paymentStatus === PaymentStatus.PENDING) {
    return {
      advanceReceived: prevAdv + add,
      advanceReceivedDate: paymentDateIso,
    }
  }

  if (prevAdv <= 0) {
    return {
      advanceReceived: add,
      advanceReceivedDate: paymentDateIso,
    }
  }
  if (p1 <= 0) {
    return { payment1: add, payment1Date: paymentDateIso }
  }
  if (p2 <= 0) {
    return { payment2: add, payment2Date: paymentDateIso }
  }
  if (p3 <= 0) {
    return { payment3: add, payment3Date: paymentDateIso }
  }
  return {
    payment3: p3 + add,
    payment3Date: paymentDateIso,
  }
}

function mergeFinanceRadarPaymentCache(project: Project, body: Record<string, unknown>): Partial<Project> {
  const cost = Number(project.projectCost ?? 0)
  const adv =
    body.advanceReceived !== undefined ? Number(body.advanceReceived) : Number(project.advanceReceived ?? 0)
  const q1 = body.payment1 !== undefined ? Number(body.payment1) : Number(project.payment1 ?? 0)
  const q2 = body.payment2 !== undefined ? Number(body.payment2) : Number(project.payment2 ?? 0)
  const q3 = body.payment3 !== undefined ? Number(body.payment3) : Number(project.payment3 ?? 0)
  const last =
    body.lastPayment !== undefined ? Number(body.lastPayment) : Number(project.lastPayment ?? 0)
  const total = adv + q1 + q2 + q3 + last
  const balanceAmount = Math.max(0, cost - total)
  let paymentStatus: PaymentStatus = PaymentStatus.PENDING
  if (total >= cost) paymentStatus = PaymentStatus.FULLY_PAID
  else if (total > 0) paymentStatus = PaymentStatus.PARTIAL

  const patch: Partial<Project> = {
    ...body,
    totalAmountReceived: total,
    balanceAmount,
    paymentStatus,
  } as Partial<Project>
  return patch
}

type ToastState = { text: string; shownAt: number } | null
type QueuedToastState = { text: string; shownAt: number } | null

const QK = 'finance-quick-drawer-project' as const

export default function FinanceQuickDrawer({
  isOpen,
  projectId,
  readOnly,
  onClose,
}: {
  isOpen: boolean
  projectId: string | null
  /** Management: view payment summary only; no remarks or payment updates from Zenith. */
  readOnly: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [queuedToast, setQueuedToast] = useState<QueuedToastState>(null)
  const [error, setError] = useState<string | null>(null)

  const [noteText, setNoteText] = useState('')
  const [paymentAmountInput, setPaymentAmountInput] = useState('')
  const [paymentDateInput, setPaymentDateInput] = useState('')
  const [narrowViewport, setNarrowViewport] = useState(false)

  const canEdit =
    !readOnly && (user?.role === UserRole.FINANCE || user?.role === UserRole.ADMIN)

  const { data: project, isLoading } = useQuery({
    queryKey: [QK, projectId],
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
    setNoteText('')
    setPaymentAmountInput('')
    setPaymentDateInput('')
  }, [isOpen, projectId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setNarrowViewport(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('zenith-drawer-open')
    window.dispatchEvent(new CustomEvent(ZENITH_FLOATING_DISMISS_EVENT))
    return () => {
      document.body.classList.remove('zenith-drawer-open')
    }
  }, [isOpen])

  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      window.dispatchEvent(new CustomEvent(ZENITH_CHARTS_TOUCH_RESET_EVENT))
    }
    wasOpenRef.current = isOpen
  }, [isOpen])

  const closeAndClear = useCallback(() => {
    onClose()
    setNoteText('')
    setPaymentAmountInput('')
    setPaymentDateInput('')
  }, [onClose])

  useModalEscape(isOpen, closeAndClear)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!queuedToast) return
    const t = window.setTimeout(() => setQueuedToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [queuedToast])

  const stageLabel = project ? (STATUS_LABELS[project.projectStatus] || String(project.projectStatus)) : ''
  const projectTitle =
    project?.customer?.firstName?.trim() ||
    project?.customer?.customerName?.trim() ||
    (isLoading ? 'Loading…' : '—')

  const enteredPayment = parseFloat(String(paymentAmountInput).replace(/,/g, ''))
  const hasPaymentAmount = Number.isFinite(enteredPayment) && enteredPayment > 0
  const paymentDateMissing = hasPaymentAmount && !paymentDateInput.trim()

  const patchProjectCache = useCallback(
    (id: string, patch: Partial<Project>) => {
      queryClient.setQueryData([QK, id], (prev: Project | undefined) =>
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
      queryClient.invalidateQueries({ queryKey: [QK, id] }),
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

  const runToast = (text: string) => setToast({ text, shownAt: Date.now() })
  const runQueuedToast = (text = '✓ Saved — will sync when back online') =>
    setQueuedToast({ text, shownAt: Date.now() })

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: narrowViewport ? 0.18 : 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-[6000] bg-black/60 backdrop-blur-none lg:backdrop-blur-sm lg:bg-black/50"
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
        className="fixed top-0 right-0 z-[6001] h-[100dvh] w-full max-w-full lg:w-[420px] lg:max-w-[420px] bg-[#0F0F1A] border-l border-white/10 lg:shadow-[-20px_0_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          paddingBottom: 'max(56px, env(safe-area-inset-bottom, 0px))',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          ...(narrowViewport ? { willChange: 'transform' as const } : {}),
        }}
        role="dialog"
        aria-label="Payment quick view"
      >
        <div className="min-h-16 px-5 py-3 flex flex-col gap-2 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 pr-1">
              <ZenithDrawerProjectTitle
                title={projectTitle}
                salespersonName={project?.salesperson?.name}
              />
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
              className="w-8 h-8 shrink-0 rounded-full bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div
          className="flex-1 flex flex-col min-h-0 overflow-hidden p-5"
          style={{ scrollbarWidth: 'thin' }}
        >
          <AnimatePresence mode="wait">
            {projectId ? (
              <motion.div
                key={`finance-drawer-${projectId}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-y-auto -mx-1 px-1 min-h-0"
              >
                {error ? (
                  <div className="mb-4 rounded-xl border border-[#ff4757]/30 bg-[#ff4757]/10 px-4 py-3 text-sm text-white/85">
                    {error}
                  </div>
                ) : null}

                {readOnly ? (
                  <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[12px] text-white/55">
                    Read-only for your role — use <span className="text-white/75">Open full project</span> to work
                    the record on the project page.
                  </div>
                ) : null}

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 space-y-2.5">
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="text-white/45">Payment status</span>
                    <span className="text-white/90 font-medium text-right">
                      {paymentStatusLabel(project?.paymentStatus)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="text-white/45">Project value</span>
                    <span className="text-white/90 font-medium tabular-nums text-right">
                      {formatINR(project?.projectCost ?? null)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="text-white/45">Total amount received</span>
                    <span className="text-white/90 font-medium tabular-nums text-right">
                      {formatINR(project?.totalAmountReceived ?? null)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="text-white/45">Balance pending</span>
                    <span className="text-[#f5a623] font-semibold tabular-nums text-right">
                      {formatINR(project?.balanceAmount ?? null)}
                    </span>
                  </div>
                </div>

                {projectId ? (
                  <div className="mt-5">
                    <ZenithDrawerRemarksPanel projectId={projectId} enabled={isOpen && !!projectId} />
                  </div>
                ) : null}

                {canEdit && project && project.projectStatus !== ProjectStatus.LOST ? (
                  <>
                    <div className="mt-5">
                      <div className="text-[11px] uppercase tracking-[0.08em] text-white/35 mb-2">Log activity</div>
                      <textarea
                        id="finance-drawer-remark-textarea"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
                        rows={3}
                        placeholder="Payment follow-up, receipt reference, customer commitment…"
                        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3 text-[14px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#00d4b4]/40"
                        style={{ resize: 'vertical', minHeight: 80 }}
                      />
                      <div className="mt-1 text-right text-[11px] text-white/25">{noteText.length}/500 characters</div>
                      <button
                        type="button"
                        disabled={saving || !noteText.trim()}
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
                        className="mt-2 w-full rounded-xl border border-white/20 bg-transparent px-4 py-2.5 text-[14px] text-white hover:border-[#00D4B4] hover:text-[#00D4B4] hover:bg-[rgba(0,212,180,0.06)] transition-colors disabled:opacity-60"
                      >
                        {saving ? 'Saving…' : 'Log activity'}
                      </button>
                    </div>

                    <div className="my-5 h-px bg-white/[0.06]" />

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.08em] text-white/35 mb-2">Record payment</div>
                      <label className="block text-[12px] text-white/50 mb-1">Payment amount (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={paymentAmountInput}
                        onChange={(e) => setPaymentAmountInput(e.target.value)}
                        placeholder="Amount received"
                        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3 text-[15px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#00d4b4]/40"
                      />
                      <label className="block text-[12px] text-white/50 mt-3 mb-1">Payment date</label>
                      <input
                        type="date"
                        value={paymentDateInput}
                        onChange={(e) => setPaymentDateInput(e.target.value)}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3 text-[14px] text-white focus:outline-none focus:ring-2 focus:ring-[#00d4b4]/40"
                        style={{ colorScheme: 'dark' }}
                      />
                      {paymentDateMissing ? (
                        <p className="mt-1.5 text-[12px] text-[#ff4757]">Payment date is required when amount is entered.</p>
                      ) : null}
                      <button
                        type="button"
                        disabled={
                          saving ||
                          !project ||
                          !hasPaymentAmount ||
                          paymentDateMissing ||
                          !paymentDateInput.trim()
                        }
                        onClick={async () => {
                          if (!project || !hasPaymentAmount || !paymentDateInput.trim()) return
                          const add = enteredPayment
                          const iso = new Date(paymentDateInput).toISOString()
                          const body = buildFinanceRadarPaymentBody(project, add, iso)
                          setSaving(true)
                          setError(null)
                          try {
                            const r = await putProjectWithOfflineQueue(project.id, body, 'UPDATE_PAYMENT')
                            if (r === 'queued') {
                              patchProjectCache(project.id, {
                                ...mergeFinanceRadarPaymentCache(project, body),
                              })
                              runQueuedToast()
                            } else {
                              runToast('✓ Payment updated')
                            }
                            setPaymentAmountInput('')
                            setPaymentDateInput('')
                          } catch (e: unknown) {
                            setError(getFriendlyApiErrorMessage(e))
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="mt-3 w-full rounded-xl bg-[#00D4B4] text-[#0A0A0F] text-[14px] font-semibold py-3 transition-all disabled:opacity-60 hover:brightness-110"
                      >
                        {saving ? 'Saving…' : 'Update payment'}
                      </button>
                      <p className="mt-2 text-[11px] text-white/35 leading-snug">
                        Pending → Advance Received. Partial → Payment 1, then 2, then 3 (same as Payment Tracking on the
                        project). If this amount is <span className="text-white/50">≥ balance pending</span>, it is recorded
                        under Last Payment only. Totals and status follow the same rules as the full project form.
                      </p>
                    </div>
                  </>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div
          className="h-14 px-5 flex items-center justify-between border-t border-white/[0.08] bg-black/20"
          style={{ height: 'auto', minHeight: 56 }}
        >
          <button
            type="button"
            className="text-[13px] font-semibold text-white/70 hover:text-[#00D4B4] transition-colors disabled:opacity-40"
            disabled={!projectId}
            onClick={() => {
              if (projectId) navigate(`/projects/${projectId}`)
              onClose()
            }}
          >
            Open full project →
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/20 bg-transparent px-4 py-1.5 text-[13px] text-white hover:border-[#00D4B4] hover:text-[#00D4B4] hover:bg-[rgba(0,212,180,0.06)] transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </motion.div>

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
            background: 'rgba(245,166,35,0.1)',
            border: '1px solid rgba(245,166,35,0.3)',
            borderRadius: 10,
            padding: '10px 20px',
            color: '#F5A623',
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
