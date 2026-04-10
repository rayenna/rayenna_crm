import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { useModalEscape } from '../contexts/ModalEscapeContext'
import { Customer, UserRole } from '../types'
import PageCard from '../components/PageCard'
import { FaUserFriends } from 'react-icons/fa'
import { CustomerForm, getCustomerDisplayName } from '../components/customers/CustomerForm'
import { ErrorModal } from '@/components/common/ErrorModal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fromListFilter = (location.state as { fromListFilter?: 'all' | 'my' } | null)?.fromListFilter

  const canEdit =
    hasRole([UserRole.ADMIN, UserRole.MANAGEMENT]) ||
    (hasRole([UserRole.SALES]) && fromListFilter === 'my')

  const canDelete = hasRole([UserRole.ADMIN])

  useModalEscape(showDeleteConfirm, () => setShowDeleteConfirm(false))

  /** Escape → Customer Master when no modal has registered (capture handler runs first and stops propagation). */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      navigate('/customers')
    }
    document.addEventListener('keydown', onKeyDown, false)
    return () => document.removeEventListener('keydown', onKeyDown, false)
  }, [navigate])

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/customers/${id}`)
      return res.data as Customer
    },
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: async () => axiosInstance.delete(`/api/customers/${id}`),
    onSuccess: () => {
      toast.success('Customer deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/customers')
    },
    onError: (e: unknown) => toast.error(getFriendlyApiErrorMessage(e)),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50/90 via-white to-teal-50/15 px-0 py-6 sm:px-0">
        <div className="p-6 text-center text-gray-600">Loading customer…</div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50/90 via-white to-teal-50/15 px-0 py-6 sm:px-0">
        <div className="p-6 text-center text-red-600">
          {error ? getFriendlyApiErrorMessage(error) : 'Customer not found'}
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="text-primary-600 font-medium hover:underline"
          >
            Back to Customer Master
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <ErrorModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        type="warning"
        message={`Once deleted, this customer's details cannot be recovered.

Are you sure you want to proceed?`}
        actions={[
          { label: 'Cancel', variant: 'ghost', onClick: () => setShowDeleteConfirm(false) },
          {
            label: 'YES',
            variant: 'primary',
            onClick: () => {
              deleteMutation.mutate()
              setShowDeleteConfirm(false)
            },
          },
        ]}
      />
      <div className="min-h-screen bg-gradient-to-b from-slate-50/90 via-white to-teal-50/15 px-0 py-6 sm:px-0">
        <PageCard
          title={getCustomerDisplayName(customer)}
          subtitle={isEditing ? 'Edit customer details' : 'Customer details'}
          icon={<FaUserFriends className="w-5 h-5 text-white" />}
          className="max-w-full"
        >
          <div className="mx-auto w-full max-w-[min(100%,88rem)] space-y-5 sm:space-y-6 md:space-y-7">
          <div className="rounded-xl border border-primary-100/60 border-l-4 border-l-primary-500 bg-gradient-to-br from-primary-50/50 to-gray-50/60 p-4 shadow-md shadow-primary-900/[0.06] ring-1 ring-white/80 sm:p-6">
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Created {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
            </p>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-sm mt-3">
              ID: {customer.customerId}
            </span>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-200/80 pt-4 sm:mt-6 sm:flex sm:flex-wrap sm:items-center">
              {canEdit && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex h-9 min-w-0 items-center justify-center rounded-xl bg-primary-600 px-2 py-2 text-xs font-semibold text-white shadow-md shadow-primary-900/15 transition-all hover:bg-primary-700 hover:shadow sm:h-10 sm:w-40 sm:px-4 sm:text-sm"
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-xl bg-red-600 px-2 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-red-700 hover:shadow sm:h-10 sm:w-40 sm:gap-1.5 sm:px-4 sm:text-sm"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span className="hidden sm:inline">Delete</span>
                  <span className="sm:hidden truncate">Delete</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="inline-flex h-9 min-w-0 items-center justify-center rounded-xl border border-gray-200/90 bg-white px-2 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 sm:h-10 sm:ml-auto sm:w-40 sm:px-4 sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white/85 p-4 shadow-md shadow-gray-900/[0.04] ring-1 ring-gray-100/60 backdrop-blur-[2px] sm:p-6 md:p-7">
            <CustomerForm
              customer={customer}
              layout="page"
              readOnly={!isEditing}
              onClose={() => navigate('/customers')}
              onSuccess={() => {
                setIsEditing(false)
                queryClient.invalidateQueries({ queryKey: ['customer', id] })
                queryClient.invalidateQueries({ queryKey: ['customers'] })
                queryClient.invalidateQueries({ queryKey: ['projects'] })
              }}
            />
          </div>
          </div>
        </PageCard>
      </div>
    </>
  )
}
