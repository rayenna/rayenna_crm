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
      <div
        className={`mt-6 space-y-4 rounded-xl border border-amber-100/60 border-l-4 border-l-amber-400 bg-gradient-to-br from-amber-50/50 to-gray-50/60 p-5 shadow-sm ${className}`.trim()}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Remarks</h3>
        </div>
        <div className="text-sm text-gray-500">Loading remarks...</div>
      </div>
    )
  }

  return (
    <div
      className={`mt-6 space-y-4 rounded-xl border border-amber-100/60 border-l-4 border-l-amber-400 bg-gradient-to-br from-amber-50/50 to-gray-50/60 p-5 shadow-sm ${className}`.trim()}
    >
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Remarks</h3>
      </div>
      
      {/* Add new remark - only in edit mode */}
      {isEditMode && (
        <div className="mb-6 pb-6 border-b border-amber-200/60">
          <div className="mb-3">
            <label htmlFor="newRemark" className="block text-sm font-medium text-gray-700 mb-2">
              Add a Remark
            </label>
            <textarea
              id="newRemark"
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              onKeyDown={(e) => {
                // Allow Ctrl+Enter or Cmd+Enter to submit
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  if (newRemark.trim() && !createMutation.isPending) {
                    handleSubmit(e as any);
                  }
                }
              }}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your remark here..."
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !newRemark.trim()}
            className="bg-gradient-to-r from-amber-600 to-primary-600 text-white px-4 py-2 rounded-lg hover:from-amber-700 hover:to-primary-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {createMutation.isPending ? 'Adding...' : 'Add Remark'}
          </button>
        </div>
      )}

      {/* Remarks feed */}
      <div className="space-y-4">
        {remarks && remarks.length > 0 ? (
          remarks.map((remark) => {
            const isOwner = remark.userId === user?.id
            const isEditing = editingId === remark.id

            return (
              <div
                key={remark.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(remark.id)}
                        disabled={updateMutation.isPending || !editText.trim()}
                        className="bg-gradient-to-r from-amber-600 to-primary-600 text-white px-3 py-1.5 rounded text-sm hover:from-amber-700 hover:to-primary-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {updateMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={updateMutation.isPending}
                        className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {remark.user?.name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({remark.user?.role || 'N/A'})
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {format(new Date(remark.createdAt), 'MMM dd, yyyy • h:mm a')}
                          {remark.updatedAt !== remark.createdAt && (
                            <span className="ml-2 text-gray-400">(edited)</span>
                          )}
                        </p>
                      </div>
                      {isOwner && isEditMode && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(remark)}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(remark.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{remark.remark}</p>
                  </>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            {isEditMode ? (
              <p>No remarks yet. Add the first remark above.</p>
            ) : (
              <p>No remarks yet.</p>
            )}
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
