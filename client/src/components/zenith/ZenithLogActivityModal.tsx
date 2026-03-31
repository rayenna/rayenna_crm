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
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#12121a] shadow-2xl p-5"
        role="dialog"
        aria-labelledby="zenith-log-activity-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="zenith-log-activity-title" className="text-lg font-bold text-white">
          Log activity
        </h2>
        <p className="text-sm text-white/55 mt-1">{customerLabel}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Note follow-up, call, meeting…"
          className="mt-4 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!text.trim() || mutation.isPending}
            onClick={() => mutation.mutate(text.trim())}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-[#f5a623] text-[#0a0a0f] disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
