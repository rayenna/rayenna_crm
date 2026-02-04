import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import toast from 'react-hot-toast'

interface CreateTicketModalProps {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

const CreateTicketModal = ({ projectId, onClose, onSuccess }: CreateTicketModalProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const createMutation = useMutation({
    mutationFn: async (data: { projectId: string; title: string; description?: string }) => {
      const res = await axiosInstance.post('/api/support-tickets', data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Support ticket created successfully')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create ticket')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    createMutation.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
    })
  }

  const labelCls = 'block text-sm text-gray-500 mb-1.5'
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header – same style as New Customer modal */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-start gap-4 z-10">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            Create Support Ticket
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Ticket Details – card section matching New Customer style */}
          <div className="bg-gradient-to-br from-orange-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-orange-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Ticket Details</h3>
            </div>
            <div>
              <label className={labelCls}>
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
                placeholder="Brief description of the issue"
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/500 characters</p>
            </div>
            <div>
              <label className={labelCls}>Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={inputCls}
                placeholder="Detailed description of the issue, steps to reproduce, etc."
              />
            </div>
          </div>

          {/* Actions – same style as New Customer form */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-primary-600 rounded-lg hover:from-orange-700 hover:to-primary-700 disabled:opacity-50 transition-colors shadow-md"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTicketModal
