import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Customer, UserRole } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { countries, getStatesByCountry, getCitiesByState, State, City } from '../utils/locationData'
import { useDebounce } from '../hooks/useDebounce'
import MultiSelect from '../components/MultiSelect'

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
  
  // Filter state: For Sales users - 'all' or 'my', For others - salespersonId array
  const [customerFilter, setCustomerFilter] = useState<'all' | 'my'>('my') // Default to 'my' for Sales users
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<string[]>([])

  const canCreate = hasRole([UserRole.SALES, UserRole.ADMIN])
  const isSalesUser = user?.role === UserRole.SALES

  // Fetch sales users for the filter dropdown (only for non-SALES users)
  const { data: salesUsers } = useQuery({
    queryKey: ['salesUsers'],
    queryFn: async () => {
      const res = await axios.get('/api/users/role/sales')
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
      
      const res = await axios.get(`/api/customers?${params.toString()}`)
      return res.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.delete(`/api/customers/${id}`)
    },
    onSuccess: () => {
      toast.success('Customer deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete customer')
    },
  })

  const getCustomerDisplayName = (customer: Customer) => {
    const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : customer.customerName || 'Unknown'
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
      
      const response = await axios.get(`${endpoint}?${params.toString()}`, {
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

  if (isLoading) return <div className="px-4 py-6">Loading...</div>

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 via-green-500 to-primary-600 bg-clip-text text-transparent mb-3 drop-shadow-lg">
          Customer Master
        </h1>
        {canCreate && (
          <button
            onClick={() => {
              setEditingCustomer(null)
              setShowForm(true)
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium shadow-md hover:shadow-lg transition-all"
          >
            New Customer
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg mb-4 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Search by name, ID, or consumer number..."
            className="border border-gray-300 rounded-md px-3 py-2 w-full"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          
          {/* Filter for Sales users: All Customers / My Customers */}
          {isSalesUser ? (
            <div className="flex items-center gap-4">
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
            /* Filter for other users: Sales Person dropdown */
            <div>
              <MultiSelect
                options={salesUsers?.map((salesUser: any) => ({
                  value: salesUser.id,
                  label: `${salesUser.name} (${salesUser.email})`,
                })) || []}
                selectedValues={selectedSalespersonIds}
                onChange={(values) => setSelectedSalespersonIds(values)}
                placeholder="All Sales Persons"
              />
            </div>
          )}
        </div>
        
        {/* Export buttons - Only visible to Admin users */}
        {hasRole([UserRole.ADMIN]) && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleExportClick('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
            <button
              onClick={() => handleExportClick('csv')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </button>
          </div>
        )}
      </div>

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

      {/* Delete Confirmation Modal */}
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

      {/* Export Confirmation Modal */}
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {data?.customers?.map((customer: Customer) => (
            <li key={customer.id} className="hover:bg-gray-50">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-primary-600">
                        {getCustomerDisplayName(customer)}
                      </p>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                        ID: {customer.customerId}
                      </span>
                      {(customer as any)._count && (customer as any)._count.projects > 0 && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700">
                          {(customer as any)._count.projects} Project{(customer as any)._count.projects !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {(customer.addressLine1 || customer.city || customer.state || customer.country) && (
                        <span>
                          {[customer.addressLine1, customer.addressLine2, customer.city, customer.state, customer.country, customer.pinCode]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      )}
                      {customer.consumerNumber && (
                        <span className="ml-4">Consumer: {customer.consumerNumber}</span>
                      )}
                      {customer.contactNumbers && (
                        <span className="ml-4">
                          Contact: {(() => {
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
                        <span className="ml-4">
                          Email: {(() => {
                            try {
                              const emails = JSON.parse(customer.email)
                              return Array.isArray(emails) ? emails.join(', ') : customer.email
                            } catch {
                              return customer.email
                            }
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        Created: {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {(() => {
                      // Admin and Management can always edit
                      if (hasRole([UserRole.ADMIN, UserRole.MANAGEMENT])) {
                        return (
                          <button
                            onClick={() => {
                              setEditingCustomer(customer)
                              setShowForm(true)
                            }}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                        )
                      }
                      
                      // Sales can edit ONLY when viewing "My Customers" (not "All Customers")
                      if (hasRole([UserRole.SALES])) {
                        // Hide edit button when viewing "All Customers"
                        if (customerFilter === 'all') {
                          return null
                        }
                        
                        // In "My Customers" view, backend already filters to show only customers
                        // where user created the customer, is tagged as salesperson, OR created projects for them
                        // So we show Edit button for ALL customers in this view
                        // (Backend will still verify permissions on edit)
                        return (
                          <button
                            onClick={() => {
                              setEditingCustomer(customer)
                              setShowForm(true)
                            }}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                        )
                      }
                      
                      return null
                    })()}
                    {hasRole([UserRole.ADMIN]) && (
                      <button
                        onClick={() => handleDelete(customer)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {data?.totalPages && data.totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            Showing page {data.page} of {data.totalPages} ({data.total} total)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
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
      const res = await axios.get('/api/users/role/sales')
      return res.data
    },
  })

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      prefix: customer?.prefix || '',
      firstName: customer?.firstName || '',
      middleName: customer?.middleName || '',
      lastName: customer?.lastName || '',
      addressLine1: customer?.addressLine1 || '',
      addressLine2: customer?.addressLine2 || '',
      city: customer?.city || '',
      state: customer?.state || '',
      country: customer?.country || '',
      pinCode: customer?.pinCode || '',
      consumerNumber: customer?.consumerNumber || '',
      idProofNumber: customer?.idProofNumber || '',
      idProofType: customer?.idProofType || '',
      companyName: customer?.companyName || '',
      companyGst: customer?.companyGst || '',
      salespersonId: customer?.salespersonId || '',
    }
  })
  const [contactNumbers, setContactNumbers] = useState<string[]>(customer?.contactNumbers ? (() => {
    try {
      const parsed = JSON.parse(customer.contactNumbers)
      return Array.isArray(parsed) ? parsed : [customer.contactNumbers]
    } catch {
      return [customer.contactNumbers]
    }
  })() : [''])

  const [emails, setEmails] = useState<string[]>(customer?.email ? (() => {
    try {
      const parsed = JSON.parse(customer.email)
      return Array.isArray(parsed) ? parsed : [customer.email]
    } catch {
      return [customer.email]
    }
  })() : [''])
  
  // Watch country and state for cascading dropdowns
  const selectedCountry = watch('country')
  const selectedState = watch('state')
  const idProofNumber = watch('idProofNumber')
  
  // Get states and cities based on selections
  // When editing, use customer's country/state if available, otherwise use watched values
  const countryForStates = selectedCountry || customer?.country || ''
  const stateForCities = selectedState || customer?.state || ''
  const availableStates = countryForStates ? getStatesByCountry(countryForStates) : []
  const availableCities = stateForCities && countryForStates ? getCitiesByState(stateForCities, countryForStates) : []
  
  // Reset state and city when country changes (only if country actually changed from existing value)
  useEffect(() => {
    if (selectedCountry && customer?.country !== selectedCountry) {
      setValue('state', '')
      setValue('city', '')
    }
  }, [selectedCountry, setValue, customer?.country])
  
  // Reset city when state changes (only if state actually changed from existing value)
  useEffect(() => {
    if (selectedState && customer?.state !== selectedState) {
      setValue('city', '')
    }
  }, [selectedState, setValue, customer?.state])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (customer) {
        return axios.put(`/api/customers/${customer.id}`, data)
      } else {
        return axios.post('/api/customers', data)
      }
    },
    onSuccess: () => {
      toast.success(customer ? 'Customer updated successfully' : 'Customer created successfully')
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
      contactNumbers: contactNumbers.filter(cn => cn.trim() !== ''),
      email: emails.filter(e => e.trim() !== ''),
    }
    
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {customer ? 'Edit Customer' : 'New Customer'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prefix
                </label>
                <select
                  {...register('prefix')}
                  defaultValue={customer?.prefix || ''}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  {...register('firstName', { required: 'First name is required' })}
                  defaultValue={customer?.firstName || ''}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="First Name"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName.message as string}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  {...register('middleName')}
                  defaultValue={customer?.middleName || ''}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Middle Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  {...register('lastName')}
                  defaultValue={customer?.lastName || ''}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                {...register('addressLine1')}
                defaultValue={customer?.addressLine1 || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Street address, P.O. Box, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                {...register('addressLine2')}
                defaultValue={customer?.addressLine2 || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Apartment, suite, unit, building, floor, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  {...register('country')}
                  value={selectedCountry || customer?.country || ''}
                  onChange={(e) => {
                    setValue('country', e.target.value)
                    if (e.target.value !== customer?.country) {
                      setValue('state', '')
                      setValue('city', '')
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  {...register('state')}
                  value={selectedState || customer?.state || ''}
                  onChange={(e) => {
                    setValue('state', e.target.value)
                    if (e.target.value !== customer?.state) {
                      setValue('city', '')
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={!countryForStates}
                >
                  <option value="">Select State</option>
                  {availableStates.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  {...register('city')}
                  value={watch('city') || customer?.city || ''}
                  onChange={(e) => setValue('city', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={!stateForCities}
                >
                  <option value="">Select City</option>
                  {availableCities.map((city, index) => (
                    <option key={`${city.name}-${index}`} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pin Code
              </label>
              <input
                {...register('pinCode')}
                defaultValue={customer?.pinCode || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Postal/ZIP code"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Numbers
              </label>
              {contactNumbers.map((contact, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => updateContactNumber(index, e.target.value)}
                    placeholder="Phone number"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  />
                  {contactNumbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContactNumber(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addContactNumber}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                + Add Contact Number
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DISCOM Consumer Number
              </label>
              <input
                {...register('consumerNumber')}
                defaultValue={customer?.consumerNumber || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail IDs
              </label>
              {emails.map((email, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    placeholder="example@email.com"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  />
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addEmail}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                + Add E-mail ID
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Id Proof#
                </label>
                <input
                  {...register('idProofNumber')}
                  defaultValue={customer?.idProofNumber || ''}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter ID proof number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type of Id Proof
                  {idProofNumber && idProofNumber.trim() !== '' && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  {...register('idProofType', {
                    validate: (value) => {
                      if (idProofNumber && idProofNumber.trim() !== '' && (!value || value.trim() === '')) {
                        return 'Type of Id Proof is required when Id Proof# is provided'
                      }
                      return true
                    }
                  })}
                  defaultValue={customer?.idProofType || ''}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 ${idProofNumber && idProofNumber.trim() !== '' && !watch('idProofType') ? 'border-red-300' : ''}`}
                >
                  <option value="">Select Type</option>
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN">PAN</option>
                  <option value="Voters Card">Voters Card</option>
                  <option value="DL">DL</option>
                  <option value="Passport">Passport</option>
                  <option value="Others">Others</option>
                </select>
                {errors.idProofType && (
                  <p className="text-red-500 text-xs mt-1">{errors.idProofType.message as string}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                {...register('companyName')}
                defaultValue={customer?.companyName || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company GST#
              </label>
              <input
                {...register('companyGst')}
                defaultValue={customer?.companyGst || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter GST number"
              />
            </div>

            {/* Salesperson field - Only visible to Management and Admin */}
            {(hasRole([UserRole.MANAGEMENT]) || hasRole([UserRole.ADMIN])) && customer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salesperson
                </label>
                <select
                  {...register('salespersonId')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">No Salesperson Assigned</option>
                  {salespersons?.map((salesperson: any) => (
                    <option key={salesperson.id} value={salesperson.id}>
                      {salesperson.name} ({salesperson.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only Management and Admin can change the salesperson for a customer
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {mutation.isPending ? 'Saving...' : customer ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CustomerMaster
