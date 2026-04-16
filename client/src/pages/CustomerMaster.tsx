import { useState, useEffect, type ReactNode } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { Customer, UserRole } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useDebounce } from '../hooks/useDebounce'
import MultiSelect from '../components/MultiSelect'
import { Users, Plus, Download, Search } from 'lucide-react'
import { ErrorModal } from '@/components/common/ErrorModal'
import { CustomerForm, getCustomerDisplayName } from '../components/customers/CustomerForm'

const CustomerMaster = () => {
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500) // 500ms debounce
  const [showForm, setShowForm] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [pendingExportType, setPendingExportType] = useState<'excel' | 'csv' | null>(null)

  // Filter state: For Sales users - 'all' or 'my', For others - salespersonId array
  const [customerFilter, setCustomerFilter] = useState<'all' | 'my'>('my') // Default to 'my' for Sales users
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<string[]>([])

  const canCreate = hasRole([UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN])
  const isSalesUser = user?.role === UserRole.SALES

  const shell = (children: ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  // Open "new customer" from global shortcut: /customers?new=1
  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    setSearchParams(next, { replace: true })
    if (!canCreate) return
    setShowForm(true)
  }, [searchParams, setSearchParams, canCreate])

  // Fetch sales users for the filter dropdown (only for non-SALES users)
  const { data: salesUsers } = useQuery({
    queryKey: ['salesUsers'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/sales')
      return res.data
    },
    enabled: !isSalesUser, // Only fetch if user is not SALES
  })

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, customerFilter, selectedSalespersonIds])

  const { data, isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch, page, customerFilter, selectedSalespersonIds],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('search', debouncedSearch)
      params.append('page', page.toString())
      params.append('limit', '25')
      
      // For Sales users: add myCustomers filter
      if (isSalesUser) {
        if (customerFilter === 'my') {
          params.append('myCustomers', 'true')
        }
      } else {
        // For other users: add salespersonId filter only if salespersons are selected
        if (selectedSalespersonIds.length > 0) {
          selectedSalespersonIds.forEach((id) => {
            if (id && id.trim() !== '') {
              params.append('salespersonId', id)
            }
          })
        }
        // If no salesperson is selected, don't send salespersonId parameter (shows all customers)
      }
      
      const res = await axiosInstance.get(`/api/customers?${params.toString()}`)
      return res.data
    },
  })

  const getCustomerGoogleMapsUrl = (customer: Customer) => {
    const lat = customer.latitude
    const lng = customer.longitude
    if (typeof lat !== 'number' || typeof lng !== 'number') return null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
  }

  const GoogleMapsIconButton = ({ href }: { href: string }) => {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in Google Maps"
        aria-label="Open in Google Maps"
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] shadow-sm transition-all hover:bg-[color:var(--bg-card-hover)] hover:shadow"
      >
        {/* Compact Google-Maps-like pin icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2c-3.86 0-7 3.14-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z"
            fill="#EA4335"
          />
          <circle cx="12" cy="9" r="2.5" fill="#FFFFFF" />
        </svg>
      </a>
    )
  }

  const handleExportClick = (type: 'excel' | 'csv') => {
    setPendingExportType(type)
    setShowExportConfirm(true)
  }

  const confirmExport = async () => {
    if (!pendingExportType) return

    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (selectedSalespersonIds.length > 0) {
        selectedSalespersonIds.forEach((id) => {
          if (id && id.trim() !== '') {
            params.append('salespersonId', id)
          }
        })
      }
      
      const endpoint = pendingExportType === 'excel' 
        ? `/api/customers/export/excel` 
        : `/api/customers/export/csv`
      const fileExtension = pendingExportType === 'excel' ? 'xlsx' : 'csv'
      
      const response = await axiosInstance.get(`${endpoint}?${params.toString()}`, {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `customers-export-${Date.now()}.${fileExtension}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success(`Customers exported to ${pendingExportType.toUpperCase()} successfully`)
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Export error:', error)
      toast.error(getFriendlyApiErrorMessage(error))
    } finally {
      setShowExportConfirm(false)
      setPendingExportType(null)
    }
  }

  const cancelExport = () => {
    setShowExportConfirm(false)
    setPendingExportType(null)
  }

  if (isLoading) {
    return shell(
      <div className="w-full max-w-full min-w-0 space-y-5 pt-1">
        <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-5">
          <div className="zenith-skeleton mb-3 h-8 w-56 max-w-[70%] rounded-lg" />
          <div className="zenith-skeleton h-4 w-full max-w-md rounded-md" />
        </div>
        <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-5">
          <div className="zenith-skeleton h-12 w-full rounded-xl" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="zenith-skeleton h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>,
    )
  }

  return shell(
    <>
      <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
              <Users className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">Customer Master</h1>
              <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">Manage your customer database</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {hasRole([UserRole.ADMIN]) ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleExportClick('excel')}
                  className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-gold)] shadow-sm transition-colors hover:opacity-95"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleExportClick('csv')}
                  className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-teal)] shadow-sm transition-colors hover:opacity-95"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Export CSV
                </button>
              </div>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] shadow-lg transition-all hover:opacity-95"
              >
                <Plus className="h-4 w-4" aria-hidden />
                New Customer
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mb-6 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-5">
        <div className="space-y-2 sm:space-y-3">
          {/* Row 1: Search Bar (aligned with Projects page styling) */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" aria-hidden />
              <input
                type="text"
                placeholder="Search by name, ID, or consumer number..."
                className="zenith-native-filter-input h-[44px] w-full rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder:text-[color:var(--text-placeholder)]"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
              />
            </div>
            {/* Filter for Sales users: All Customers / My Customers */}
            {isSalesUser ? (
              <div className="flex min-h-[44px] w-full flex-col gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-3 shadow-sm sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-4 sm:py-2.5">
                <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Filter</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="radio"
                      name="customerFilter"
                      value="all"
                      checked={customerFilter === 'all'}
                      onChange={(e) => setCustomerFilter(e.target.value as 'all' | 'my')}
                      className="mr-2 h-4 w-4 shrink-0 accent-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                    />
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">All Customers</span>
                  </label>
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="radio"
                      name="customerFilter"
                      value="my"
                      checked={customerFilter === 'my'}
                      onChange={(e) => setCustomerFilter(e.target.value as 'all' | 'my')}
                      className="mr-2 h-4 w-4 shrink-0 accent-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                    />
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">My Customers</span>
                  </label>
                </div>
              </div>
            ) : (
              /* Filter for other users: Sales Person dropdown - right-aligned on desktop, full width on mobile; wide enough for full name on one line */
              <div className="flex min-h-[44px] w-full items-center sm:ml-auto sm:w-auto sm:min-w-[260px] sm:justify-end">
                <MultiSelect
                  className="w-full sm:min-w-[260px]"
                  variant="zenith"
                  options={salesUsers?.map((salesUser: any) => ({
                    value: salesUser.id,
                    label: salesUser.name,
                  })) || []}
                  selectedValues={selectedSalespersonIds}
                  onChange={(values) => setSelectedSalespersonIds(values)}
                  placeholder="All Sales Persons"
                  showSelectedLabels
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer list - card-like rows (visual rhythm aligned with Projects table) */}
      <div className="space-y-3">
        {data?.customers?.map((customer: Customer, index: number) => (
          <div
            key={customer.id}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              const t = e.target as HTMLElement
              if (t.closest('a, button')) return
              navigate(`/customers/${customer.id}`, {
                state: { fromListFilter: isSalesUser ? customerFilter : undefined },
              })
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              navigate(`/customers/${customer.id}`, {
                state: { fromListFilter: isSalesUser ? customerFilter : undefined },
              })
            }}
            className={`group w-full cursor-pointer rounded-2xl border border-[color:var(--border-card)] text-left shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] transition-colors duration-150 hover:bg-[color:var(--bg-table-hover)] ${
              index % 2 === 1 ? 'bg-[color:var(--bg-table-alt)]' : 'bg-[color:var(--bg-card)]'
            }`}
          >
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: Primary info - Who & status */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="inline-flex items-center rounded-lg bg-[color:var(--accent-gold)] px-2.5 py-1 text-xs font-bold text-[color:var(--text-inverse)] shadow-sm">
                      ID: {customer.customerId}
                    </span>
                    <h3 className="truncate text-base font-semibold text-[color:var(--text-primary)] transition-colors group-hover:text-[color:var(--accent-gold)] sm:text-lg">
                      {getCustomerDisplayName(customer)}
                    </h3>
                    {(customer as any)._count && (customer as any)._count.projects > 0 && (
                      <span className="inline-flex items-center rounded-md border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-2 py-0.5 text-xs font-semibold text-[color:var(--accent-teal)]">
                        {(customer as any)._count.projects} Project{(customer as any)._count.projects !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {/* Secondary info - muted, easy to scan */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[color:var(--text-secondary)]">
                    {(() => {
                      const hasAnyAddress =
                        customer.addressLine1 || customer.addressLine2 || customer.city || customer.state || customer.country || customer.pinCode
                      const mapsUrl = getCustomerGoogleMapsUrl(customer)
                      if (!hasAnyAddress && !mapsUrl) return null
                      const addressText = [
                        customer.addressLine1,
                        customer.addressLine2,
                        customer.city,
                        customer.state,
                        customer.country,
                        customer.pinCode,
                      ]
                        .filter(Boolean)
                        .join(', ')
                      return (
                        <span className="inline-flex items-center gap-1.5">
                          {addressText && <span className="truncate max-w-[200px] sm:max-w-none">{addressText}</span>}
                          {mapsUrl && <GoogleMapsIconButton href={mapsUrl} />}
                        </span>
                      )
                    })()}
                    {customer.consumerNumber && (
                      <span className="text-[color:var(--text-secondary)]">
                        <span className="text-[color:var(--text-muted)]">Consumer:</span> {customer.consumerNumber}
                      </span>
                    )}
                    {customer.contactNumbers && (
                      <span className="font-medium text-[color:var(--accent-teal)]">
                        {(() => {
                          try {
                            const contacts = JSON.parse(customer.contactNumbers)
                            return Array.isArray(contacts) ? contacts.join(', ') : customer.contactNumbers
                          } catch {
                            return customer.contactNumbers
                          }
                        })()}
                      </span>
                    )}
                    {customer.email && (
                      <span>
                        {(() => {
                          try {
                            const emails = JSON.parse(customer.email)
                            const emailList = Array.isArray(emails) ? emails : [customer.email]
                            const emailStr = Array.isArray(emails) ? emails.join(', ') : customer.email
                            const mailtoHref = `mailto:${emailList.filter((e: string) => e?.trim()).join(',')}`
                            return (
                              <a
                                href={mailtoHref}
                                className="text-[color:var(--accent-blue)] underline-offset-2 hover:underline"
                                title="Open in email application"
                              >
                                {emailStr}
                              </a>
                            )
                          } catch {
                            return (
                              <a
                                href={`mailto:${customer.email}`}
                                className="text-[color:var(--accent-blue)] underline-offset-2 hover:underline"
                                title="Open in email application"
                              >
                                {customer.email}
                              </a>
                            )
                          }
                        })()}
                      </span>
                    )}
                  </div>
                </div>
                {/* Right: created date */}
                <div className="flex min-w-0 flex-shrink-0 items-center justify-end">
                  <p className="truncate text-xs font-medium tabular-nums text-[color:var(--text-secondary)]">
                    Created {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {data != null && (!data.customers || data.customers.length === 0) && (
          <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-6 py-14 text-center shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
            <p className="mx-auto max-w-md font-semibold text-[color:var(--text-primary)]">No customers match your search or filters.</p>
            <p className="mx-auto mt-2 max-w-md text-xs text-[color:var(--text-muted)]">
              Try a different search term or widen the salesperson filter.
            </p>
          </div>
        )}
      </div>

      {data != null && (
        <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:flex-row sm:px-5">
          <div className="text-sm text-[color:var(--text-secondary)]">
            Showing page {data.page} of {data.totalPages || 1} ({data.total} total)
          </div>
          {data.totalPages != null && data.totalPages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="min-h-[44px] touch-manipulation rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="min-h-[44px] touch-manipulation rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals rendered outside PageCard to avoid overflow/stacking issues */}
      {showForm && (
        <CustomerForm
          customer={null}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            // Reassigning a customer cascades salespersonId to all its projects on the server.
            // Invalidate projects cache so both old and new salesperson see updated ownership immediately.
            queryClient.invalidateQueries({ queryKey: ['projects'] })
          }}
        />
      )}
      <ErrorModal
        open={showExportConfirm}
        onClose={cancelExport}
        type="warning"
        surface="zenith"
        message={`The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited. Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.

By exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.

Do you want to continue?`}
        actions={[
          { label: 'CANCEL', variant: 'ghost', onClick: cancelExport },
          { label: 'YES', variant: 'primary', onClick: confirmExport },
        ]}
      />
    </>,
  )
}

export default CustomerMaster
