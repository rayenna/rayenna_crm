import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { User, UserRole } from '../types'
import toast from 'react-hot-toast'
import { useState, useRef, useEffect } from 'react'
import PageCard from '../components/PageCard'
import { FaUsers } from 'react-icons/fa'
import { ErrorModal } from '@/components/common/ErrorModal'

/** Horizontal scroll on narrow viewports so columns are not crushed; lighter shadow matches Audit tables. */
const usersTableScrollShell =
  'w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-2xl border border-gray-200/90 bg-white shadow-sm shadow-gray-900/[0.04] ring-1 ring-gray-100 [-webkit-overflow-scrolling:touch]'

const usersHeaderLabel =
  'text-left text-[11px] font-bold uppercase leading-snug tracking-wide text-slate-100 sm:text-xs sm:leading-tight sm:tracking-wider'

const usersHeaderInner =
  'flex min-h-[2rem] w-full min-w-0 items-center px-1.5 py-1 sm:min-h-[2.5rem] sm:px-2 sm:py-1.5'

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
  const createFormFirstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showForm) {
      const id = requestAnimationFrame(() => createFormFirstInputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [showForm])

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
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
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
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
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
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
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
      <div className="px-0 py-6 max-w-lg">
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
    <div className="mobile-paint-fix px-0 py-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden bg-gradient-to-b from-slate-50/90 via-white to-primary-50/15">
      <PageCard
        title="Users"
        subtitle="Manage user accounts and roles"
        icon={<FaUsers className="w-5 h-5 text-white" />}
        headerAction={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-white/20 border border-white/40 text-white px-4 py-2.5 rounded-xl hover:bg-white/30 font-medium shadow-md transition-all"
          >
            {showForm ? 'Cancel' : 'New User'}
          </button>
        }
        className="max-w-full min-w-0 !overflow-x-visible"
        dense
      >
      {showForm && (
        <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl border border-primary-100 shadow-sm p-4 sm:p-6 mb-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Create New User</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                ref={createFormFirstInputRef}
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
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 font-medium shadow-md transition-all"
              >
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="w-full min-w-0">
        {!users || users.length === 0 ? (
          <div className="w-full rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-slate-50/80 to-white px-4 py-12 text-center text-gray-500 shadow-inner shadow-slate-900/[0.03] sm:py-14">
            <p className="text-sm font-medium text-gray-600">
              No users found. {users === undefined ? 'Loading...' : 'Click "New User" to create one.'}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs leading-snug text-gray-600 md:hidden" role="note">
              Swipe sideways to see name, email, role, and actions without overlap.
            </p>
            <div className={usersTableScrollShell} role="region" aria-label="User accounts table">
            {/*
              Proportions tuned for laptop: Role stays content-sized (narrow % + min-width), Email not overly wide.
              Below md: min table width + horizontal scroll so mobile stays readable (same data density as desktop).
            */}
            <table className="w-full max-md:min-w-[48rem] md:min-w-0 table-fixed border-collapse text-sm leading-snug">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[36%]" />
                <col className="min-w-[8.25rem] w-[14%]" />
                <col className="w-[28%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-primary-900/25 bg-gradient-to-r from-primary-800 via-slate-700 to-primary-900 shadow-sm shadow-black/10">
                  <th scope="col" className="px-2.5 py-2 text-left align-middle sm:px-3 sm:py-2.5">
                    <div className={`${usersHeaderInner} w-full`}>
                      <span className={usersHeaderLabel}>Name</span>
                    </div>
                  </th>
                  <th scope="col" className="px-2.5 py-2 text-left align-middle sm:px-3 sm:py-2.5">
                    <div className={`${usersHeaderInner} w-full`}>
                      <span className={usersHeaderLabel}>Email</span>
                    </div>
                  </th>
                  <th scope="col" className="px-2.5 py-2 text-left align-middle sm:px-3 sm:py-2.5">
                    <div className={`${usersHeaderInner} w-full`}>
                      <span className={usersHeaderLabel}>Role</span>
                    </div>
                  </th>
                  <th scope="col" className="px-2.5 py-2 text-right align-middle sm:px-3 sm:py-2.5">
                    <div className={`${usersHeaderInner} w-full justify-end`}>
                      <span className={`${usersHeaderLabel} text-right`}>Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/90">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="bg-white transition-colors duration-150 ease-out odd:bg-white even:bg-slate-50/45 hover:bg-primary-50/70"
                  >
                    <td className="min-w-0 px-2 py-2.5 align-top sm:px-3 sm:py-3 md:align-middle">
                      <p
                        className="break-words text-sm font-semibold leading-snug text-gray-900 md:truncate md:leading-normal"
                        title={user.name}
                      >
                        {user.name}
                      </p>
                    </td>
                    <td className="min-w-0 px-2 py-2.5 align-top sm:px-3 sm:py-3 md:align-middle">
                      <p
                        className="break-all text-sm leading-snug text-gray-600 [overflow-wrap:anywhere] md:break-normal md:truncate md:leading-normal"
                        title={user.email}
                      >
                        {user.email}
                      </p>
                    </td>
                    <td className="min-w-0 px-2 py-2.5 align-top sm:px-3 sm:py-3 md:align-middle">
                      <span className="inline-flex w-fit max-w-full items-center whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-800 ring-1 ring-slate-200/80">
                        {user.role}
                      </span>
                    </td>
                    <td className="min-w-0 px-2 py-2.5 align-top sm:px-3 sm:py-3 md:align-middle">
                      <div className="flex flex-col items-end gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-x-4 md:gap-y-1">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user)}
                          disabled={resetPasswordMutation.isPending}
                          className="min-h-[44px] w-full max-w-[12rem] rounded-lg py-1 text-right text-sm font-medium text-blue-600 hover:bg-blue-50/80 hover:text-blue-800 disabled:opacity-50 md:min-h-0 md:w-auto md:max-w-none md:py-0"
                        >
                          {resetPasswordMutation.isPending ? 'Generating…' : 'Reset Password'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="min-h-[44px] w-full max-w-[12rem] rounded-lg py-1 text-right text-sm font-medium text-red-600 hover:bg-red-50/80 hover:text-red-800 md:min-h-0 md:w-auto md:max-w-none md:py-0"
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
          </>
        )}
      </div>
      </PageCard>

      {/* Delete Confirmation: unified ErrorModal */}
      <ErrorModal
        open={showDeleteConfirm && !!userToDelete}
        onClose={cancelDelete}
        type="warning"
        message="User Details once deleted cannot be recovered. Are you sure to Proceed?"
        actions={[
          { label: 'Cancel', variant: 'ghost', onClick: cancelDelete },
          { label: 'YES', variant: 'primary', onClick: confirmDelete },
        ]}
      />

      {/* Reset Password: unified ErrorModal */}
      <ErrorModal
        open={!!(resetPasswordModal.user && resetPasswordModal.resetLink)}
        onClose={closeResetModal}
        type="info"
        message={
          resetPasswordModal.user && resetPasswordModal.resetLink
            ? `Password Reset Link Generated\n\nReset link for ${resetPasswordModal.user.name} (${resetPasswordModal.user.email}):\n\n${resetPasswordModal.resetLink}\n\nShare this link with the user. The token expires in 24 hours.`
            : ''
        }
        actions={[
          { label: 'Dismiss', variant: 'ghost', onClick: closeResetModal },
          { label: 'Copy Link', variant: 'primary', onClick: copyResetLink },
        ]}
      />
    </div>
  )
}

export default Users
