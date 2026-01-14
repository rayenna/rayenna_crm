import { useEffect, useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectType, ProjectServiceType, UserRole } from '../types'
import toast from 'react-hot-toast'

// File Upload Component
const FileUploadSection = ({ projectId }: { projectId: string }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload images, PDFs, or Office documents.')
        return
      }
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit.')
        return
      }
      setSelectedFile(file)
    }
  }

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await axios.post(`/api/documents/project/${projectId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      toast.success('File uploaded successfully!')
      setSelectedFile(null)
      setCategory('')
      setDescription('')
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload file')
      setUploading(false)
    },
  })

  const handleUpload = () => {
    if (!selectedFile || !category) {
      toast.error('Please select a file and category')
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('category', category)
    if (description) {
      formData.append('description', description)
    }
    uploadMutation.mutate(formData)
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-md font-semibold mb-4">Upload File</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            <option value="photos_videos">Photos / Videos</option>
            <option value="documents">Documents</option>
            <option value="sheets">Sheets</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Add a brief description..."
          />
        </div>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !category || uploading}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
  )
}

const ProjectForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await axios.get(`/api/projects/${id}`)
      return res.data as Project
    },
    enabled: isEdit,
  })

  const { data: salespersons } = useQuery({
    queryKey: ['salespersons'],
    queryFn: async () => {
      const res = await axios.get('/api/users/role/sales')
      return res.data
    },
  })

  const { data: customers, isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      try {
        const res = await axios.get('/api/customers?limit=10000') // Fetch all customers (up to 10000)
        console.log('Customers loaded:', res.data?.customers?.length || 0, 'customers')
        return res.data
      } catch (error: any) {
        console.error('Error fetching customers:', error)
        throw error
      }
    },
    enabled: true, // Always fetch customers
    retry: 2, // Retry on failure
  })

  // Function to calculate Financial Year from a date
  // FY runs from April 1 to March 31
  // e.g., April 1, 2024 to March 31, 2025 = FY 2024-25
  const calculateFY = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return null;
      
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1; // getMonth() returns 0-11
      
      // If month is April (4) or later, FY starts in current year
      // If month is Jan-Mar (1-3), FY started in previous year
      if (month >= 4) {
        // April 2024 to March 2025 = FY 2024-25
        return `${year}-${String(year + 1).slice(-2)}`;
      } else {
        // January 2025 to March 2025 = FY 2024-25 (started in 2024)
        return `${year - 1}-${String(year).slice(-2)}`;
      }
    } catch (error) {
      return null;
    }
  };

  const { register, handleSubmit, setValue, getValues, watch } = useForm()
  const selectedCustomerId = watch('customerId')
  const confirmationDate = watch('confirmationDate')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerDropdownRef = useRef<HTMLDivElement>(null)

  // Auto-calculate FY when confirmationDate changes
  useEffect(() => {
    if (confirmationDate) {
      const fy = calculateFY(confirmationDate);
      if (fy) {
        setValue('year', fy);
      }
    } else {
      // Clear year if confirmationDate is cleared
      setValue('year', '');
    }
  }, [confirmationDate, setValue])

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customers?.customers) return []
    if (!customerSearch.trim()) return customers.customers
    
    const searchLower = customerSearch.toLowerCase()
    return customers.customers.filter((customer: any) => 
      customer.customerName.toLowerCase().includes(searchLower) ||
      customer.customerId.toLowerCase().includes(searchLower) ||
      (customer.consumerNumber && customer.consumerNumber.toLowerCase().includes(searchLower)) ||
      (customer.address && customer.address.toLowerCase().includes(searchLower))
    )
  }, [customers?.customers, customerSearch])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCustomerDropdown])

  useEffect(() => {
    if (project && isEdit) {
      const immutableFields = ['id', 'slNo', 'count', 'createdById', 'createdAt', 'updatedAt', 'totalAmountReceived', 'balanceAmount', 'paymentStatus', 'expectedProfit', 'customer'];
      Object.keys(project).forEach((key) => {
        // Skip immutable/system fields
        if (immutableFields.includes(key)) {
          return;
        }
        // Set customerId from project
        if (key === 'customerId') {
          setValue('customerId', project.customerId);
          // Also set the search field if customer info is available
          if (project.customer) {
            setCustomerSearch(`${project.customer.customerId} - ${project.customer.customerName}`);
          }
        } else if (key === 'loanDetails' && project.loanDetails) {
          try {
            setValue(key, JSON.parse(project.loanDetails));
          } catch {
            setValue(key, project.loanDetails);
          }
        } else {
          // Handle date fields - convert ISO strings to YYYY-MM-DD for HTML date inputs
          if (key.includes('Date') && project[key as keyof Project]) {
            try {
              const dateValue = project[key as keyof Project] as string;
              if (dateValue) {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                  // Format as YYYY-MM-DD for HTML date input
                  const formatted = date.toISOString().split('T')[0];
                  setValue(key as any, formatted);
                } else {
                  setValue(key as any, project[key as keyof Project]);
                }
              }
            } catch {
              setValue(key as any, project[key as keyof Project]);
            }
          } else {
            setValue(key as any, project[key as keyof Project]);
          }
        }
      })
    }
  }, [project, isEdit, setValue])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return axios.put(`/api/projects/${id}`, data)
      } else {
        return axios.post('/api/projects', data)
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Project updated successfully' : 'Project created successfully')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/projects')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Operation failed')
    },
  })

  const onSubmit = (data: any) => {
    // Get all form values including empty fields
    const allValues = getValues();
    
    // Remove immutable/system fields that shouldn't be sent to backend
    const immutableFields = ['id', 'slNo', 'count', 'createdById', 'createdAt', 'updatedAt', 'totalAmountReceived', 'balanceAmount', 'paymentStatus', 'expectedProfit', 'customer'];
    immutableFields.forEach((field) => {
      delete data[field];
    });

    // Ensure customerId is provided
    if (!data.customerId) {
      toast.error('Please select a customer');
      return;
    }

    // Ensure projectServiceType has a default value if not provided
    if (!data.projectServiceType) {
      data.projectServiceType = ProjectServiceType.EPC_PROJECT;
    }

    // Date field names with user-friendly labels for validation
    const dateFields = [
      { field: 'confirmationDate', label: 'Confirmation Date' },
      { field: 'advanceReceivedDate', label: 'Advance Received Date' },
      { field: 'payment1Date', label: 'Payment 1 Date' },
      { field: 'payment2Date', label: 'Payment 2 Date' },
      { field: 'payment3Date', label: 'Payment 3 Date' },
      { field: 'lastPaymentDate', label: 'Last Payment Date' },
      { field: 'mnrePortalRegistrationDate', label: 'MNRE Portal Registration Date' },
      { field: 'feasibilityDate', label: 'Feasibility Date' },
      { field: 'registrationDate', label: 'Registration Date' },
      { field: 'installationCompletionDate', label: 'Installation Completion Date' },
      { field: 'subsidyRequestDate', label: 'Subsidy Request Date' },
    ];
    
    // Validate all dates before proceeding
    const dateErrors: string[] = [];
    
    dateFields.forEach(({ field, label }) => {
      const value = allValues[field] || data[field];
      
      // Skip validation for empty/null dates (they're valid)
      if (!value || value === '' || value === null) {
        data[field] = null;
        return;
      }
      
      try {
        const date = new Date(value);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          dateErrors.push(`${label} is not a valid date. Please enter a valid date.`);
          return;
        }
        
        // Check if date is within reasonable range (1900-2100)
        const year = date.getFullYear();
        if (year < 1900 || year > 2100) {
          dateErrors.push(`${label} has an invalid year (${year}). Please enter a date between 1900 and 2100.`);
          return;
        }
        
        // Date is valid, format it
        data[field] = date.toISOString();
      } catch (error) {
        dateErrors.push(`${label} is not a valid date format. Please enter a valid date (YYYY-MM-DD).`);
      }
    });
    
    // If there are date validation errors, show them and prevent submission
    if (dateErrors.length > 0) {
      const errorMessage = dateErrors.length === 1 
        ? dateErrors[0]
        : `Multiple invalid dates found:\n${dateErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
      
      toast.error(errorMessage, { duration: 6000 });
      return; // Prevent form submission
    }
    
    // Payment field pairs - amount and date must both be provided or both be empty
    const paymentFieldPairs = [
      { amount: 'advanceReceived', date: 'advanceReceivedDate', label: 'Advance Received' },
      { amount: 'payment1', date: 'payment1Date', label: 'Payment 1' },
      { amount: 'payment2', date: 'payment2Date', label: 'Payment 2' },
      { amount: 'payment3', date: 'payment3Date', label: 'Payment 3' },
      { amount: 'lastPayment', date: 'lastPaymentDate', label: 'Last Payment' },
    ];
    
    // Validate that amount and date are both provided or both empty
    const paymentErrors: string[] = [];
    
    paymentFieldPairs.forEach(({ amount, date, label }) => {
      const amountValue = allValues[amount] !== undefined ? allValues[amount] : data[amount];
      const dateValue = allValues[date] !== undefined ? allValues[date] : data[date];
      
      // Check if amount is provided
      const hasAmount = amountValue !== undefined && amountValue !== null && amountValue !== '' && parseFloat(String(amountValue)) > 0;
      // Check if date is provided
      const hasDate = dateValue !== undefined && dateValue !== null && dateValue !== '';
      
      // If amount is provided but date is not, or vice versa, show error
      if (hasAmount && !hasDate) {
        paymentErrors.push(`${label}: Amount is entered but date is missing. Please enter both amount and date.`);
      } else if (hasDate && !hasAmount) {
        paymentErrors.push(`${label}: Date is entered but amount is missing. Please enter both amount and date.`);
      }
      
      // Process amount field
      if (amountValue === undefined || amountValue === null || amountValue === '') {
        data[amount] = 0; // Default to 0 if not provided
      } else {
        // Convert to number
        const numValue = parseFloat(String(amountValue));
        data[amount] = isNaN(numValue) ? 0 : numValue;
      }
    });
    
    // If there are payment validation errors, show them and prevent submission
    if (paymentErrors.length > 0) {
      const errorMessage = paymentErrors.length === 1 
        ? paymentErrors[0]
        : `Payment validation errors:\n${paymentErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
      
      toast.error(errorMessage, { duration: 6000 });
      return; // Prevent form submission
    }

    // Format arrays/objects
    if (data.loanDetails && typeof data.loanDetails === 'object') {
      // Keep as object, will be stringified on backend
    }

    console.log('Submitting data:', data); // Debug log
    // Debug: Log full data object
    console.log('Submitting data (full):', JSON.stringify(data, null, 2));
    console.log('Payment fields:', {
      advanceReceived: data.advanceReceived,
      advanceReceivedDate: data.advanceReceivedDate,
      payment1: data.payment1,
      payment1Date: data.payment1Date,
      payment2: data.payment2,
      payment2Date: data.payment2Date,
      payment3: data.payment3,
      payment3Date: data.payment3Date,
      lastPayment: data.lastPayment,
      lastPaymentDate: data.lastPaymentDate,
    });
    
    mutation.mutate(data)
  }

  const canEditPayments = hasRole([UserRole.ADMIN, UserRole.FINANCE])
  const canEditExecution = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])
  const canEditSales = hasRole([UserRole.ADMIN, UserRole.SALES])

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Project' : 'New Project'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Selection */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Customer & Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              {customersLoading ? (
                <div className="mt-1 text-sm text-gray-500">Loading customers...</div>
              ) : customersError ? (
                <div className="mt-1 text-sm text-red-500">
                  Error loading customers: {customersError?.message || 'Unknown error'}. Please try again or{' '}
                  <Link to="/customers" className="text-primary-600 hover:text-primary-800 underline">
                    create a new customer
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1 relative" ref={customerDropdownRef}>
                      <input
                        type="text"
                        placeholder="Search customer by name, ID, or consumer number..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value)
                          setShowCustomerDropdown(true)
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
                      />
                      {customerSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearch('')
                            setShowCustomerDropdown(false)
                            setValue('customerId', '')
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                      {showCustomerDropdown && filteredCustomers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredCustomers.map((customer: any) => (
                            <div
                              key={customer.id}
                              onMouseDown={(e) => {
                                e.preventDefault() // Prevent input blur
                                setValue('customerId', customer.id)
                                setCustomerSearch(`${customer.customerId} - ${customer.customerName}`)
                                setShowCustomerDropdown(false)
                              }}
                              className="px-4 py-2 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-sm text-gray-900">
                                {customer.customerId} - {customer.customerName}
                              </div>
                              {customer.consumerNumber && (
                                <div className="text-xs text-gray-500">Consumer: {customer.consumerNumber}</div>
                              )}
                              {customer.address && (
                                <div className="text-xs text-gray-500 truncate">{customer.address}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {showCustomerDropdown && customerSearch && filteredCustomers.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-sm text-gray-500">
                          No customers found matching "{customerSearch}"
                        </div>
                      )}
                    </div>
                    <select
                      {...register('customerId', { required: 'Please select a customer' })}
                      onChange={(e) => {
                        const selectedId = e.target.value
                        if (selectedId) {
                          const customer = customers?.customers?.find((c: any) => c.id === selectedId)
                          if (customer) {
                            setCustomerSearch(`${customer.customerId} - ${customer.customerName}`)
                          }
                        } else {
                          setCustomerSearch('')
                        }
                      }}
                      className="w-48 border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Or select from list</option>
                      {customers?.customers && customers.customers.length > 0 ? (
                        customers.customers.map((customer: any) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.customerId} - {customer.customerName}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No customers found</option>
                      )}
                    </select>
                  </div>
                  {customers?.customers && customers.customers.length === 0 && (
                    <p className="mt-2 text-xs text-yellow-600">
                      No customers found. Please{' '}
                      <Link to="/customers" className="text-primary-600 hover:text-primary-800 underline">
                        create a customer
                      </Link>{' '}
                      first.
                    </p>
                  )}
                  <input
                    type="hidden"
                    {...register('customerId', { required: 'Please select a customer' })}
                  />
                </>
              )}
              {selectedCustomerId && customers?.customers && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                  {(() => {
                    const customer = customers.customers.find((c: any) => c.id === selectedCustomerId);
                    if (customer) {
                      return (
                        <div>
                          <p className="font-medium text-gray-900 mb-2">Selected Customer Details:</p>
                          <p><strong>Customer ID:</strong> {customer.customerId}</p>
                          <p><strong>Name:</strong> {customer.customerName}</p>
                          {customer.address && (
                            <p><strong>Address:</strong> {customer.address}</p>
                          )}
                          {customer.contactNumbers && (
                            <p><strong>Contact:</strong> {(() => {
                              try {
                                const contacts = JSON.parse(customer.contactNumbers);
                                return Array.isArray(contacts) ? contacts.join(', ') : customer.contactNumbers;
                              } catch {
                                return customer.contactNumbers;
                              }
                            })()}</p>
                          )}
                          {customer.consumerNumber && (
                            <p><strong>Consumer Number:</strong> {customer.consumerNumber}</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              {!isEdit && (
                <p className="mt-2 text-xs text-gray-500">
                  Don't see the customer? <Link to="/customers" className="text-primary-600 hover:text-primary-800">Create a new customer</Link>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Segment *</label>
              <select
                {...register('type', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {Object.values(ProjectType).map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Type *</label>
              <select
                {...register('projectServiceType', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                defaultValue={ProjectServiceType.EPC_PROJECT}
              >
                <option value={ProjectServiceType.EPC_PROJECT}>EPC Project</option>
                <option value={ProjectServiceType.PANEL_CLEANING}>Panel Cleaning</option>
                <option value={ProjectServiceType.MAINTENANCE}>Maintenance</option>
                <option value={ProjectServiceType.REPAIR}>Repair</option>
                <option value={ProjectServiceType.CONSULTING}>Consulting</option>
                <option value={ProjectServiceType.RESALE}>Resale</option>
                <option value={ProjectServiceType.OTHER_SERVICES}>Other Services</option>
              </select>
            </div>
            {hasRole([UserRole.ADMIN]) && salespersons && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Salesperson</label>
                <select
                  {...register('salespersonId')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select salesperson</option>
                  {salespersons.map((sp: any) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Sales & Commercial */}
        {(canEditSales || isEdit) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Sales & Commercial</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  System Capacity (kW)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('systemCapacity')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Value (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('projectCost')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirmation Date *
                </label>
                <input
                  type="date"
                  {...register('confirmationDate', { required: true })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Year (FY) *</label>
                <input
                  type="text"
                  {...register('year', { required: true })}
                  placeholder="2024-25"
                  readOnly
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
                  title="Automatically calculated from Confirmation Date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Stage</label>
                <select
                  {...register('projectStatus')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="LEAD">Lead</option>
                  <option value="SITE_SURVEY">Site Survey</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="CONFIRMED">Confirmed Order</option>
                  <option value="UNDER_INSTALLATION">Installation</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="COMPLETED_SUBSIDY_CREDITED">Completed - Subsidy Credited</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Roof Type</label>
                <select
                  {...register('roofType')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Roof Type</option>
                  <option value="Concrete-Flat">Concrete-Flat</option>
                  <option value="Concrete-Sloped">Concrete-Sloped</option>
                  <option value="Tile">Tile</option>
                  <option value="Thatched">Thatched</option>
                  <option value="Asbestos">Asbestos</option>
                  <option value="Metal">Metal</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Type</label>
                <div className="flex gap-4 mt-1">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      {...register('systemType')}
                      value="OFF_GRID"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Off-Grid</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      {...register('systemType')}
                      value="ON_GRID"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">On-Grid</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      {...register('systemType')}
                      value="HYBRID"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Hybrid</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Tracking */}
        {canEditPayments && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Tracking</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Advance Received (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('advanceReceived')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Advance Received Date
                </label>
                <input
                  type="date"
                  {...register('advanceReceivedDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 1 (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('payment1')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 1 Date</label>
                <input
                  type="date"
                  {...register('payment1Date')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 2 (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('payment2')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 2 Date</label>
                <input
                  type="date"
                  {...register('payment2Date')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 3 (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('payment3')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 3 Date</label>
                <input
                  type="date"
                  {...register('payment3Date')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Payment (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('lastPayment')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Payment Date</label>
                <input
                  type="date"
                  {...register('lastPaymentDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Project Lifecycle */}
        {canEditExecution && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Project Lifecycle</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  MNRE Portal Registration Date
                </label>
                <input
                  type="date"
                  {...register('mnrePortalRegistrationDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Feasibility Date (DISCOM)
                </label>
                <input
                  type="date"
                  {...register('feasibilityDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Registration Date (DISCOM)
                </label>
                <input
                  type="date"
                  {...register('registrationDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Installation Completion Date
                </label>
                <input
                  type="date"
                  {...register('installationCompletionDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Net Meter Installation Date
                </label>
                <input
                  type="date"
                  {...register('subsidyRequestDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Project Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('totalProjectCost')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Overall cost incurred in the project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Panel Brand</label>
                <input
                  type="text"
                  {...register('panelBrand')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter panel brand name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Inverter Brand</label>
                <input
                  type="text"
                  {...register('inverterBrand')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter inverter brand name"
                />
              </div>
            </div>
          </div>
        )}

        {/* Remarks */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Remarks</h2>
          <textarea
            {...register('remarks')}
            rows={4}
            className="block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        {/* File Upload Section - Only for Sales and Operations in Edit mode */}
        {isEdit && id && hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS]) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">File Uploads</h2>
            <FileUploadSection projectId={id} />
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-4 py-2 border border-secondary-300 rounded-lg text-secondary-700 hover:bg-secondary-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProjectForm
