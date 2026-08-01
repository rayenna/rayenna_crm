import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCopy, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModalEscape } from '../../contexts/ModalEscapeContext'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import type { Project, ProjectRemark, User } from '../../types'
import {
  buildHandoffBrief,
  buildHandoffLoggedRemark,
  defaultHandoffAudienceForRole,
  handoffAudienceLabel,
  type HandoffAudience,
  type HandoffPeSummary,
} from '../../utils/handoffBrief'

const AUDIENCES: HandoffAudience[] = ['sales_to_ops', 'ops_to_finance', 'full']

export default function HandoffBriefModal({
  project,
  peSummary,
  openGaps,
  viewer,
  onClose,
}: {
  project: Project
  peSummary?: HandoffPeSummary
  openGaps?: string[]
  viewer: User | null | undefined
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [visible, setVisible] = useState(true)
  const [audience, setAudience] = useState<HandoffAudience>(() =>
    defaultHandoffAudienceForRole(viewer?.role ? [viewer.role] : []),
  )
  const [draft, setDraft] = useState('')
  const [draftDirty, setDraftDirty] = useState(false)
  const [logRemark, setLogRemark] = useState(true)
  const [busy, setBusy] = useState(false)

  useModalEscape(visible, () => setVisible(false))

  const { data: remarks = [], isLoading: remarksLoading } = useQuery({
    queryKey: ['remarks', project.id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/remarks/project/${project.id}`)
      return res.data as ProjectRemark[]
    },
  })

  useEffect(() => {
    setVisible(true)
    setAudience(defaultHandoffAudienceForRole(viewer?.role ? [viewer.role] : []))
    setLogRemark(true)
    setBusy(false)
    setDraftDirty(false)
  }, [project.id, viewer?.role])

  useEffect(() => {
    if (draftDirty) return
    setDraft(
      buildHandoffBrief(
        {
          project,
          remarks,
          peSummary,
          openGaps,
        },
        audience,
      ),
    )
    // Skip overwrite once the user edits; rebuild when audience/project/remarks settle while clean.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- project/peSummary/openGaps by identity; guarded by draftDirty
  }, [project.id, remarks, peSummary, openGaps, audience, draftDirty])

  const requestClose = () => setVisible(false)

  const copyAndMaybeLog = async () => {
    if (busy || !draft.trim()) return
    setBusy(true)
    try {
      try {
        await navigator.clipboard.writeText(draft)
        toast.success('Handoff brief copied')
      } catch {
        toast.error('Could not copy — select the text and copy manually')
        return
      }

      if (logRemark) {
        try {
          await axiosInstance.post(`/api/remarks/project/${project.id}`, {
            remark: buildHandoffLoggedRemark(audience),
          })
          void queryClient.invalidateQueries({ queryKey: ['remarks', project.id] })
          toast.success('Logged on project remarks')
        } catch (err: unknown) {
          toast.error(
            getFriendlyApiErrorMessage(err) || 'Copied, but could not log a project remark',
          )
        }
      }
      requestClose()
    } finally {
      setBusy(false)
    }
  }

  const modal = (
    <AnimatePresence onExitComplete={onClose}>
      {visible ? (
        <motion.div
          key="handoff-overlay"
          role="presentation"
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={requestClose}
        >
          <motion.div
            role="dialog"
            aria-labelledby="handoff-modal-title"
            className="relative flex max-h-[min(90dvh,720px)] w-full max-w-xl flex-col rounded-2xl p-5 text-left sm:p-6"
            style={{
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-card)',
              fontFamily: 'DM Sans, sans-serif',
            }}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={requestClose}
              className="absolute top-4 right-4 rounded-lg p-1 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>

            <h2
              id="handoff-modal-title"
              className="pr-10 text-[17px] font-bold text-[color:var(--text-primary)]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Handoff brief
            </h2>
            <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
              Project #{project.slNo} · advisory copy for the receiving role
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAudience(a)
                    setDraftDirty(false)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    audience === a
                      ? 'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)] ring-1 ring-[color:var(--accent-teal-border)]'
                      : 'bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] ring-1 ring-[color:var(--border-default)]'
                  }`}
                >
                  {handoffAudienceLabel(a)}
                </button>
              ))}
            </div>

            <label
              className="mt-4 mb-1.5 block text-[11px] uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
              htmlFor="handoff-draft"
            >
              Brief {remarksLoading ? '(loading remarks…)' : ''}
            </label>
            <textarea
              id="handoff-draft"
              value={draft}
              onChange={(e) => {
                setDraftDirty(true)
                setDraft(e.target.value)
              }}
              rows={14}
              className="min-h-[220px] w-full flex-1 rounded-[10px] p-3.5 text-[12px] leading-relaxed"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                resize: 'vertical',
              }}
            />
            <p className="mt-1.5 text-[11px] italic text-[color:var(--text-muted)]">
              Edit freely, then copy. Rayenna does not email or notify the other role for you.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] text-[color:var(--text-secondary)]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={logRemark}
                onChange={(e) => setLogRemark(e.target.checked)}
              />
              <span>Log a project remark that this brief was copied/shared</span>
            </label>

            <div
              className="mt-5 flex justify-end gap-2.5 pt-4"
              style={{ borderTop: '1px solid var(--border-default)' }}
            >
              <button
                type="button"
                onClick={requestClose}
                className="cursor-pointer rounded-lg bg-transparent px-[18px] py-2 text-[13px] transition-opacity"
                style={{
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void copyAndMaybeLog()}
                disabled={busy || !draft.trim()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 px-5 py-2 text-[14px] font-semibold text-[color:var(--text-inverse)] transition-opacity disabled:opacity-50"
                style={{ background: 'var(--accent-teal, #0d9488)' }}
              >
                <ClipboardCopy className="h-4 w-4" aria-hidden />
                Copy brief
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}
