import { useState } from 'react'
import { useModalEscape } from '../../contexts/ModalEscapeContext'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'

export default function ZenithLogActivityModal({
  projectId,
  customerLabel,
  onClose,
}: {
  projectId: string
  customerLabel: string
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const queryClient = useQueryClient()
  useModalEscape(true, onClose)

  const mutation = useMutation({
    mutationFn: async (remark: string) => {
      const res = await axiosInstance.post(`/api/remarks/project/${projectId}`, { remark })
      return res.data
    },
    onSuccess: () => {
      toast.success('Activity logged')
      setText('')
      queryClient.invalidateQueries({ queryKey: ['zenith-focus'] })
      queryClient.invalidateQueries({ queryKey: ['remarks', projectId] })
      onClose()
    },
    onError: (e: unknown) => toast.error(getFriendlyApiErrorMessage(e)),
  })

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center bg-[color:var(--bg-overlay)] backdrop-blur-sm"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="my-auto w-full min-w-0 max-w-md max-h-[min(90dvh,720px)] overflow-y-auto rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-modal)] shadow-[var(--shadow-modal)] p-5 ring-1 ring-[color:var(--border-default)]"
        role="dialog"
        aria-labelledby="zenith-log-activity-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="zenith-log-activity-title" className="text-lg font-bold text-[color:var(--text-primary)]">
          Log activity
        </h2>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">{customerLabel}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Note follow-up, call, meeting…"
          className="mt-4 w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
        />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-card-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!text.trim() || mutation.isPending}
            onClick={() => mutation.mutate(text.trim())}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
