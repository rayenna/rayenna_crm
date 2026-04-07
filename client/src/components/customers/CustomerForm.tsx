import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { useModalEscape } from '../../contexts/ModalEscapeContext'
import { Customer, UserRole } from '../../types'
import toast from 'react-hot-toast'
import { countries, getStatesByCountry, getCitiesByState } from '../../utils/locationData'
import MapSelector from '../MapSelector'
import { FaUserFriends } from 'react-icons/fa'
import { ErrorModal } from '@/components/common/ErrorModal'

export function getCustomerDisplayName(customer: Customer) {
  const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : customer.customerName || 'Unknown'
}

export function CustomerForm({
  customer,
  onClose,
  onSuccess,
  layout = 'modal',
  readOnly = false,
}: {
  customer: Customer | null
  onClose: () => void
  onSuccess: () => void
  /** Full-page customer detail uses `page`; new/edit modal uses `modal`. */
  layout?: 'modal' | 'page'
  /** When true, all fields are view-only (fieldset disabled). */
  readOnly?: boolean
}) {
  const { hasRole } = useAuth()
  useModalEscape(layout === 'modal', onClose)

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
    shouldFocusError: false, // keep focus on validation modal instead of first error field
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

  const [validationErrors, setValidationErrors] = useState<string[] | null>(null)

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
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const fieldLabel: Record<string, string> = {
    firstName: 'First Name',
    addressLine1: 'Address Line 1',
    country: 'Country',
    state: 'State',
    salespersonId: 'Sales Person',
  }

  const onSubmit = (data: any) => {
    const errs: string[] = []
    if (!contactNumbers.some(cn => (cn || '').trim() !== '')) {
      errs.push('At least one contact number is required.')
    }
    if (data.idProofNumber && data.idProofNumber.trim() !== '' && (!data.idProofType || data.idProofType.trim() === '')) {
      errs.push('Type of Id Proof is required when Id Proof# is provided.')
    }
    if (errs.length > 0) {
      setValidationErrors(errs)
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
    // Only Management and Admin can change salespersonId. Admin must provide it for new customers.
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

  // Focus first input when form opens (New Customer or Edit) so cursor is where the user expects
  const formContainerRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (layout === 'page' || readOnly) return
    const id = requestAnimationFrame(() => {
      const firstInput = formContainerRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(
        'input:not([type="hidden"]), select'
      )
      firstInput?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [layout, readOnly])

  // Shared input styles for consistency
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
  const labelCls = 'block text-sm text-gray-500 mb-1.5'
  const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'

  // Safe-area padding for notched devices (iPhone, iPad); min padding 1rem
  const overlayStyle: CSSProperties = {
    paddingTop: 'max(1rem, env(safe-area-inset-top))',
    paddingRight: 'max(1rem, env(safe-area-inset-right))',
    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
  }

  const onFormInvalid = (formErrors: Record<string, { message?: string } | undefined>) => {
    const messages = Object.entries(formErrors).map(([field, err]) => {
      const msg = err?.message
      const label = fieldLabel[field] || field
      return msg ? `${label}: ${msg}` : `${label} is required`
    })
    setValidationErrors(messages)
  }

  const formEl = (
        <form
          ref={formContainerRef}
          onSubmit={handleSubmit(onSubmit, onFormInvalid)}
          className={layout === 'modal' ? 'p-4 sm:p-6 space-y-6 sm:space-y-8' : 'space-y-6 sm:space-y-8'}
        >
          <fieldset disabled={readOnly} className="contents min-w-0 border-0 p-0 m-0">
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
                <label className={labelCls}>Address Line 1 <span className="text-red-500">*</span></label>
                <input {...register('addressLine1', { required: 'Address Line 1 is required' })} className={inputCls} placeholder="Street address, P.O. Box, etc." />
                {errors.addressLine1 && <p className="text-red-500 text-xs mt-1">{errors.addressLine1.message as string}</p>}
              </div>
              <div>
                <label className={labelCls}>Address Line 2</label>
                <input {...register('addressLine2')} className={inputCls} placeholder="Apartment, suite, unit, building, floor, etc." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Country <span className="text-red-500">*</span></label>
                  <select
                    {...register('country', { required: 'Country is required' })}
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
                  {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message as string}</p>}
                </div>
                <div>
                  <label className={labelCls}>State <span className="text-red-500">*</span></label>
                  <select
                    {...register('state', { required: 'State is required' })}
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
                  {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message as string}</p>}
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
              onLocationChange={(lat, lng) => {
                setLatitude(lat)
                setLongitude(lng)
              }}
              readOnly={readOnly}
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
                <label className={labelCls}>Contact Numbers <span className="text-red-500">*</span></label>
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

          {/* Card 5: Assignment (Management/Admin only) - shown for New Customer (Admin) and Edit (Admin/Management) */}
          {(hasRole([UserRole.MANAGEMENT]) || hasRole([UserRole.ADMIN])) && (
            <div className="bg-gradient-to-br from-amber-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-amber-400">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Assignment</h3>
                {!customerData && <span className="text-red-500">*</span>}
              </div>
              <div>
                <label className={labelCls}>Salesperson {!customerData && <span className="text-red-500">*</span>}</label>
                <select
                  {...register('salespersonId', {
                    validate: (v) =>
                      !customerData && hasRole([UserRole.ADMIN])
                        ? (v && v.trim() !== '' ? true : 'Sales Person is required for a new customer')
                        : true,
                  })}
                  className={`${selectCls} ${!customerData && hasRole([UserRole.ADMIN]) && !watch('salespersonId')?.trim() ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : ''}`}
                >
                  <option value="">{customerData ? 'No Salesperson Assigned' : 'Select Sales Person'}</option>
                  {salespersons?.map((sp: any) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
                {errors.salespersonId && <p className="text-red-500 text-xs mt-1">{errors.salespersonId.message as string}</p>}
                <p className="text-xs text-gray-500 mt-1.5">
                  {customerData ? 'Only Management and Admin can change the salesperson for a customer' : 'Admin must assign a Sales Person when creating a new customer'}
                </p>
              </div>
            </div>
          )}
          </fieldset>

          {(layout === 'modal' || (layout === 'page' && !readOnly)) && (
          <div className="relative">
            <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-gray-100">
              {layout === 'modal' && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
              >
                Cancel
              </button>
              )}
              {layout === 'page' && !readOnly && (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="min-h-[44px] px-5 py-3 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-primary-600 rounded-lg hover:from-teal-700 hover:to-primary-700 disabled:opacity-50 transition-colors shadow-md touch-manipulation"
              >
                {mutation.isPending ? 'Saving...' : customer ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
          )}
            <ErrorModal
              open={!!validationErrors?.length}
              onClose={() => setValidationErrors(null)}
              type="warning"
              anchor={layout === 'page' ? 'viewport' : 'parent'}
              message={validationErrors?.length ? 'Please fix the following:\n\n' + validationErrors.map((m) => '• ' + m).join('\n') : ''}
              actions={[{ label: 'Dismiss', variant: 'ghost', onClick: () => setValidationErrors(null) }]}
            />
        </form>
  )

  if (layout === 'page') {
    return <div className="relative w-full max-w-full min-w-0">{formEl}</div>
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 box-border" style={overlayStyle}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-y-auto customer-form-modal-scroll"
        style={{ maxHeight: 'min(90vh, 90dvh)' }}
      >
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
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        {formEl}
      </div>
    </div>
  )
}