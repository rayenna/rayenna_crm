import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useModalEscape } from '../contexts/ModalEscapeContext'
import { Lock, Eye, EyeOff } from 'lucide-react'

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const ChangePassword = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<ChangePasswordForm>()

  const newPassword = watch('newPassword')

  const handleCancel = useCallback(() => {
    navigate('/dashboard')
  }, [navigate])

  useModalEscape(true, handleCancel)

  const mutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return axiosInstance.post('/api/auth/change-password', data)
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
      reset()
      // Optionally navigate back or logout
      navigate('/dashboard')
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const onSubmit = (data: ChangePasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New password and confirm password do not match')
      return
    }

    mutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    })
  }

  return (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">
        <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
              <Lock className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">Change Password</h1>
              <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">Update your account password</p>
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-xl">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)]">
            <div className="h-1.5 bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-amber)] to-[color:var(--accent-teal)]" aria-hidden />
            <div className="p-4 sm:p-6">
              <div className="mb-5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                Change password for: <span className="font-semibold text-[color:var(--text-primary)]">{user?.name}</span>{' '}
                <span className="text-[color:var(--text-muted)]">({user?.email})</span>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-[color:var(--text-primary)]">
                Current Password *
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showPassword.current ? 'text' : 'password'}
                  {...register('currentPassword', {
                    required: 'Current password is required',
                  })}
                  className="zenith-native-filter-input w-full rounded-xl px-3 py-2.5 pr-11 text-sm"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  className="absolute right-3 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-secondary)] touch-manipulation -mr-2"
                  aria-label={showPassword.current ? 'Hide current password' : 'Show current password'}
                >
                  {showPassword.current ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-xs text-[color:var(--accent-red)]">{errors.currentPassword.message}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-[color:var(--text-primary)]">
                New Password *
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword.new ? 'text' : 'password'}
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  className="zenith-native-filter-input w-full rounded-xl px-3 py-2.5 pr-11 text-sm"
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                  className="absolute right-3 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-secondary)] touch-manipulation -mr-2"
                  aria-label={showPassword.new ? 'Hide new password' : 'Show new password'}
                >
                  {showPassword.new ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-xs text-[color:var(--accent-red)]">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[color:var(--text-primary)]">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword.confirm ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Please confirm your new password',
                    validate: (value) =>
                      value === newPassword || 'Passwords do not match',
                  })}
                  className="zenith-native-filter-input w-full rounded-xl px-3 py-2.5 pr-11 text-sm"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                  className="absolute right-3 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-secondary)] touch-manipulation -mr-2"
                  aria-label={showPassword.confirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showPassword.confirm ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-[color:var(--accent-red)]">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-[44px] flex-1 touch-manipulation rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 py-2.5 font-semibold text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--accent-gold-border)] hover:bg-[color:var(--bg-card-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="min-h-[44px] flex-1 touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 font-bold text-[color:var(--text-inverse)] shadow-lg transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ChangePassword
