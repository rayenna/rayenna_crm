import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { Customer, UserRole } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useDebounce } from '../hooks/useDebounce'
import MultiSelect from '../components/MultiSelect'
import PageCard from '../components/PageCard'
import { FaUserFriends } from 'react-icons/fa'
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200/90 bg-white text-gray-700 shadow-sm transition-all hover:border-primary-200 hover:bg-primary-50/60 hover:shadow"
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
    return (
      <div className="px-0 py-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden bg-gradient-to-b from-slate-50/80 via-white to-teal-50/15">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gradient-to-r from-teal-200 to-gray-200 rounded-lg w-64" />
          <div className="h-12 bg-gradient-to-r from-teal-100/50 to-gray-100 rounded-xl w-full max-w-2xl" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-gradient-to-r from-teal-50/60 to-white rounded-xl border-l-4 border-l-teal-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-paint-fix max-w-full min-w-0 overflow-x-hidden bg-gradient-to-b from-slate-50/90 via-white to-teal-50/15 px-0 py-6 sm:px-0">
      <PageCard
        title="Customer Master"
        subtitle="Manage your customer database"
        icon={<FaUserFriends className="w-5 h-5 text-white" />}
        headerAction={canCreate ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-white/20 border border-white/40 text-white px-4 py-2.5 rounded-xl hover:bg-white/30 font-medium shadow-md transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Customer
          </button>
        ) : undefined}
        className="max-w-full"
      >
      <div className="mb-6 rounded-2xl border border-primary-200/50 bg-gradient-to-br from-white via-teal-50/15 to-primary-50/20 p-4 shadow-md shadow-primary-900/[0.06] ring-1 ring-white/80 sm:p-5">
        <div className="space-y-2 sm:space-y-3">
          {/* Row 1: Search Bar (aligned with Projects page styling) */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <input
              type="text"
              placeholder="Search by name, ID, or consumer number..."
              className="h-[40px] w-full rounded-xl border border-gray-200/90 bg-white/90 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-gray-100/80 placeholder:text-gray-400 transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-500/25 sm:flex-1"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
            />
            {/* Filter for Sales users: All Customers / My Customers */}
            {isSalesUser ? (
              <div className="flex min-h-[40px] w-full flex-col gap-2 rounded-xl border border-primary-100/80 bg-white/70 px-3 py-2.5 shadow-sm sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-4 sm:py-2">
                <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-primary-800">Filter</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="radio"
                      name="customerFilter"
                      value="all"
                      checked={customerFilter === 'all'}
                      onChange={(e) => setCustomerFilter(e.target.value as 'all' | 'my')}
                      className="mr-2 text-primary-600 focus:ring-primary-500/30"
                    />
                    <span className="text-sm font-medium text-gray-700">All Customers</span>
                  </label>
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="radio"
                      name="customerFilter"
                      value="my"
                      checked={customerFilter === 'my'}
                      onChange={(e) => setCustomerFilter(e.target.value as 'all' | 'my')}
                      className="mr-2 text-primary-600 focus:ring-primary-500/30"
                    />
                    <span className="text-sm font-medium text-gray-700">My Customers</span>
                  </label>
                </div>
              </div>
            ) : (
              /* Filter for other users: Sales Person dropdown - right-aligned on desktop, full width on mobile; wide enough for full name on one line */
              <div className="flex min-h-[40px] w-full items-center sm:ml-auto sm:w-auto sm:min-w-[260px] sm:justify-end">
                <MultiSelect
                  className="w-full sm:min-w-[260px]"
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
        
        {/* Export buttons - Only visible to Admin users */}
        {hasRole([UserRole.ADMIN]) && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => handleExportClick('excel')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-amber-900/15 transition-all hover:from-amber-600 hover:to-yellow-600 hover:shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
            <button
              onClick={() => handleExportClick('csv')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </button>
          </div>
        )}
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
            className={`group w-full cursor-pointer rounded-2xl border border-primary-100/70 text-left shadow-md shadow-gray-900/[0.04] ring-1 ring-gray-100/60 transition-all duration-200 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-900/10 ${
              index % 2 === 1
                ? 'border-l-4 border-l-teal-500 bg-gradient-to-br from-slate-50/80 via-white to-teal-50/20'
                : 'border-l-4 border-l-primary-500 bg-gradient-to-br from-white via-white to-primary-50/15'
            }`}
          >
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: Primary info - Who & status */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="inline-flex items-center rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                      ID: {customer.customerId}
                    </span>
                    <h3 className="truncate text-base font-semibold text-gray-900 transition-colors group-hover:text-primary-900 sm:text-lg">
                      {getCustomerDisplayName(customer)}
                    </h3>
                    {(customer as any)._count && (customer as any)._count.projects > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        {(customer as any)._count.projects} Project{(customer as any)._count.projects !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {/* Secondary info - muted, easy to scan */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
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
                      <span className="text-purple-600/90">Consumer: {customer.consumerNumber}</span>
                    )}
                    {customer.contactNumbers && (
                      <span className="text-emerald-600/90">
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
                                className="text-blue-600/90 hover:text-blue-700 hover:underline"
                                title="Open in email application"
                              >
                                {emailStr}
                              </a>
                            )
                          } catch {
                            return (
                              <a
                                href={`mailto:${customer.email}`}
                                className="text-blue-600/90 hover:text-blue-700 hover:underline"
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
                  <p className="truncate text-xs font-medium tabular-nums text-gray-500">
                    Created {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {data != null && (!data.customers || data.customers.length === 0) && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-slate-50/60 to-white px-6 py-14 text-center shadow-sm">
            <p className="mx-auto max-w-md font-medium text-gray-600">No customers match your search or filters.</p>
            <p className="mx-auto mt-2 max-w-md text-xs text-gray-500">
              Try a different search term or widen the salesperson filter.
            </p>
          </div>
        )}
      </div>

      {data != null && (
        <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-gradient-to-r from-white via-teal-50/15 to-white px-4 py-3 shadow-sm sm:flex-row sm:px-5">
          <div className="text-sm text-gray-600">
            Showing page {data.page} of {data.totalPages || 1} ({data.total} total)
          </div>
          {data.totalPages != null && data.totalPages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-primary-200/90 bg-white px-4 py-2 text-sm font-semibold text-primary-800 shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="rounded-xl border border-primary-200/90 bg-white px-4 py-2 text-sm font-semibold text-primary-800 shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
      </PageCard>

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
        message={`The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited. Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.

By exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.

Do you want to continue?`}
        actions={[
          { label: 'CANCEL', variant: 'ghost', onClick: cancelExport },
          { label: 'YES', variant: 'primary', onClick: confirmExport },
        ]}
      />
    </div>
  )
}

export default CustomerMaster
