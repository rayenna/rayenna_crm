import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { useModalEscape } from '../contexts/ModalEscapeContext'
import { Customer, UserRole } from '../types'
import { ArrowLeft, Edit3, Trash2, UserRound } from 'lucide-react'
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

  const shell = (children: ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

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
    return shell(
      <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-6 text-center text-[color:var(--text-muted)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
        Loading customer…
      </div>,
    )
  }

  if (error || !customer) {
    return shell(
      <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-6 text-center shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
        <div className="text-sm font-semibold text-[color:var(--accent-red)]">
          {error ? getFriendlyApiErrorMessage(error) : 'Customer not found'}
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color:var(--bg-card-hover)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Customer Master
          </button>
        </div>
      </div>,
    )
  }

  return (
    <>
      <ErrorModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        type="warning"
        surface="zenith"
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
      {shell(
        <>
          <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] shadow-inner">
                  <UserRound className="h-5 w-5 text-[color:var(--accent-teal)]" strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="zenith-display truncate text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
                    {getCustomerDisplayName(customer)}
                  </h1>
                  <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
                    {isEditing ? 'Edit customer details' : 'Customer details'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                {canEdit && !isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition-colors hover:opacity-95"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden />
                    Edit
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-4 py-2.5 text-sm font-bold text-[color:var(--accent-red)] transition-colors hover:opacity-95"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Delete
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate('/customers')}
                  className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color:var(--bg-card-hover)]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back
                </button>
              </div>
            </div>
          </header>

          <div className="mb-5 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-6">
            <p className="flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
              Created {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
            </p>
            <span className="mt-3 inline-flex items-center rounded-md bg-[color:var(--accent-gold)] px-2.5 py-1 text-xs font-bold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)]">
              ID: {customer.customerId}
            </span>
          </div>

          <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-6 md:p-7">
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
        </>,
      )}
    </>
  )
}
