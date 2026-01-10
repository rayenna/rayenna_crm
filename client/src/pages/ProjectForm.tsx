import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectType, UserRole } from '../types'
import toast from 'react-hot-toast'

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

  const { register, handleSubmit, setValue } = useForm()

  useEffect(() => {
    if (project && isEdit) {
      Object.keys(project).forEach((key) => {
        if (key === 'contactNumbers' && project.contactNumbers) {
          setValue(key, JSON.parse(project.contactNumbers))
        } else if (key === 'loanDetails' && project.loanDetails) {
          setValue(key, JSON.parse(project.loanDetails))
        } else {
          setValue(key as any, project[key as keyof Project])
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
    // Format dates
    const dateFields = [
      'confirmationDate',
      'advanceReceivedDate',
      'payment1Date',
      'payment2Date',
      'payment3Date',
      'lastPaymentDate',
      'mnrePortalRegistrationDate',
      'feasibilityDate',
      'registrationDate',
      'installationCompletionDate',
      'subsidyRequestDate',
      'subsidyCreditedDate',
    ]
    dateFields.forEach((field) => {
      if (data[field]) {
        data[field] = new Date(data[field]).toISOString()
      }
    })

    // Format arrays/objects
    if (data.contactNumbers && Array.isArray(data.contactNumbers)) {
      data.contactNumbers = data.contactNumbers.filter((n: string) => n.trim())
    }
    if (data.loanDetails && typeof data.loanDetails === 'object') {
      // Keep as object, will be stringified on backend
    }

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
        {/* Customer Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer Name *
              </label>
              <input
                type="text"
                {...register('customerName', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type *</label>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                {...register('address')}
                rows={2}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Numbers (comma-separated)
              </label>
              <input
                type="text"
                {...register('contactNumbers')}
                placeholder="1234567890, 9876543210"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Consumer Number</label>
              <input
                type="text"
                {...register('consumerNumber')}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lead Source</label>
              <input
                type="text"
                {...register('leadSource')}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Year (FY) *</label>
              <input
                type="text"
                {...register('year', { required: true })}
                placeholder="2024-25"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
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
                <label className="block text-sm font-medium text-gray-700">Project Cost (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('projectCost')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirmation Date
                </label>
                <input
                  type="date"
                  {...register('confirmationDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Incentive Eligible
                </label>
                <input
                  type="checkbox"
                  {...register('incentiveEligible')}
                  className="mt-1"
                />
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

        {/* Project Execution */}
        {canEditExecution && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Project Execution</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Status</label>
                <select
                  {...register('projectStatus')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="LEAD">Lead</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="UNDER_INSTALLATION">Under Installation</option>
                  <option value="SUBMITTED_FOR_SUBSIDY">Submitted for Subsidy</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="COMPLETED_SUBSIDY_CREDITED">Completed - Subsidy Credited</option>
                </select>
              </div>
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
                  Feasibility Date (KSEB)
                </label>
                <input
                  type="date"
                  {...register('feasibilityDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Registration Date (KSEB)
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
                  Subsidy Request Date
                </label>
                <input
                  type="date"
                  {...register('subsidyRequestDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subsidy Credited Date
                </label>
                <input
                  type="date"
                  {...register('subsidyCreditedDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
