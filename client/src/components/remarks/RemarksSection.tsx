import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { ProjectRemark } from '../../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { ErrorModal } from '@/components/common/ErrorModal'

interface RemarksSectionProps {
  projectId: string
  isEditMode?: boolean
  /** Merged onto the outer card (e.g. `!mt-0 h-full` when embedded in a grid). */
  className?: string
}

const cardShell =
  'mt-6 space-y-3 rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-gold)] sm:space-y-4 sm:p-5'

const textareaZenith =
  'w-full min-h-[4.5rem] resize-y rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)] shadow-inner placeholder:text-[color:var(--text-placeholder)] transition-all focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)] sm:min-h-[5rem]'

const btnPrimary =
  'rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40'

const btnSecondary =
  'rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-1.5 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-40'

const RemarksSection = ({ projectId, isEditMode = false, className = '' }: RemarksSectionProps) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newRemark, setNewRemark] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [remarkToDelete, setRemarkToDelete] = useState<string | null>(null)

  // Fetch remarks
  const { data: remarks, isLoading } = useQuery({
    queryKey: ['remarks', projectId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/remarks/project/${projectId}`)
      return res.data as ProjectRemark[]
    },
  })

  // Create remark mutation
  const createMutation = useMutation({
    mutationFn: async (remark: string) => {
      const res = await axiosInstance.post(`/api/remarks/project/${projectId}`, { remark })
      return res.data
    },
    onSuccess: () => {
      toast.success('Remark added successfully')
      setNewRemark('')
      queryClient.invalidateQueries({ queryKey: ['remarks', projectId] })
    },
    onError: (error: unknown) => {
      if (import.meta.env.DEV) {
        const err = error as { response?: { data?: { error?: string }; status?: number }; message?: string }
        console.error('Error adding remark:', error)
        console.error('Error details:', { message: err?.response?.data?.error || err?.message, status: err?.response?.status })
      }
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  // Update remark mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, remark }: { id: string; remark: string }) => {
      const res = await axiosInstance.put(`/api/remarks/${id}`, { remark })
      return res.data
    },
    onSuccess: () => {
      toast.success('Remark updated successfully')
      setEditingId(null)
      setEditText('')
      queryClient.invalidateQueries({ queryKey: ['remarks', projectId] })
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  // Delete remark mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/api/remarks/${id}`)
    },
    onSuccess: () => {
      toast.success('Remark deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['remarks', projectId] })
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!newRemark.trim()) {
      toast.error('Please enter a remark')
      return
    }
    createMutation.mutate(newRemark.trim())
  }

  const handleEdit = (remark: ProjectRemark) => {
    setEditingId(remark.id)
    setEditText(remark.remark)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) {
      toast.error('Remark cannot be empty')
      return
    }
    updateMutation.mutate({ id, remark: editText.trim() })
  }

  const handleDelete = (id: string) => {
    setRemarkToDelete(id)
  }

  const runDeleteRemark = () => {
    if (remarkToDelete) {
      deleteMutation.mutate(remarkToDelete)
      setRemarkToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className={`${cardShell} ${className}`.trim()}>
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-[color:var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[color:var(--text-primary)]">Remarks</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]" aria-hidden />
          Loading remarks…
        </div>
      </div>
    )
  }

  return (
    <div className={`${cardShell} ${className}`.trim()}>
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5 text-[color:var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-[color:var(--text-primary)]">Remarks</h3>
      </div>

      {/* Add new remark - only in edit mode */}
      {isEditMode && (
        <div className="mb-4 border-b border-[color:var(--border-default)] pb-4 sm:mb-5 sm:pb-5">
          <div className="mb-2">
            <label htmlFor="newRemark" className="mb-1.5 block text-xs font-semibold text-[color:var(--text-secondary)] sm:text-sm">
              Add a remark
            </label>
            <textarea
              id="newRemark"
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  if (newRemark.trim() && !createMutation.isPending) {
                    handleSubmit()
                  }
                }
              }}
              rows={2}
              className={textareaZenith}
              placeholder="Enter your remark here…"
            />
            <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">Tip: Ctrl+Enter (Windows) or ⌘+Enter (Mac) to submit.</p>
          </div>
          <button type="button" onClick={handleSubmit} disabled={createMutation.isPending || !newRemark.trim()} className={btnPrimary}>
            {createMutation.isPending ? 'Adding…' : 'Add remark'}
          </button>
        </div>
      )}

      {/* Remarks feed */}
      <div className="space-y-3">
        {remarks && remarks.length > 0 ? (
          remarks.map((remark) => {
            const isOwner = remark.userId === user?.id
            const isEditing = editingId === remark.id

            return (
              <div
                key={remark.id}
                className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-3 transition-colors hover:bg-[color:var(--bg-card-hover)] sm:p-4"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className={textareaZenith}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(remark.id)}
                        disabled={updateMutation.isPending || !editText.trim()}
                        className={`${btnPrimary} px-3 py-1.5 text-xs sm:text-sm`}
                      >
                        {updateMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={handleCancelEdit} disabled={updateMutation.isPending} className={`${btnSecondary} text-xs sm:text-sm`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[color:var(--text-primary)]">{remark.user?.name || 'Unknown User'}</span>
                          <span className="text-xs text-[color:var(--text-muted)]">({remark.user?.role || 'N/A'})</span>
                        </div>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {format(new Date(remark.createdAt), 'MMM dd, yyyy • h:mm a')}
                          {remark.updatedAt !== remark.createdAt && <span className="ml-2 text-[color:var(--text-muted)]">(edited)</span>}
                        </p>
                      </div>
                      {isOwner && isEditMode && (
                        <div className="ml-2 flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(remark)}
                            className="text-xs font-semibold text-[color:var(--accent-gold)] hover:opacity-90 sm:text-sm"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(remark.id)}
                            disabled={deleteMutation.isPending}
                            className="text-xs font-semibold text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                          >
                            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--text-secondary)]">{remark.remark}</p>
                  </>
                )}
              </div>
            )
          })
        ) : (
          <div className="py-6 text-center text-sm text-[color:var(--text-muted)] sm:py-5">
            {isEditMode ? <p>No remarks yet. Add the first remark above.</p> : <p>No remarks yet.</p>}
          </div>
        )}
      </div>

      <ErrorModal
        open={!!remarkToDelete}
        onClose={() => setRemarkToDelete(null)}
        type="warning"
        message="Are you sure you want to delete this remark?"
        actions={[
          { label: 'Cancel', variant: 'ghost', onClick: () => setRemarkToDelete(null) },
          { label: 'Confirm', variant: 'primary', onClick: runDeleteRemark },
        ]}
      />
    </div>
  )
}

export default RemarksSection
