import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { User, UserRole } from '../types'
import toast from 'react-hot-toast'
import { useState, useRef, useEffect } from 'react'
import { Users as UsersGroupIcon } from 'lucide-react'
import { ErrorModal } from '@/components/common/ErrorModal'

const usersTableScrollShell =
  'zenith-scroll-x w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-card)] [-webkit-overflow-scrolling:touch]'

const usersHeaderLabel =
  'text-left text-[11px] font-bold uppercase leading-snug tracking-wide text-[color:var(--zenith-table-header-fg)] sm:text-xs sm:leading-tight sm:tracking-wider'

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
  const [resetPasswordModal, setResetPasswordModal] = useState<{ user: User | null; resetLink: string | null }>({
    user: null,
    resetLink: null,
  })
  const [policyModal, setPolicyModal] = useState<{
    open: boolean
    type: 'info' | 'warning' | 'error'
    title?: string
    message: string
  }>({ open: false, type: 'info', message: '' })
  const createFormFirstInputRef = useRef<HTMLInputElement>(null)

  const closePolicyModal = () => setPolicyModal({ open: false, type: 'info', message: '' })

  const getApiErrorMessage = (err: unknown): string => {
    const anyErr = err as any
    const msg =
      anyErr?.response?.data?.error ||
      anyErr?.response?.data?.message ||
      anyErr?.message ||
      ''
    return typeof msg === 'string' ? msg : ''
  }

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
    staleTime: 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return axiosInstance.post('/api/users', data)
    },
    onSuccess: () => {
      toast.success('User created successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false)
      setFormData({ email: '', name: '', password: '', role: UserRole.SALES })
    },
    onError: (err: unknown) => {
      const apiMsg = getApiErrorMessage(err)
      if (apiMsg.includes('Only one ADMIN user is allowed')) {
        setPolicyModal({
          open: true,
          type: 'info',
          message: apiMsg,
        })
        return
      }
      toast.error(getFriendlyApiErrorMessage(err))
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
    onError: (err: unknown) => {
      const apiMsg = getApiErrorMessage(err)
      if (apiMsg.includes('Cannot delete your own account')) {
        setPolicyModal({
          open: true,
          type: 'warning',
          message: apiMsg,
        })
        return
      }
      toast.error(getFriendlyApiErrorMessage(err))
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await axiosInstance.post('/api/auth/admin/reset-password', { userId })
      return res.data
    },
    onSuccess: (data, userId) => {
      const u = users?.find((x) => x.id === userId)
      setResetPasswordModal({ user: u || null, resetLink: data.resetLink })
      toast.success('Password reset token generated successfully')
    },
    onError: (err: unknown) => {
      toast.error(getFriendlyApiErrorMessage(err))
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
      void navigator.clipboard.writeText(resetPasswordModal.resetLink)
      toast.success('Reset link copied to clipboard')
    }
  }

  const closeResetModal = () => {
    setResetPasswordModal({ user: null, resetLink: null })
  }

  const shell = (children: React.ReactNode) => (
    <div
      className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]"
    >
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  if (!hasRole([UserRole.ADMIN])) {
    return shell(
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 pt-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-8 shadow-[var(--shadow-card)]">
          <p className="zenith-display text-lg font-bold tracking-tight text-[color:var(--text-primary)]">Access denied</p>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-secondary)]">Administrator privileges are required to manage users.</p>
        </div>
      </div>,
    )
  }

  if (isLoading) {
    return shell(
      <div className="w-full max-w-full min-w-0 space-y-5 pt-1">
        <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="zenith-skeleton mb-3 h-8 w-48 max-w-[70%] rounded-lg" />
          <div className="zenith-skeleton h-4 w-full max-w-md rounded-md" />
        </div>
        <div className="space-y-3 md:hidden">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
              <div className="zenith-skeleton mb-3 h-5 w-2/3 rounded-md" />
              <div className="zenith-skeleton mb-4 h-4 w-full rounded-md" />
              <div className="flex gap-2">
                <div className="zenith-skeleton h-9 flex-1 rounded-xl" />
                <div className="zenith-skeleton h-9 flex-1 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] md:block">
          <div className="space-y-0 divide-y divide-[color:var(--border-default)] p-4">
            {[1, 2, 3, 4, 5].map((k) => (
              <div key={k} className="flex gap-4 py-3">
                <div className="zenith-skeleton h-5 w-[22%] rounded-md" />
                <div className="zenith-skeleton h-5 flex-1 rounded-md" />
                <div className="zenith-skeleton h-5 w-24 rounded-full" />
                <div className="zenith-skeleton h-5 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>,
    )
  }

  if (error) {
    const err = error as { response?: { status?: number }; message?: string }
    const is404 = err.response?.status === 404
    return shell(
      <div className="mx-auto max-w-xl pt-6">
        <div className="rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-5 text-sm text-[color:var(--text-primary)]">
          <p className="font-semibold text-[color:var(--accent-red)]">Error loading users</p>
          <p className="mt-2 text-[color:var(--text-secondary)]">{err.message || 'Unknown error'}</p>
          {is404 && (
            <p className="mt-3 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-3 text-xs leading-relaxed text-[color:var(--text-primary)]">
              The Users API returned 404. In production, set{' '}
              <code className="rounded border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-1.5 py-0.5 text-[color:var(--accent-gold)]">VITE_API_BASE_URL</code> to your backend URL
              (e.g. your Render API URL) so requests go to{' '}
              <code className="rounded border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-1.5 py-0.5 text-[color:var(--accent-gold)]">/api/users</code> on the backend.
            </p>
          )}
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
            className="mt-5 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl bg-[color:var(--accent-gold)] px-5 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] transition-opacity hover:opacity-95"
          >
            Try again
          </button>
        </div>
      </div>,
    )
  }

  const toggleFormLabel = showForm ? 'Cancel' : 'New User'

  return shell(
    <>
      <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
              <UsersGroupIcon className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">Users</h1>
              <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">Manage accounts, roles, and password recovery.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-gold)] shadow-sm transition-opacity hover:opacity-95 sm:w-auto sm:shrink-0"
          >
            {toggleFormLabel}
          </button>
        </div>
      </header>

      {showForm && (
        <section
          className="mb-6 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] sm:p-6"
          aria-labelledby="users-create-heading"
        >
          <h2 id="users-create-heading" className="zenith-display mb-4 text-base font-semibold tracking-tight text-[color:var(--text-primary)] sm:text-lg">
            Create new user
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="users-new-email" className="block text-sm font-medium text-[color:var(--text-primary)]">
                Email *
              </label>
              <input
                id="users-new-email"
                ref={createFormFirstInputRef}
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="zenith-native-filter-input mt-1.5 block w-full rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="users-new-name" className="block text-sm font-medium text-[color:var(--text-primary)]">
                Name *
              </label>
              <input
                id="users-new-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="zenith-native-filter-input mt-1.5 block w-full rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="users-new-password" className="block text-sm font-medium text-[color:var(--text-primary)]">
                Password *
              </label>
              <input
                id="users-new-password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="zenith-native-filter-input mt-1.5 block w-full rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="users-new-role" className="block text-sm font-medium text-[color:var(--text-primary)]">
                Role *
              </label>
              <select
                id="users-new-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="zenith-native-select mt-1.5 block w-full rounded-xl px-3 py-2.5 text-sm"
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
                className="inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl bg-[color:var(--accent-teal)] px-5 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] shadow-md transition-opacity hover:opacity-95 disabled:opacity-45"
              >
                {createMutation.isPending ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="w-full min-w-0">
        {!users || users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--bg-card)] px-4 py-14 text-center shadow-[var(--shadow-card)] sm:py-16">
            <UsersGroupIcon className="mx-auto mb-3 h-10 w-10 text-[color:var(--accent-gold)]" strokeWidth={1.5} aria-hidden />
            <p className="text-sm font-medium text-[color:var(--text-primary)]">No users yet</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[color:var(--text-muted)]">
              {users === undefined ? 'Loading…' : 'Invite your team — tap New User to add the first account.'}
            </p>
            {users && users.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-6 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-5 py-2.5 text-sm font-semibold text-[color:var(--accent-gold)] transition-opacity hover:opacity-95"
              >
                New User
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Mobile-first: card list (full-width actions, document scroll only) */}
            <ul className="space-y-3 md:hidden" aria-label="User accounts">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]"
                >
                  <p className="zenith-display break-words text-base font-semibold tracking-tight text-[color:var(--text-primary)]">{u.name}</p>
                  <p className="mt-1 break-all text-sm leading-snug text-[color:var(--accent-teal)] [overflow-wrap:anywhere]">{u.email}</p>
                  <span className="mt-3 inline-flex w-fit max-w-full items-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
                    {u.role}
                  </span>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(u)}
                      disabled={resetPasswordMutation.isPending}
                      className="inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-teal)] transition-opacity hover:opacity-95 disabled:opacity-45"
                    >
                      {resetPasswordMutation.isPending ? 'Generating…' : 'Reset password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      className="inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-red)] transition-opacity hover:opacity-95"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* md+: table in horizontal scroll region */}
            <div className="hidden md:block">
              <p className="mb-2 hidden text-xs text-[color:var(--text-muted)] lg:block" role="note">
                Scroll horizontally if the table is wider than your window.
              </p>
              <div className={usersTableScrollShell} role="region" aria-label="User accounts table">
                <table className="w-full min-w-[52rem] table-fixed border-collapse text-sm leading-snug">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[36%]" />
                    <col className="min-w-[8.25rem] w-[14%]" />
                    <col className="w-[28%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)]">
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
                  <tbody className="divide-y divide-[color:var(--border-default)]">
                    {users.map((u) => (
                      <tr key={u.id} className="bg-[color:var(--bg-card)] transition-colors hover:bg-[color:var(--bg-table-hover)]">
                        <td className="min-w-0 px-2 py-2.5 align-middle sm:px-3 sm:py-3">
                          <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]" title={u.name}>
                            {u.name}
                          </p>
                        </td>
                        <td className="min-w-0 px-2 py-2.5 align-middle sm:px-3 sm:py-3">
                          <p className="truncate text-sm text-[color:var(--accent-teal)]" title={u.email}>
                            {u.email}
                          </p>
                        </td>
                        <td className="min-w-0 px-2 py-2.5 align-middle sm:px-3 sm:py-3">
                          <span className="inline-flex w-fit max-w-full items-center whitespace-nowrap rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                            {u.role}
                          </span>
                        </td>
                        <td className="min-w-0 px-2 py-2.5 align-middle sm:px-3 sm:py-3">
                          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                            <button
                              type="button"
                              onClick={() => handleResetPassword(u)}
                              disabled={resetPasswordMutation.isPending}
                              className="touch-manipulation text-sm font-semibold text-[color:var(--accent-teal)] transition-opacity hover:opacity-90 disabled:opacity-45"
                            >
                              {resetPasswordMutation.isPending ? 'Generating…' : 'Reset password'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              className="touch-manipulation text-sm font-semibold text-[color:var(--accent-red)] transition-opacity hover:opacity-90"
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
            </div>
          </>
        )}
      </div>

      <ErrorModal
        open={showDeleteConfirm && !!userToDelete}
        onClose={cancelDelete}
        type="warning"
        surface="zenith"
        message="User Details once deleted cannot be recovered. Are you sure to Proceed?"
        actions={[
          { label: 'Cancel', variant: 'ghost', onClick: cancelDelete },
          { label: 'YES', variant: 'primary', onClick: confirmDelete },
        ]}
      />

      <ErrorModal
        open={!!(resetPasswordModal.user && resetPasswordModal.resetLink)}
        onClose={closeResetModal}
        type="info"
        surface="zenith"
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

      <ErrorModal
        open={policyModal.open}
        onClose={closePolicyModal}
        type={policyModal.type}
        surface="zenith"
        message={policyModal.message}
        actions={[{ label: 'OK', variant: 'primary', onClick: closePolicyModal }]}
      />
    </>,
  )
}

export default Users
