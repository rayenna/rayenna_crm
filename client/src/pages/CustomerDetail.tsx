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
      <div className="px-0 py-6 sm:px-0 min-h-screen bg-gray-50/80">
        <div className="p-6 text-center text-gray-600">Loading customer…</div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="px-0 py-6 sm:px-0 min-h-screen bg-gray-50/80">
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
      <div className="px-0 py-6 sm:px-0 min-h-screen bg-gray-50/80">
        <PageCard
          title={getCustomerDisplayName(customer)}
          subtitle={isEditing ? 'Edit customer details' : 'Customer details'}
          icon={<FaUserFriends className="w-5 h-5 text-white" />}
          className="max-w-full"
        >
          <div className="bg-gradient-to-br from-primary-50/50 to-gray-50/60 rounded-xl p-4 sm:p-6 mb-6 border-l-4 border-l-primary-500 border border-primary-100/60 shadow-sm">
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

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 mt-4 sm:mt-6 pt-4 border-t border-gray-100">
              {canEdit && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center h-9 sm:h-10 min-w-0 sm:w-40 px-2 sm:px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 font-medium shadow-sm hover:shadow text-xs sm:text-sm transition-all"
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center justify-center h-9 sm:h-10 min-w-0 sm:w-40 px-2 sm:px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium shadow-sm hover:shadow text-xs sm:text-sm transition-all gap-1 sm:gap-1.5"
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
                className="inline-flex items-center justify-center h-9 sm:h-10 min-w-0 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all sm:ml-auto sm:w-40"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
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
        </PageCard>
      </div>
    </>
  )
}
