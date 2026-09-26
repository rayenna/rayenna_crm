import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { Customer, UserRole } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useDebounce } from '../hooks/useDebounce'
import { Users, Plus, Download } from 'lucide-react'
import { ErrorModal } from '@/components/common/ErrorModal'
import { CustomerForm } from '../components/customers/CustomerForm'
import CustomerListFilters from '../components/customers/CustomerListFilters'
import { formatCustomerTypeDisplay, getCustomerDisplayName, type CustomerType } from '../utils/customerRecord'
import { getCustomerTypeBadgeClasses } from '../utils/customerTypeStyles'
import { GoogleMapsIconButton } from '../components/customers/GoogleMapsIconButton'
import { formatCustomerStringList, parseCustomerStringList } from '../utils/customerContactFields'
import {
  applyCustomerListStateToSearchParams,
  buildCustomerExportQueryParams,
  buildCustomerListFilterInput,
  buildCustomerListQueryParams,
  DEFAULT_CUSTOMER_LIST_SORT,
  parseCustomerListStateFromSearchParams,
  type CustomerListSortBy,
} from '../utils/customerListQuery'

const CustomerMaster = () => {
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlInit = parseCustomerListStateFromSearchParams(searchParams)

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState(urlInit.search)
  const debouncedSearch = useDebounce(searchInput, 500)
  const [showForm, setShowForm] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [pendingExportType, setPendingExportType] = useState<'excel' | 'csv' | null>(null)

  const [customerFilter, setCustomerFilter] = useState<'all' | 'my'>(urlInit.customerFilter)
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<string[]>(
    urlInit.selectedSalespersonIds,
  )
  const [customerType, setCustomerType] = useState<CustomerType | ''>(urlInit.customerType)
  const [sortBy, setSortBy] = useState<CustomerListSortBy>(urlInit.sortBy)

  const canCreate = hasRole([UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN])
  const isSalesUser = user?.role === UserRole.SALES
  const skipUrlSyncRef = useRef(true)

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

  // Sync filters → URL (skip first paint so we don't overwrite unrelated params)
  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false
      return
    }
    const next = applyCustomerListStateToSearchParams(searchParams, {
      search: debouncedSearch,
      customerFilter,
      selectedSalespersonIds,
      customerType,
      sortBy,
      isSalesUser,
    })
    const same = next.toString() === searchParams.toString()
    if (!same) setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when filter values change
  }, [
    debouncedSearch,
    customerFilter,
    selectedSalespersonIds,
    customerType,
    sortBy,
    isSalesUser,
  ])

  const { data: salesUsers } = useQuery({
    queryKey: ['salesUsers'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/sales')
      return res.data
    },
    enabled: !isSalesUser,
  })

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, customerFilter, selectedSalespersonIds, customerType, sortBy])

  const listFilters = buildCustomerListFilterInput(
    debouncedSearch,
    page,
    isSalesUser,
    customerFilter,
    selectedSalespersonIds,
    customerType,
    sortBy,
  )

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      'customers',
      debouncedSearch,
      page,
      customerFilter,
      selectedSalespersonIds,
      customerType,
      sortBy,
    ],
    queryFn: async () => {
      const params = buildCustomerListQueryParams(listFilters)
      const res = await axiosInstance.get(`/api/customers?${params.toString()}`)
      return res.data
    },
  })

  const clearAllFilters = () => {
    setSearchInput('')
    setCustomerFilter('my')
    setSelectedSalespersonIds([])
    setCustomerType('')
    setSortBy(DEFAULT_CUSTOMER_LIST_SORT)
  }

  const getCustomerGoogleMapsUrl = (customer: Customer) => {
    const lat = customer.latitude
    const lng = customer.longitude
    if (typeof lat !== 'number' || typeof lng !== 'number') return null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
  }

  const handleExportClick = (type: 'excel' | 'csv') => {
    setPendingExportType(type)
    setShowExportConfirm(true)
  }

  const confirmExport = async () => {
    if (!pendingExportType) return

    try {
      const params = buildCustomerExportQueryParams({
        search: debouncedSearch,
        isSalesUser,
        customerFilter,
        selectedSalespersonIds,
        customerType,
        sortBy,
      })

      const endpoint =
        pendingExportType === 'excel' ? `/api/customers/export/excel` : `/api/customers/export/csv`
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

  const listSkeleton = (
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
    </div>
  )

  const listErrorPanel = (
    <div
      className="rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-5 py-8 text-center shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]"
      role="alert"
    >
      <p className="text-sm font-semibold text-[color:var(--accent-red)]">Could not load customers</p>
      <p className="mx-auto mt-2 max-w-md text-xs text-[color:var(--text-secondary)]">
        {getFriendlyApiErrorMessage(error)}
      </p>
      <button
        type="button"
        onClick={() => void refetch()}
        disabled={isFetching}
        className="mt-4 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl bg-[color:var(--accent-gold)] px-5 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isFetching ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  )

  if (isLoading && !data) {
    return shell(listSkeleton)
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
              <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
                Customer Master
              </h1>
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

      <CustomerListFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        customerType={customerType}
        onCustomerTypeChange={setCustomerType}
        isSalesUser={isSalesUser}
        customerFilter={customerFilter}
        onCustomerFilterChange={setCustomerFilter}
        selectedSalespersonIds={selectedSalespersonIds}
        onSalespersonIdsChange={setSelectedSalespersonIds}
        salesUsers={salesUsers}
        resultTotal={data?.total}
        onClearAll={clearAllFilters}
      />

      {isError ? (
        listErrorPanel
      ) : (
        <>
          <div className="space-y-3">
            {data?.customers?.map((customer: Customer, index: number) => (
              <div
                key={customer.id}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  const t = e.target as HTMLElement
                  if (t.closest('a, button')) return
                  navigate(`/customers/${customer.id}`)
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  navigate(`/customers/${customer.id}`)
                }}
                className={`group w-full cursor-pointer rounded-2xl border border-[color:var(--border-card)] text-left shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] transition-colors duration-150 hover:bg-[color:var(--bg-table-hover)] ${
                  index % 2 === 1 ? 'bg-[color:var(--bg-table-alt)]' : 'bg-[color:var(--bg-card)]'
                }`}
              >
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="inline-flex items-center rounded-lg bg-[color:var(--accent-gold)] px-2.5 py-1 text-xs font-bold text-[color:var(--text-inverse)] shadow-sm">
                          ID: {customer.customerId}
                        </span>
                        <h3 className="truncate text-base font-semibold text-[color:var(--text-primary)] transition-colors group-hover:text-[color:var(--accent-gold)] sm:text-lg">
                          {getCustomerDisplayName(customer)}
                        </h3>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getCustomerTypeBadgeClasses(customer.customerType)}`}
                          title="Customer type"
                        >
                          {formatCustomerTypeDisplay(customer.customerType)}
                        </span>
                        {customer._count != null && customer._count.projects > 0 && (
                          <span className="inline-flex items-center rounded-md border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-2 py-0.5 text-xs font-semibold text-[color:var(--accent-teal)]">
                            {customer._count.projects} Project
                            {customer._count.projects !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[color:var(--text-secondary)]">
                        {(() => {
                          const hasAnyAddress =
                            customer.addressLine1 ||
                            customer.addressLine2 ||
                            customer.city ||
                            customer.state ||
                            customer.country ||
                            customer.pinCode
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
                              {addressText && (
                                <span className="truncate max-w-[200px] sm:max-w-none">{addressText}</span>
                              )}
                              {mapsUrl && <GoogleMapsIconButton href={mapsUrl} />}
                            </span>
                          )
                        })()}
                        {customer.consumerNumber && (
                          <span className="text-[color:var(--text-secondary)]">
                            <span className="text-[color:var(--text-muted)]">Consumer:</span>{' '}
                            {customer.consumerNumber}
                          </span>
                        )}
                        {customer.contactNumbers && (
                          <span className="font-medium text-[color:var(--accent-teal)]">
                            {formatCustomerStringList(parseCustomerStringList(customer.contactNumbers))}
                          </span>
                        )}
                        {customer.email &&
                          (() => {
                            const emailList = parseCustomerStringList(customer.email)
                            if (emailList.length === 0) return null
                            const mailtoHref = `mailto:${emailList.join(',')}`
                            return (
                              <span>
                                <a
                                  href={mailtoHref}
                                  className="text-[color:var(--accent-blue)] underline-offset-2 hover:underline"
                                  title="Open in email application"
                                >
                                  {formatCustomerStringList(emailList)}
                                </a>
                              </span>
                            )
                          })()}
                      </div>
                    </div>
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
                <p className="mx-auto max-w-md font-semibold text-[color:var(--text-primary)]">
                  No customers match your search or filters.
                </p>
                <p className="mx-auto mt-2 max-w-md text-xs text-[color:var(--text-muted)]">
                  Try a different search, type, or salesperson filter — or clear filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-4 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)]"
                >
                  Clear filters
                </button>
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="min-h-[44px] touch-manipulation rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page >= data.totalPages}
                    className="min-h-[44px] touch-manipulation rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showForm && (
        <CustomerForm
          customer={null}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['customers'] })
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
