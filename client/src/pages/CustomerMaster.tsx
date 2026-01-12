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

const CustomerMaster = () => {
  const { user, hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({
    search: '',
  })
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const canCreate = hasRole([UserRole.SALES, UserRole.OPERATIONS, UserRole.MANAGEMENT, UserRole.ADMIN])

  const { data, isLoading } = useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
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

  const handleDelete = (customer: Customer) => {
    if (window.confirm(`Are you sure you want to delete customer ${customer.customerName}?`)) {
      deleteMutation.mutate(customer.id)
    }
  }

  if (isLoading) return <div className="px-4 py-6">Loading...</div>

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Master</h1>
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
        <input
          type="text"
          placeholder="Search by name, ID, or consumer number..."
          className="border border-gray-300 rounded-md px-3 py-2 w-full"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {data?.customers?.map((customer: Customer) => (
            <li key={customer.id} className="hover:bg-gray-50">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-primary-600">
                        {customer.customerName}
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
                    </div>
                    {customer.leadSource && (
                      <div className="mt-1 text-xs text-gray-400">
                        Lead Source: {customer.leadSource}
                        {customer.leadBroughtBy && ` • Brought by: ${customer.leadBroughtBy}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        Created: {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {canCreate && (
                      <button
                        onClick={() => {
                          setEditingCustomer(customer)
                          setShowForm(true)
                        }}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
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

      {data?.totalPages > 1 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing page {data.page} of {data.totalPages} ({data.total} total)
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
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      customerName: customer?.customerName || '',
      addressLine1: customer?.addressLine1 || '',
      addressLine2: customer?.addressLine2 || '',
      city: customer?.city || '',
      state: customer?.state || '',
      country: customer?.country || '',
      pinCode: customer?.pinCode || '',
      consumerNumber: customer?.consumerNumber || '',
      email: customer?.email || '',
      idProofNumber: customer?.idProofNumber || '',
      idProofType: customer?.idProofType || '',
      companyName: customer?.companyName || '',
      companyGst: customer?.companyGst || '',
      leadSource: customer?.leadSource || '',
      leadBroughtBy: customer?.leadBroughtBy || '',
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
    
    const submitData = {
      ...data,
      contactNumbers: contactNumbers.filter(cn => cn.trim() !== ''),
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                {...register('customerName', { required: 'Customer name is required' })}
                defaultValue={customer?.customerName}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              {errors.customerName && (
                <p className="text-red-500 text-xs mt-1">{errors.customerName.message as string}</p>
              )}
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
                Utility Consumer Number
              </label>
              <input
                {...register('consumerNumber')}
                defaultValue={customer?.consumerNumber || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail ID
              </label>
              <input
                type="email"
                {...register('email')}
                defaultValue={customer?.email || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="example@email.com"
              />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead Source
              </label>
              <input
                {...register('leadSource')}
                defaultValue={customer?.leadSource || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead Brought By
              </label>
              <input
                {...register('leadBroughtBy')}
                defaultValue={customer?.leadBroughtBy || ''}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

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
