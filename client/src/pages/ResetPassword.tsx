import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import toast from 'react-hot-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '../styles/zenith.css'

interface ResetPasswordForm {
  newPassword: string
  confirmPassword: string
}

const ResetPassword = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [showPassword, setShowPassword] = useState({
    new: false,
    confirm: false,
  })

  // Verify token on mount
  const { data: tokenData, isLoading: verifyingToken, error: tokenError } = useQuery({
    queryKey: ['verify-reset-token', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided')
      const res = await axiosInstance.get(`/api/auth/verify-reset-token/${token}`)
      return res.data
    },
    enabled: !!token,
    retry: false,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<ResetPasswordForm>()

  const newPassword = watch('newPassword')

  const mutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      return axiosInstance.post('/api/auth/reset-password', data)
    },
    onSuccess: () => {
      toast.success('Password reset successfully. Please login with your new password.')
      reset()
      navigate('/login')
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const onSubmit = (data: ResetPasswordForm) => {
    if (!token) {
      toast.error('Invalid reset token')
      return
    }

    if (data.newPassword !== data.confirmPassword) {
      toast.error('New password and confirm password do not match')
      return
    }

    mutation.mutate({
      token,
      newPassword: data.newPassword,
    })
  }

  const fieldCls =
    'w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 pr-10 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] shadow-inner transition-all focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)] sm:text-sm'

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link. Please request a new password reset.')
      navigate('/login')
    }
  }, [token, navigate])

  if (!token) {
    return null
  }

  if (verifyingToken) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-[color:var(--bg-page)] px-4 [-webkit-tap-highlight-color:transparent]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]" aria-hidden />
          <p className="mt-4 text-sm text-[color:var(--text-muted)]">Verifying reset token…</p>
        </div>
      </div>
    )
  }

  if (tokenError || !tokenData?.valid) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-[color:var(--bg-page)] px-4 py-8 [-webkit-tap-highlight-color:transparent]">
        <div className="mx-4 w-full max-w-md">
          <div className="rounded-2xl border border-[color:var(--border-card)] border-l-4 border-l-[color:var(--accent-red)] bg-[color:var(--bg-modal)]/95 p-6 shadow-[var(--shadow-modal)] ring-1 ring-[color:var(--border-default)]">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)]">
                <svg className="h-6 w-6 text-[color:var(--accent-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="zenith-display mb-2 text-xl font-bold text-[color:var(--text-primary)]">Invalid or Expired Token</h2>
              <p className="mb-6 text-sm text-[color:var(--text-secondary)]">
                This password reset link is invalid or has expired. Please contact your administrator to request a new reset link.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[color:var(--accent-gold)] px-6 py-2.5 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition-all hover:opacity-95"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-[color:var(--bg-page)] px-4 py-8 [-webkit-tap-highlight-color:transparent]"
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="zenith-display text-2xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-3xl">Reset Password</h1>
          <p className="mt-1 text-sm font-medium text-[color:var(--accent-gold)]">Set a new password for your account</p>
        </div>

        <div className="mt-2 rounded-2xl border border-[color:var(--border-card)] border-l-4 border-l-[color:var(--accent-gold)] bg-[color:var(--bg-modal)]/95 p-6 shadow-[var(--shadow-modal)] ring-1 ring-[color:var(--border-default)]">
          <div className="mb-4">
            <p className="text-center text-sm text-[color:var(--text-secondary)]">
              Reset password for: <span className="font-semibold text-[color:var(--text-primary)]">{tokenData.name}</span> ({tokenData.email})
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-sm font-semibold text-[color:var(--text-secondary)]">
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
                  className={fieldCls}
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-primary)]"
                >
                  {showPassword.new ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-xs text-[color:var(--accent-red)]">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold text-[color:var(--text-secondary)]">
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
                  className={fieldCls}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-primary)]"
                >
                  {showPassword.confirm ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-[color:var(--accent-red)]">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="min-h-[44px] flex-1 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--bg-card-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="min-h-[44px] flex-1 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
