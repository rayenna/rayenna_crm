import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { User, UserRole } from '../types'
import toast from 'react-hot-toast'
import { useState } from 'react'

const Users = () => {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: UserRole.SALES,
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [resetPasswordModal, setResetPasswordModal] = useState<{ user: User | null; resetLink: string | null }>({ user: null, resetLink: null })

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users')
      return res.data as User[]
    },
    retry: 1,
    staleTime: 60 * 1000, // 1 min – avoid refetch on every focus (reduces flicker)
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return axiosInstance.post('/api/users', data)
    },
    onSuccess: () => {
      toast.success('User created successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false)
      setFormData({ email: '', name: '', password: '', role: UserRole.SALES })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create user')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosInstance.delete(`/api/users/${id}`)
    },
    onSuccess: () => {
      toast.success('User deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await axiosInstance.post('/api/auth/admin/reset-password', { userId })
      return res.data
    },
    onSuccess: (data, userId) => {
      const user = users?.find(u => u.id === userId)
      setResetPasswordModal({ user: user || null, resetLink: data.resetLink })
      toast.success('Password reset token generated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to generate reset token')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id)
      setShowDeleteConfirm(false)
      setUserToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setUserToDelete(null)
  }

  const handleResetPassword = (user: User) => {
    resetPasswordMutation.mutate(user.id)
  }

  const copyResetLink = () => {
    if (resetPasswordModal.resetLink) {
      navigator.clipboard.writeText(resetPasswordModal.resetLink)
      toast.success('Reset link copied to clipboard')
    }
  }

  const closeResetModal = () => {
    setResetPasswordModal({ user: null, resetLink: null })
  }

  if (!hasRole([UserRole.ADMIN])) {
    return <div>Access denied</div>
  }

  if (isLoading) return <div>Loading...</div>

  if (error) {
    const err = error as { response?: { status?: number }; message?: string }
    const is404 = err.response?.status === 404
    return (
      <div className="px-4 py-6 max-w-lg">
        <p className="text-red-600 font-medium">Error loading users</p>
        <p className="text-gray-600 mt-1">{err.message || 'Unknown error'}</p>
        {is404 && (
          <p className="text-sm text-amber-700 mt-3 p-3 bg-amber-50 rounded">
            The Users API returned 404. In production, set <code className="bg-amber-100 px-1">VITE_API_BASE_URL</code> to your backend URL (e.g. your Render API URL) so requests go to <code className="bg-amber-100 px-1">/api/users</code> on the backend.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="border-l-4 border-l-violet-500 pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Users
          </h1>
          <p className="text-sm text-violet-600/80 mt-0.5">Manage user accounts and roles</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-violet-600 to-primary-600 text-white px-4 py-2.5 rounded-xl hover:from-violet-700 hover:to-primary-700 font-medium shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
        >
          {showForm ? 'Cancel' : 'New User'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-white to-violet-50/30 rounded-xl border-l-4 border-l-violet-400 shadow-sm border border-violet-100/60 p-4 sm:p-6 mb-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Create New User</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {Object.values(UserRole).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
                <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-violet-600 to-primary-600 text-white px-4 py-2 rounded-lg hover:from-violet-700 hover:to-primary-700 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
              >
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {!users || users.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No users found. {users === undefined ? 'Loading...' : 'Click "New User" to create one.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l-4 border-l-violet-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="bg-white hover:bg-violet-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={resetPasswordMutation.isPending}
                          className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50 whitespace-nowrap"
                        >
                          {resetPasswordMutation.isPending ? 'Generating...' : 'Reset Password'}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-800 text-sm whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-red-600 mb-4">WARNING</h3>
              <p className="text-sm sm:text-base text-gray-700 mb-6">
                User Details once deleted cannot be recovered
              </p>
              <p className="text-sm sm:text-base text-gray-600 mb-6 font-medium">
                Are you sure to Proceed?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={cancelDelete}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal.user && resetPasswordModal.resetLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-indigo-600 mb-4">Password Reset Link Generated</h3>
              <p className="text-sm sm:text-base text-gray-700 mb-4">
                Reset link for <strong>{resetPasswordModal.user.name}</strong> ({resetPasswordModal.user.email}):
              </p>
              <div className="bg-gray-50 border border-gray-300 rounded-md p-3 mb-4 break-all overflow-x-auto">
                <code className="text-xs sm:text-sm text-gray-800">{resetPasswordModal.resetLink}</code>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Share this link with the user. The token expires in 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={copyResetLink}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Copy Link
                </button>
                <button
                  onClick={closeResetModal}
                  className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
