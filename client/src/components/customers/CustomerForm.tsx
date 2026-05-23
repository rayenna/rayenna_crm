import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
import { parseCustomerStringListForForm } from '../../utils/customerContactFields'
import {
  CUSTOMER_TYPE_OPTIONS,
  getCustomerDisplayName,
  getGstFormValue,
  getIdProofTypeOptions,
  isBusinessCustomerType,
  isAllowedIdProofType,
  validateCustomerIdentityFields,
} from '../../utils/customerRecord'
import {
  emptyCustomerContact,
  loadBusinessContactsFromCustomer,
  normalizeContactsForSave,
  validateBusinessContacts,
  type CustomerContactEntry,
} from '../../utils/customContacts'
import { CustomerContactsEditor } from './CustomerContactsEditor'

function customerToFormValues(customer: Customer | null | undefined) {
  if (!customer) {
    return {
      customerType: 'RESIDENTIAL' as const,
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
    }
  }
  return {
    customerType: customer.customerType || 'RESIDENTIAL',
    prefix: customer.prefix || '',
    firstName: customer.firstName || '',
    middleName: customer.middleName || '',
    lastName: customer.lastName || '',
    addressLine1: customer.addressLine1 || '',
    addressLine2: customer.addressLine2 || '',
    city: customer.city || '',
    state: customer.state || '',
    country: customer.country || '',
    pinCode: customer.pinCode || '',
    consumerNumber: customer.consumerNumber || '',
    idProofNumber: customer.idProofNumber || '',
    idProofType: customer.idProofType || '',
    companyName: customer.companyName || '',
    companyGst: getGstFormValue(customer),
    salespersonId: customer.salespersonId || '',
  }
}

