import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { Customer, UserRole } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { countries, getStatesByCountry, getCitiesByState } from '../utils/locationData'
import { useDebounce } from '../hooks/useDebounce'
import MultiSelect from '../components/MultiSelect'
import MapSelector from '../components/MapSelector'
import PageCard from '../components/PageCard'
import { FaUserFriends } from 'react-icons/fa'

/** Helper used by both CustomerMaster list and CustomerForm header */
function getCustomerDisplayName(customer: Customer) {
  const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : customer.customerName || 'Unknown'
}

const CustomerMaster = () => {
  const { user, hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500) // 500ms debounce
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [pendingExportType, setPendingExportType] = useState<'excel' | 'csv' | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const actionsMenuRef = useRef<HTMLDivElement>(null)

  // Close actions menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setOpenActionsId(null)
      }
    }
    if (openActionsId) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openActionsId])
  
  // Filter state: For Sales users - 'all' or 'my', For others - salespersonId array
  const [customerFilter, setCustomerFilter] = useState<'all' | 'my'>('my') // Default to 'my' for Sales users
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<string[]>([])

  const canCreate = hasRole([UserRole.SALES, UserRole.ADMIN])
  const isSalesUser = user?.role === UserRole.SALES

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosInstance.delete(`/api/customers/${id}`)
    },
    onSuccess: () => {
      toast.success('Customer deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete customer')
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
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition"
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

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.id)
      setShowDeleteConfirm(false)
      setCustomerToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setCustomerToDelete(null)
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
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(error.response?.data?.error || `Failed to export customers to ${pendingExportType.toUpperCase()}`)
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
      <div className="px-0 py-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden">
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
    <div className="px-0 py-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden mobile-paint-fix">
      <PageCard
        title="Customer Master"
        subtitle="Manage your customer database"
        icon={<FaUserFriends className="w-5 h-5 text-white" />}
        headerAction={canCreate ? (
          <button
            onClick={() => {
              setEditingCustomer(null)
              setShowForm(true)
            }}
            className="inline-flex items-center gap-2 bg-white/20 border border-white/40 text-white px-4 py-2.5 rounded-xl hover:bg-white/30 font-medium shadow-md transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Customer
          </button>
        ) : undefined}
        className="max-w-full"
      >
      <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 mb-6 p-4 sm:p-5">
        <div className="space-y-2 sm:space-y-3">
          {/* Row 1: Search Bar (same look and feel as Projects) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:gap-4">
            <input
              type="text"
              placeholder="Search by name, ID, or consumer number..."
              className="w-full sm:flex-1 min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
            />
            {/* Filter for Sales users: All Customers / My Customers */}
            {isSalesUser ? (
              <div className="flex items-center gap-4 min-h-[40px] w-full sm:w-auto sm:ml-auto">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter:</label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="customerFilter"
                      value="all"
                      checked={customerFilter === 'all'}
                      onChange={(e) => setCustomerFilter(e.target.value as 'all' | 'my')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">All Customers</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="customerFilter"
                      value="my"
                      checked={customerFilter === 'my'}
                      onChange={(e) => setCustomerFilter(e.target.value as 'all' | 'my')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">My Customers</span>
                  </label>
                </div>
              </div>
            ) : (
              /* Filter for other users: Sales Person dropdown - right-aligned on desktop, full width on mobile; wide enough for full name on one line */
              <div className="w-full sm:w-auto sm:min-w-[260px] sm:ml-auto min-h-[40px] flex items-center sm:justify-end">
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
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleExportClick('excel')}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
            <button
              onClick={() => handleExportClick('csv')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </button>
          </div>
        )}
      </div>

      {/* Customer list - card-like rows, clean hierarchy, 3-dot actions */}
      <div className="space-y-3">
        {data?.customers?.map((customer: Customer) => (
          <div
            key={customer.id}
            className="bg-white rounded-xl border-l-4 border-l-primary-400 border border-primary-100/60 shadow-sm hover:shadow-md hover:border-primary-200/80 hover:border-l-primary-500 transition-all duration-200"
          >
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Left: Primary info - Who & status */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-sm">
                      ID: {customer.customerId}
                    </span>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
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
                {/* Right: Meta + actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 min-w-0">
                  <p className="text-xs text-gray-400 sm:mr-2 truncate">
                    Created {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                  </p>
                  <div className="relative flex-shrink-0" ref={openActionsId === customer.id ? actionsMenuRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setOpenActionsId(openActionsId === customer.id ? null : customer.id)}
                      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      aria-label="Actions"
                      aria-expanded={openActionsId === customer.id}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                    {openActionsId === customer.id && (
                      <div className="absolute right-0 top-full mt-1 py-1 min-w-[10rem] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        {((hasRole([UserRole.ADMIN, UserRole.MANAGEMENT])) || (hasRole([UserRole.SALES]) && customerFilter === 'my')) && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(customer)
                              setShowForm(true)
                              setOpenActionsId(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                        )}
                        {hasRole([UserRole.ADMIN]) && (
                          <button
                            type="button"
                            onClick={() => {
                              handleDelete(customer)
                              setOpenActionsId(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data != null && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            Showing page {data.page} of {data.totalPages || 1} ({data.total} total)
          </div>
          {data.totalPages != null && data.totalPages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-primary-200 rounded-lg text-sm font-medium text-primary-800 bg-primary-50/80 hover:bg-primary-100/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="px-4 py-2 border border-primary-200 rounded-lg text-sm font-medium text-primary-800 bg-primary-50/80 hover:bg-primary-100/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          customer={editingCustomer}
          onClose={() => {
            setShowForm(false)
            setEditingCustomer(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingCustomer(null)
            queryClient.invalidateQueries({ queryKey: ['customers'] })
          }}
        />
      )}
      {showDeleteConfirm && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-red-600 mb-4">WARNING</h3>
              <p className="text-gray-700 mb-6">
                CUSTOMER Details once deleted cannot be recovered
              </p>
              <p className="text-gray-600 mb-6 font-medium">
                Are you sure to Proceed?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showExportConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-red-600 mb-4">WARNING</h3>
              <div className="border-t border-b border-gray-300 my-4 py-4">
                <p className="text-gray-700 mb-4 leading-relaxed">
                  The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited. Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.
                </p>
                <p className="text-gray-700 mb-4 leading-relaxed font-medium">
                  By exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.
                </p>
              </div>
              <p className="text-gray-600 mb-6 font-medium">
                Do you want to continue?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelExport}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmExport}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Customer Form Component
const CustomerForm = ({ 
  customer, 
  onClose, 
  onSuccess 
}: { 
  customer: Customer | null
  onClose: () => void
  onSuccess: () => void
}) => {
  const { hasRole } = useAuth()
  const { data: salespersons } = useQuery({
    queryKey: ['salespersons'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/sales')
      return res.data
    },
  })

  // Fetch full customer data when editing (to get all fields including idProofNumber, idProofType, companyName, companyGst)
  const { data: fullCustomerData } = useQuery({
    queryKey: ['customer', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null
      const res = await axiosInstance.get(`/api/customers/${customer.id}`)
      return res.data as Customer
    },
    enabled: !!customer?.id, // Only fetch if we have a customer ID
  })

  // Use full customer data if available, otherwise fall back to customer prop
  const customerData = fullCustomerData || customer

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm({
    defaultValues: {
      prefix: customerData?.prefix || '',
      firstName: customerData?.firstName || '',
      middleName: customerData?.middleName || '',
      lastName: customerData?.lastName || '',
      addressLine1: customerData?.addressLine1 || '',
      addressLine2: customerData?.addressLine2 || '',
      city: customerData?.city || '',
      state: customerData?.state || '',
      country: customerData?.country || '',
      pinCode: customerData?.pinCode || '',
      consumerNumber: customerData?.consumerNumber || '',
      idProofNumber: customerData?.idProofNumber || '',
      idProofType: customerData?.idProofType || '',
      companyName: customerData?.companyName || '',
      companyGst: customerData?.companyGst || '',
      salespersonId: customerData?.salespersonId || '',
    }
  })

  // Reset form when customer data changes (for edit mode)
  useEffect(() => {
    if (customerData) {
      reset({
        prefix: customerData.prefix || '',
        firstName: customerData.firstName || '',
        middleName: customerData.middleName || '',
        lastName: customerData.lastName || '',
        addressLine1: customerData.addressLine1 || '',
        addressLine2: customerData.addressLine2 || '',
        city: customerData.city || '',
        state: customerData.state || '',
        country: customerData.country || '',
        pinCode: customerData.pinCode || '',
        consumerNumber: customerData.consumerNumber || '',
        idProofNumber: customerData.idProofNumber || '',
        idProofType: customerData.idProofType || '',
        companyName: customerData.companyName || '',
        companyGst: customerData.companyGst || '',
        salespersonId: customerData.salespersonId || '',
      })
    } else {
      reset({
        prefix: '',
        firstName: '',
        middleName: '',
        lastName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: '',
        pinCode: '',
        consumerNumber: '',
        idProofNumber: '',
        idProofType: '',
        companyName: '',
        companyGst: '',
        salespersonId: '',
      })
    }
  }, [customerData?.id, customerData?.idProofNumber, customerData?.idProofType, customerData?.companyName, customerData?.companyGst, reset])
  const [contactNumbers, setContactNumbers] = useState<string[]>(customerData?.contactNumbers ? (() => {
    try {
      const parsed = JSON.parse(customerData.contactNumbers)
      return Array.isArray(parsed) ? parsed : [customerData.contactNumbers]
    } catch {
      return [customerData.contactNumbers]
    }
  })() : [''])

  const [emails, setEmails] = useState<string[]>(customerData?.email ? (() => {
    try {
      const parsed = JSON.parse(customerData.email)
      return Array.isArray(parsed) ? parsed : [customerData.email]
    } catch {
      return [customerData.email]
    }
  })() : [''])

  // Location coordinates state
  const [latitude, setLatitude] = useState<number | null>(customerData?.latitude || null)
  const [longitude, setLongitude] = useState<number | null>(customerData?.longitude || null)
  
  // Sync coordinates when customer changes (for edit mode)
  useEffect(() => {
    if (customerData) {
      setLatitude(customerData.latitude || null)
      setLongitude(customerData.longitude || null)
    } else {
      setLatitude(null)
      setLongitude(null)
    }
  }, [customerData?.id, customerData?.latitude, customerData?.longitude])

  // Sync contactNumbers and emails when customer data changes
  useEffect(() => {
    if (customerData?.contactNumbers) {
      try {
        const parsed = JSON.parse(customerData.contactNumbers)
        setContactNumbers(Array.isArray(parsed) ? parsed : [customerData.contactNumbers])
      } catch {
        setContactNumbers([customerData.contactNumbers])
      }
    } else {
      setContactNumbers([''])
    }
  }, [customerData?.id, customerData?.contactNumbers])

  useEffect(() => {
    if (customerData?.email) {
      try {
        const parsed = JSON.parse(customerData.email)
        setEmails(Array.isArray(parsed) ? parsed : [customerData.email])
      } catch {
        setEmails([customerData.email])
      }
    } else {
      setEmails([''])
    }
  }, [customerData?.id, customerData?.email])
  
  // Watch country and state for cascading dropdowns
  const selectedCountry = watch('country')
  const selectedState = watch('state')
  const idProofNumber = watch('idProofNumber')
  
  // Get states and cities based on selections
  // When editing, use customer's country/state if available, otherwise use watched values
  const countryForStates = selectedCountry || customerData?.country || ''
  const stateForCities = selectedState || customerData?.state || ''
  const availableStates = countryForStates ? getStatesByCountry(countryForStates) : []
  const availableCities = stateForCities && countryForStates ? getCitiesByState(stateForCities, countryForStates) : []
  
  // Reset state and city when country changes (only if country actually changed from existing value)
  useEffect(() => {
    if (selectedCountry && customerData?.country !== selectedCountry) {
      setValue('state', '')
      setValue('city', '')
    }
  }, [selectedCountry, setValue, customerData?.country])
  
  // Reset city when state changes (only if state actually changed from existing value)
  useEffect(() => {
    if (selectedState && customerData?.state !== selectedState) {
      setValue('city', '')
    }
  }, [selectedState, setValue, customerData?.state])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (customerData) {
        return axiosInstance.put(`/api/customers/${customerData.id}`, data)
      } else {
        return axiosInstance.post('/api/customers', data)
      }
    },
    onSuccess: () => {
      toast.success(customerData ? 'Customer updated successfully' : 'Customer created successfully')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Operation failed')
    },
  })

  const onSubmit = (data: any) => {
    // Validate: If Id Proof# is provided, Type of Id Proof is mandatory
    if (data.idProofNumber && data.idProofNumber.trim() !== '' && (!data.idProofType || data.idProofType.trim() === '')) {
      toast.error('Type of Id Proof is required when Id Proof# is provided')
      return
    }
    
    const submitData: any = {
      ...data,
      // Explicitly include these fields to ensure they're sent
      idProofNumber: data.idProofNumber || null,
      idProofType: data.idProofType || null,
      companyName: data.companyName || null,
      companyGst: data.companyGst || null,
      contactNumbers: contactNumbers.filter(cn => cn.trim() !== ''),
      email: emails.filter(e => e.trim() !== ''),
      latitude: latitude,
      longitude: longitude,
    }
    
    if (import.meta.env.DEV) console.log('Submitting customer')
    
    // Remove salespersonId if user doesn't have permission to change it (Sales users)
    // Only Management and Admin can change salespersonId
    if (!hasRole([UserRole.MANAGEMENT, UserRole.ADMIN])) {
      delete submitData.salespersonId
    }
    
    mutation.mutate(submitData)
  }

  const addContactNumber = () => {
    setContactNumbers([...contactNumbers, ''])
  }

  const removeContactNumber = (index: number) => {
    setContactNumbers(contactNumbers.filter((_, i) => i !== index))
  }

  const updateContactNumber = (index: number, value: string) => {
    const updated = [...contactNumbers]
    updated[index] = value
    setContactNumbers(updated)
  }

  const addEmail = () => {
    setEmails([...emails, ''])
  }

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index))
  }

  const updateEmail = (index: number, value: string) => {
    const updated = [...emails]
    updated[index] = value
    setEmails(updated)
  }

  // Shared input styles for consistency
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
  const labelCls = 'block text-sm text-gray-500 mb-1.5'
  const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      {/* Single scroll area so header scrolls up on mobile landscape and leaves more room for form */}
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto customer-form-modal-scroll">
        {/* Header – compact on short/landscape viewports via .customer-form-modal-header */}
        <div className="customer-form-modal-header px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-primary-600 via-primary-500 to-yellow-500 border-b border-primary-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg shadow-black/10 backdrop-blur-md flex-shrink-0">
                <FaUserFriends className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-extrabold text-white drop-shadow truncate">
                  {customer ? getCustomerDisplayName(customerData || customer) : 'New Customer'}
                </h2>
                <p className="mt-0.5 text-white/90 text-xs sm:text-sm">
                  {customer ? 'Edit customer details' : 'Create a new customer and add their details'}
                </p>
                {customer && (
                  <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold bg-white/25 border border-white/40 text-white mt-1.5 sm:mt-2 shadow-sm">
                    ID: {customerData?.customerId || customer.customerId}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-6 sm:space-y-8">
          {/* Card 1: Basic Info */}
          <div className="bg-gradient-to-br from-teal-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-teal-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Info</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Prefix</label>
                <select {...register('prefix')} className={selectCls}>
                  <option value="">None</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Miss">Miss</option>
                  <option value="Mx.">Mx.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                <input {...register('firstName', { required: 'First name is required' })} className={inputCls} placeholder="First Name" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message as string}</p>}
              </div>
              <div>
                <label className={labelCls}>Middle Name</label>
                <input {...register('middleName')} className={inputCls} placeholder="Middle Name" />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input {...register('lastName')} className={inputCls} placeholder="Last Name" />
              </div>
            </div>
          </div>

          {/* Card 2: Address */}
          <div className="bg-gradient-to-br from-sky-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-sky-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Address</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Address Line 1</label>
                <input {...register('addressLine1')} className={inputCls} placeholder="Street address, P.O. Box, etc." />
              </div>
              <div>
                <label className={labelCls}>Address Line 2</label>
                <input {...register('addressLine2')} className={inputCls} placeholder="Apartment, suite, unit, building, floor, etc." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Country</label>
                  <select
                    {...register('country')}
                    value={selectedCountry || customerData?.country || ''}
                    onChange={(e) => {
                      setValue('country', e.target.value)
                      if (e.target.value !== customerData?.country) { setValue('state', ''); setValue('city', '') }
                    }}
                    className={selectCls}
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <select
                    {...register('state')}
                    value={selectedState || customerData?.state || ''}
                    onChange={(e) => {
                      setValue('state', e.target.value)
                      if (e.target.value !== customerData?.state) setValue('city', '')
                    }}
                    className={selectCls}
                    disabled={!countryForStates}
                  >
                    <option value="">Select State</option>
                    {availableStates.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <select
                    {...register('city')}
                    value={watch('city') || customerData?.city || ''}
                    onChange={(e) => setValue('city', e.target.value)}
                    className={selectCls}
                    disabled={!stateForCities}
                  >
                    <option value="">Select City</option>
                    {availableCities.map((city, i) => <option key={`${city.name}-${i}`} value={city.name}>{city.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="max-w-[200px]">
                <label className={labelCls}>Pin Code</label>
                <input {...register('pinCode')} className={inputCls} placeholder="Postal/ZIP code" maxLength={10} />
              </div>
            </div>
            <MapSelector
              latitude={latitude}
              longitude={longitude}
              onLocationChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }}
            />
          </div>

          {/* Card 3: Contact */}
          <div className="bg-gradient-to-br from-emerald-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-emerald-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Contact Numbers</label>
                {contactNumbers.map((contact, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input type="text" value={contact} onChange={(e) => updateContactNumber(index, e.target.value)} placeholder="Phone number" className={`flex-1 ${inputCls}`} />
                    {contactNumbers.length > 1 && (
                      <button type="button" onClick={() => removeContactNumber(index)} className="text-sm text-gray-500 hover:text-red-600 transition-colors">Remove</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addContactNumber} className="text-sm font-medium text-primary-600 hover:text-primary-700">+ Add Contact Number</button>
              </div>
              <div>
                <label className={labelCls}>E-mail IDs</label>
                {emails.map((email, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input type="email" value={email} onChange={(e) => updateEmail(index, e.target.value)} placeholder="example@email.com" className={`flex-1 ${inputCls}`} />
                    {emails.length > 1 && (
                      <button type="button" onClick={() => removeEmail(index)} className="text-sm text-gray-500 hover:text-red-600 transition-colors">Remove</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addEmail} className="text-sm font-medium text-primary-600 hover:text-primary-700">+ Add E-mail ID</button>
              </div>
              <div>
                <label className={labelCls}>DISCOM Consumer Number</label>
                <input {...register('consumerNumber')} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Card 4: Identity & Company */}
          <div className="bg-gradient-to-br from-violet-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-violet-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Identity & Company</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Id Proof#</label>
                <input {...register('idProofNumber')} className={inputCls} placeholder="Enter ID proof number" />
              </div>
              <div>
                <label className={labelCls}>Type of Id Proof {idProofNumber?.trim() && <span className="text-red-500">*</span>}</label>
                <select
                  {...register('idProofType', {
                    validate: (v) => idProofNumber?.trim() && (!v || !v.trim()) ? 'Type of Id Proof is required when Id Proof# is provided' : true
                  })}
                  className={`${selectCls} ${idProofNumber?.trim() && !watch('idProofType') ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : ''}`}
                >
                  <option value="">Select Type</option>
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN">PAN</option>
                  <option value="Voters Card">Voters Card</option>
                  <option value="DL">DL</option>
                  <option value="Passport">Passport</option>
                  <option value="Others">Others</option>
                </select>
                {errors.idProofType && <p className="text-red-500 text-xs mt-1">{errors.idProofType.message as string}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company Name</label>
                <input {...register('companyName')} className={inputCls} placeholder="Enter company name" />
              </div>
              <div>
                <label className={labelCls}>Company GST#</label>
                <input {...register('companyGst')} className={inputCls} placeholder="Enter GST number" />
              </div>
            </div>
          </div>

          {/* Card 5: Assignment (Management/Admin only) */}
          {(hasRole([UserRole.MANAGEMENT]) || hasRole([UserRole.ADMIN])) && customerData && (
            <div className="bg-gradient-to-br from-amber-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-amber-400">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Assignment</h3>
              </div>
              <div>
                <label className={labelCls}>Salesperson</label>
                <select {...register('salespersonId')} className={selectCls}>
                  <option value="">No Salesperson Assigned</option>
                  {salespersons?.map((sp: any) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1.5">Only Management and Admin can change the salesperson for a customer</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-primary-600 rounded-lg hover:from-teal-700 hover:to-primary-700 disabled:opacity-50 transition-colors shadow-md">
              {mutation.isPending ? 'Saving...' : customer ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CustomerMaster