/** Section shell aligned with Project Detail `InfoSection`: header strip + body, no floating title row. */
function CustomerFormSection({
  title,
  icon,
  borderAccentClass,
  headerExtra,
  children,
}: {
  title: string
  icon: ReactNode
  borderAccentClass: string
  headerExtra?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] ${borderAccentClass}`}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)] px-4 py-3 sm:gap-2.5 sm:px-5 sm:py-3.5">
        <span className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[color:var(--zenith-table-header-fg)]">{title}</h3>
        {headerExtra}
      </div>
      <div className="min-w-0 flex-1 space-y-4 px-4 pb-5 pt-4 sm:px-5">{children}</div>
    </section>
  )
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

  const { data: salespersons, isLoading: salespersonsLoading } = useQuery({
    queryKey: ['salespersons'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/sales')
      return res.data
    },
  })

  // Modal edit may open from list rows missing id-proof fields; detail page already has full GET payload.
  const { data: fullCustomerData } = useQuery({
    queryKey: ['customer', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null
      const res = await axiosInstance.get(`/api/customers/${customer.id}`)
      return res.data as Customer
    },
    enabled: !!customer?.id && layout === 'modal',
  })

  const customerData = layout === 'page' && customer ? customer : (fullCustomerData || customer)

  const assignedSalespersonId = customerData?.salespersonId ?? ''
  const assignedSalespersonName = useMemo(() => {
    if (!assignedSalespersonId || !salespersons?.length) return null
    const match = salespersons.find((sp: { id: string; name: string }) => sp.id === assignedSalespersonId)
    return match?.name ?? null
  }, [assignedSalespersonId, salespersons])

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm({
    shouldFocusError: false, // keep focus on validation modal instead of first error field
    defaultValues: customerToFormValues(customerData),
  })

  const watchedCustomerType = watch('customerType')
  const isBusinessType = isBusinessCustomerType(watchedCustomerType)

  // Reset form when customer record changes (edit mode / switching customer)
  useEffect(() => {
    reset(customerToFormValues(customerData))
  }, [
    customerData?.id,
    customerData?.salespersonId,
    customerData?.updatedAt,
    customerData?.customerType,
    customerData?.contacts,
    customerData?.companyName,
    customerData?.idProofNumber,
    customerData?.idProofType,
    customerData?.companyGst,
    customerData?.gstNumber,
    reset,
  ])

  // Native <select> shows the empty option when options load after the value is set (misleading "No Salesperson Assigned").
  useEffect(() => {
    if (!salespersons?.length || !assignedSalespersonId) return
    setValue('salespersonId', assignedSalespersonId, { shouldDirty: false, shouldValidate: false })
  }, [assignedSalespersonId, salespersons, setValue])
  const [contactNumbers, setContactNumbers] = useState<string[]>(() =>
    parseCustomerStringListForForm(customerData?.contactNumbers),
  )

  const [emails, setEmails] = useState<string[]>(() => parseCustomerStringListForForm(customerData?.email))

  const [businessContacts, setBusinessContacts] = useState<CustomerContactEntry[]>(() =>
    isBusinessCustomerType(customerData?.customerType)
      ? loadBusinessContactsFromCustomer(customerData)
      : [emptyCustomerContact()],
  )

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

  useEffect(() => {
    setContactNumbers(parseCustomerStringListForForm(customerData?.contactNumbers))
  }, [customerData?.id, customerData?.contactNumbers])

  useEffect(() => {
    setEmails(parseCustomerStringListForForm(customerData?.email))
  }, [customerData?.id, customerData?.email])

  useEffect(() => {
    if (!isBusinessCustomerType(customerData?.customerType)) return
    setBusinessContacts(loadBusinessContactsFromCustomer(customerData))
  }, [customerData?.id, customerData?.contacts, customerData?.contactNumbers, customerData?.email, customerData?.contactPerson, customerData?.customerType])

  const prevCustomerTypeRef = useRef(watchedCustomerType)
  useEffect(() => {
    const prev = prevCustomerTypeRef.current
    if (isBusinessType && !isBusinessCustomerType(prev)) {
      setBusinessContacts([emptyCustomerContact()])
    }
    if (!isBusinessType && isBusinessCustomerType(prev)) {
      setContactNumbers([''])
      setEmails([''])
    }
    prevCustomerTypeRef.current = watchedCustomerType
  }, [watchedCustomerType, isBusinessType])

  // Watch country and state for cascading dropdowns
  const selectedCountry = watch('country')
  const selectedState = watch('state')
  const idProofNumber = watch('idProofNumber')
  const idProofTypeValue = watch('idProofType')
  const idProofTypeOptions = useMemo(
    () => getIdProofTypeOptions(watchedCustomerType, idProofTypeValue),
    [watchedCustomerType, idProofTypeValue],
  )

  useEffect(() => {
    if (!idProofTypeValue?.trim()) return
    if (!isAllowedIdProofType(watchedCustomerType, idProofTypeValue)) {
      setValue('idProofType', '', { shouldDirty: true, shouldValidate: true })
    }
  }, [watchedCustomerType, idProofTypeValue, setValue])
  
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
    onSuccess: (response) => {
      const mapGpsWarning = response?.data?.mapGpsWarning as string | undefined
      if (mapGpsWarning) {
        toast(mapGpsWarning, { icon: '⚠️', duration: 10000 })
      }
      toast.success(customerData ? 'Customer updated successfully' : 'Customer created successfully')
      onSuccess()
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const fieldLabel: Record<string, string> = {
    customerType: 'Customer type',
    firstName: 'First name',
    companyName: isBusinessType && watchedCustomerType === 'APARTMENT' ? 'Society / building name' : 'Company name',
    addressLine1: 'Address Line 1',
    country: 'Country',
    state: 'State',
    salespersonId: 'Sales Person',
  }

  const onSubmit = (data: any) => {
    const errs: string[] = [
      ...validateCustomerIdentityFields({
        customerType: data.customerType,
        companyName: data.companyName,
        firstName: data.firstName,
      }),
    ]
    if (isBusinessType) {
      errs.push(...validateBusinessContacts(businessContacts))
    } else if (!contactNumbers.some((cn) => (cn || '').trim() !== '')) {
      errs.push('At least one contact number is required.')
    }
    if (data.idProofNumber && data.idProofNumber.trim() !== '' && (!data.idProofType || data.idProofType.trim() === '')) {
      errs.push('Type of Id Proof is required when Id Proof# is provided.')
    } else if (
      data.idProofNumber?.trim() &&
      data.idProofType?.trim() &&
      !isAllowedIdProofType(data.customerType, data.idProofType)
    ) {
      errs.push('Type of Id Proof is not valid for the selected customer type.')
    }
    if (errs.length > 0) {
      setValidationErrors(errs)
      return
    }

    const submitData: any = {
      ...data,
      customerType: data.customerType || 'RESIDENTIAL',
      contactPerson: null,
      idProofNumber: data.idProofNumber || null,
      idProofType: data.idProofType || null,
      companyName: data.companyName?.trim() || null,
      companyGst: data.companyGst?.trim() || null,
      latitude: latitude,
      longitude: longitude,
    }

    if (isBusinessType) {
      submitData.contacts = normalizeContactsForSave(businessContacts)
      submitData.contactPerson = null
      submitData.prefix = ''
      submitData.firstName = ''
      submitData.middleName = ''
      submitData.lastName = ''
    } else {
      submitData.contacts = null
      submitData.contactPerson = null
      submitData.contactNumbers = contactNumbers.filter((cn) => cn.trim() !== '')
      submitData.email = emails.filter((e) => e.trim() !== '')
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

  const inputCls =
    'zenith-native-filter-input w-full rounded-xl px-3 py-2.5 text-sm disabled:opacity-70 placeholder:text-[color:var(--text-placeholder)]'
  const labelCls =
    'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-secondary)]'
  const selectCls = 'zenith-native-select w-full rounded-xl px-3 py-2.5 text-sm disabled:opacity-70'

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
          className={layout === 'modal' ? 'space-y-5 p-4 sm:space-y-6 sm:p-6 md:space-y-7' : 'space-y-5 sm:space-y-6 md:space-y-7'}
        >
          <fieldset disabled={readOnly} className="contents min-w-0 border-0 p-0 m-0">
          <CustomerFormSection
            title="Basic info"
            borderAccentClass="border-l-[3px] border-l-[color:var(--accent-teal)]"
            icon={<svg className="text-[color:var(--accent-teal)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          >
            <div className="max-w-md">
              <label className={labelCls}>
                Customer type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('customerType', { required: 'Customer type is required' })}
                className={selectCls}
              >
                {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.customerType && (
                <p className="text-red-500 text-xs mt-1">{errors.customerType.message as string}</p>
              )}
            </div>

            {isBusinessType ? (
              <div className="max-w-2xl">
                <label className={labelCls}>
                  {watchedCustomerType === 'APARTMENT' ? 'Society / building name' : 'Company name'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('companyName', {
                    validate: (v) => {
                      if (!isBusinessCustomerType(watch('customerType'))) return true
                      return v?.trim() ? true : watchedCustomerType === 'APARTMENT'
                        ? 'Society / building name is required'
                        : 'Company name is required'
                    },
                  })}
                  className={inputCls}
                  placeholder={watchedCustomerType === 'APARTMENT' ? 'e.g. Green Valley Apartments' : 'Registered company name'}
                />
                {errors.companyName && (
                  <p className="text-red-500 text-xs mt-1">{errors.companyName.message as string}</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-[color:var(--text-muted)]">Enter the customer’s name for residential accounts.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    <label className={labelCls}>
                      First name <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('firstName', {
                        validate: (v) =>
                          v?.trim() ? true : 'First name is required for residential customers',
                      })}
                      className={inputCls}
                      placeholder="First name"
                    />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message as string}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Middle name</label>
                    <input {...register('middleName')} className={inputCls} placeholder="Middle name" />
                  </div>
                  <div>
                    <label className={labelCls}>Last name</label>
                    <input {...register('lastName')} className={inputCls} placeholder="Last name" />
                  </div>
                </div>
              </>
            )}
          </CustomerFormSection>

          {isBusinessType ? (
            <CustomerFormSection
              title="Contacts"
              borderAccentClass="border-l-[3px] border-l-[color:var(--accent-teal)]"
              icon={<svg className="text-[color:var(--accent-teal)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
            >
              <p className="mb-4 text-xs text-[color:var(--text-muted)]">
                Add one or more people at this company. Each contact has their own phone numbers and e-mail IDs.
              </p>
              <CustomerContactsEditor
                contacts={businessContacts}
                onChange={setBusinessContacts}
                readOnly={readOnly}
                inputCls={inputCls}
                labelCls={labelCls}
                selectCls={selectCls}
              />
            </CustomerFormSection>
          ) : null}

          <CustomerFormSection
            title="Address"
            borderAccentClass="border-l-[3px] border-l-[color:var(--accent-blue)]"
            icon={<svg className="text-[color:var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          >
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
              <div className="max-w-xs">
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
          </CustomerFormSection>

          {!isBusinessType ? (
          <CustomerFormSection
            title="Contact"
            borderAccentClass="border-l-[3px] border-l-[color:var(--accent-teal)]"
            icon={<svg className="text-[color:var(--accent-teal)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
          >
            <div className="space-y-5">
              <div>
                <label className={labelCls}>
                  Contact numbers <span className="normal-case font-normal text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {contactNumbers.map((contact, index) => (
                    <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={contact}
                        onChange={(e) => updateContactNumber(index, e.target.value)}
                        placeholder="Phone number"
                        className={`min-w-0 flex-1 ${inputCls}`}
                      />
                      {contactNumbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContactNumber(index)}
                          className="shrink-0 self-end min-h-[40px] touch-manipulation rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-xs font-bold text-[color:var(--text-secondary)] shadow-sm transition-colors hover:border-[color:var(--accent-red-border)] hover:bg-[color:var(--accent-red-muted)] hover:text-[color:var(--accent-red)] sm:self-center"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addContactNumber}
                  className="mt-2 inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-extrabold text-[color:var(--text-primary)] shadow-sm transition-colors hover:bg-[color:var(--bg-card-hover)]"
                >
                  <span className="text-[color:var(--accent-teal)]">＋</span>
                  Add contact number
                </button>
              </div>
              <div>
                <label className={labelCls}>E-mail IDs</label>
                <div className="space-y-2">
                  {emails.map((email, index) => (
                    <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="example@email.com"
                        className={`min-w-0 flex-1 ${inputCls}`}
                      />
                      {emails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmail(index)}
                          className="shrink-0 self-end min-h-[40px] touch-manipulation rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-xs font-bold text-[color:var(--text-secondary)] shadow-sm transition-colors hover:border-[color:var(--accent-red-border)] hover:bg-[color:var(--accent-red-muted)] hover:text-[color:var(--accent-red)] sm:self-center"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addEmail}
                  className="mt-2 inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-extrabold text-[color:var(--text-primary)] shadow-sm transition-colors hover:bg-[color:var(--bg-card-hover)]"
                >
                  <span className="text-[color:var(--accent-teal)]">＋</span>
                  Add e-mail ID
                </button>
              </div>
              <div>
                <label className={labelCls}>DISCOM consumer number</label>
                <input {...register('consumerNumber')} className={inputCls} />
              </div>
            </div>
          </CustomerFormSection>
          ) : null}

          <CustomerFormSection
            title="Identity & company"
            borderAccentClass="border-l-[3px] border-l-[color:var(--accent-purple)]"
            icon={<svg className="text-[color:var(--accent-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Id Proof#</label>
                <input {...register('idProofNumber')} className={inputCls} placeholder="Enter ID proof number" />
              </div>
              <div>
                <label className={labelCls}>Type of Id Proof {idProofNumber?.trim() && <span className="text-red-500">*</span>}</label>
                <select
                  key={`id-proof-type-${watchedCustomerType}`}
                  {...register('idProofType', {
                    validate: (v) => {
                      if (idProofNumber?.trim() && (!v || !v.trim())) {
                        return 'Type of Id Proof is required when Id Proof# is provided'
                      }
                      if (v?.trim() && !isAllowedIdProofType(watchedCustomerType, v)) {
                        return 'Select a valid type for this customer type'
                      }
                      return true
                    },
                  })}
                  className={`${selectCls} ${idProofNumber?.trim() && !idProofTypeValue?.trim() ? 'border-[color:var(--accent-red-border)] focus:border-[color:var(--accent-red)] focus:ring-[color:var(--accent-red-muted)]' : ''}`}
                >
                  <option value="">Select type</option>
                  {idProofTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.idProofType && <p className="text-red-500 text-xs mt-1">{errors.idProofType.message as string}</p>}
              </div>
            </div>
            {!isBusinessType ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Company name</label>
                  <input {...register('companyName')} className={inputCls} placeholder="Optional — if billing under a company" />
                </div>
                <div>
                  <label className={labelCls}>GSTIN</label>
                  <input {...register('companyGst')} className={inputCls} placeholder="15-character GST number" />
                </div>
              </div>
            ) : (
              <div className="max-w-md">
                <label className={labelCls}>GSTIN</label>
                <input {...register('companyGst')} className={inputCls} placeholder="15-character GST number" />
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">Saved for Tally and commercial records.</p>
              </div>
            )}
          </CustomerFormSection>

          {(hasRole([UserRole.MANAGEMENT]) || hasRole([UserRole.ADMIN])) && (
            <CustomerFormSection
              title="Assignment"
              borderAccentClass="border-l-[3px] border-l-[color:var(--accent-gold)]"
              headerExtra={!customerData ? <span className="text-sm font-bold text-red-500">*</span> : undefined}
              icon={<svg className="text-[color:var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            >
              <div>
                <label className={labelCls}>
                  Salesperson {!customerData && <span className="normal-case font-normal text-red-500">*</span>}
                </label>
                {readOnly ? (
                  <p className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm font-medium text-[color:var(--text-primary)]">
                    {salespersonsLoading && assignedSalespersonId
                      ? 'Loading…'
                      : assignedSalespersonName ?? (assignedSalespersonId ? 'Assigned salesperson' : 'No Salesperson Assigned')}
                  </p>
                ) : salespersonsLoading ? (
                  <p className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-muted)]">
                    Loading sales team…
                  </p>
                ) : (
                  <select
                    key={`salesperson-${customerData?.id ?? 'new'}-${salespersons?.length ?? 0}`}
                    {...register('salespersonId', {
                      validate: (v) =>
                        !customerData && hasRole([UserRole.ADMIN])
                          ? (v && v.trim() !== '' ? true : 'Sales Person is required for a new customer')
                          : true,
                    })}
                    className={`${selectCls} ${!customerData && hasRole([UserRole.ADMIN]) && !watch('salespersonId')?.trim() ? 'border-[color:var(--accent-red-border)] focus:border-[color:var(--accent-red)] focus:ring-[color:var(--accent-red-muted)]' : ''}`}
                  >
                    <option value="">{customerData ? 'No Salesperson Assigned' : 'Select Sales Person'}</option>
                    {salespersons?.map((sp: { id: string; name: string }) => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                )}
                {errors.salespersonId && <p className="text-red-500 text-xs mt-1">{errors.salespersonId.message as string}</p>}
                <p className="mt-2 rounded-lg border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2 text-xs leading-relaxed text-[color:var(--text-secondary)]">
                  {customerData ? 'Only Management and Admin can change the salesperson for a customer' : 'Admin must assign a Sales Person when creating a new customer'}
                </p>
              </div>
            </CustomerFormSection>
          )}
          </fieldset>

          {(layout === 'modal' || (layout === 'page' && !readOnly)) && (
          <div className="relative">
            <div className="flex flex-wrap justify-end gap-3 border-t border-[color:var(--border-default)] pt-4">
              {layout === 'modal' && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] touch-manipulation rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 py-3 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-colors hover:bg-[color:var(--bg-card-hover)]"
              >
                Cancel
              </button>
              )}
              {layout === 'page' && !readOnly && (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] touch-manipulation rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 py-3 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-colors hover:bg-[color:var(--bg-card-hover)]"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="min-h-[44px] touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-5 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-lg transition-all hover:opacity-95 disabled:opacity-50"
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
              surface="zenith"
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 box-border backdrop-blur-[3px]"
      style={{ ...overlayStyle, background: 'var(--bg-overlay)' }}
    >
      <div
        className="customer-form-modal-scroll w-full max-w-3xl overflow-y-auto rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)] shadow-[var(--shadow-modal)]"
        style={{ maxHeight: 'min(90vh, 90dvh)' }}
      >
        <div className="customer-form-modal-header border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex-shrink-0 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-2 sm:p-2.5 shadow-inner">
                <FaUserFriends className="h-4 w-4 sm:h-5 sm:w-5 text-[color:var(--accent-gold)]" />
              </div>
              <div className="min-w-0">
                <h2 className="zenith-display truncate text-lg font-extrabold text-[color:var(--text-primary)] sm:text-xl">
                  {customer ? getCustomerDisplayName(customerData || customer) : 'New Customer'}
                </h2>
                <p className="mt-0.5 text-xs text-[color:var(--text-secondary)] sm:text-sm">
                  {customer ? 'Edit customer details' : 'Create a new customer and add their details'}
                </p>
                {customer && (
                  <span className="mt-1.5 inline-flex items-center rounded-md bg-[color:var(--accent-gold)] px-2 py-0.5 text-xs font-bold text-[color:var(--text-inverse)] shadow-sm sm:mt-2 sm:px-2.5 sm:py-1">
                    ID: {customerData?.customerId || customer.customerId}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-xl p-1.5 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)] sm:p-2"
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