import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft, KeyRound, RefreshCw, ShieldOff, ShieldCheck, Trash2, Zap } from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import type { SolarHubPasswordResetResponse, SolarHubUser } from '../types/solarHub'
import HubHandoverScriptCard from '../components/solarHub/HubHandoverScriptCard'
import HubNotifyCard from '../components/solarHub/HubNotifyCard'
import HubSolisPlantCard from '../components/solarHub/HubSolisPlantCard'
import HubDeyePlantCard from '../components/solarHub/HubDeyePlantCard'
import HubCredentialsPanel from '../components/solarHub/HubCredentialsPanel'
import SolarHubListSkeleton from '../components/solarHub/SolarHubListSkeleton'
import {
  buildHubStaffCredentialsCopy,
  getSolarHubPublicUrl,
} from '../utils/hubHandoverScript'

export default function SolarHubUserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const isAdmin = hasRole([UserRole.ADMIN])
  const canManage = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])

  const [credentials, setCredentials] = useState<SolarHubPasswordResetResponse | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const now = new Date()
  const [energyYear, setEnergyYear] = useState(now.getFullYear())
  const [energyMonth, setEnergyMonth] = useState(now.getMonth() + 1)
  const [energyKwh, setEnergyKwh] = useState('')

  const { data: user, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['solar-hub-user', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/solar-hub/users/${id}`)
      return res.data as SolarHubUser
    },
    enabled: Boolean(id),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['solar-hub-user', id] })
    queryClient.invalidateQueries({ queryKey: ['solar-hub-users'] })
    queryClient.invalidateQueries({ queryKey: ['solar-hub-project'] })
  }

  const deactivateMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/api/admin/solar-hub/users/${id}/deactivate`),
    onSuccess: () => {
      toast.success('Account deactivated')
      invalidate()
      void refetch()
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const activateMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/api/admin/solar-hub/users/${id}/activate`),
    onSuccess: () => {
      toast.success('Account activated')
      invalidate()
      void refetch()
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const resyncMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/api/admin/solar-hub/users/${id}/resync`),
    onSuccess: () => {
      toast.success('Synced from Customer Master')
      invalidate()
      void refetch()
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (mode: 'default' | 'generated') =>
      axiosInstance.post(`/api/admin/solar-hub/users/${id}/reset-password`, { mode }),
    onSuccess: (res) => {
      setCredentials(res.data as SolarHubPasswordResetResponse)
      toast.success('Password reset — copy credentials below')
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => axiosInstance.delete(`/api/admin/solar-hub/users/${id}`),
    onSuccess: () => {
      toast.success('Solar Hub account deleted')
      navigate('/solar-hub/users')
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const energyMutation = useMutation({
    mutationFn: () =>
      axiosInstance.post('/api/consumer/energy', {
        consumerUserId: id,
        year: energyYear,
        month: energyMonth,
        totalGenerated: Number(energyKwh),
      }),
    onSuccess: () => {
      toast.success('Inverter kWh saved for Hub Track')
      setEnergyKwh('')
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const copyCredentials = async () => {
    if (!credentials) return
    const text = buildHubStaffCredentialsCopy({
      hubUrl: getSolarHubPublicUrl(),
      username: credentials.username,
      password: credentials.temporaryPassword,
    })
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy — select and copy manually')
    }
  }

  const downloadCredentialsPdf = async () => {
    if (!credentials || !id) return
    setPdfLoading(true)
    try {
      const res = await axiosInstance.post(
        `/api/admin/solar-hub/users/${id}/credentials-pdf`,
        { password: credentials.temporaryPassword },
        { responseType: 'blob' },
      )
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `solar-hub-${credentials.username}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error(getFriendlyApiErrorMessage(err))
    } finally {
      setPdfLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <SolarHubListSkeleton rows={4} variant="cards" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="mx-auto max-w-lg py-6 text-center">
        <p className="text-sm text-[color:var(--accent-red)]">{getFriendlyApiErrorMessage(error)}</p>
        <Link to="/solar-hub/users" className="mt-4 inline-block text-sm font-semibold text-[color:var(--accent-gold)]">
          Back to Solar Hub
        </Link>
      </div>
    )
  }

  const canDelete = isAdmin && user.project.projectStatus === 'LOST' && !user.isDemo

  return (
    <div className="mx-auto max-w-3xl pb-4">
      <Link
        to="/solar-hub/users"
        className="mb-4 inline-flex min-h-[44px] touch-manipulation items-center gap-1 text-sm font-semibold text-[color:var(--accent-gold)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="zenith-display text-2xl font-bold text-[color:var(--text-primary)]">@{user.username}</h1>
          {user.isDemo ? (
            <span className="rounded-full bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent-gold)]">
              DEMO
            </span>
          ) : null}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              user.isActive
                ? 'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                : 'bg-[color:var(--bg-muted)] text-[color:var(--text-muted)]'
            }`}
          >
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          {user.project.customerName} · Project #{user.project.slNo}
        </p>
      </header>

      {credentials ? (
        <HubCredentialsPanel
          credentials={credentials}
          onDismiss={() => setCredentials(null)}
          onCopy={() => void copyCredentials()}
          onDownloadPdf={isAdmin ? () => void downloadCredentialsPdf() : undefined}
          pdfLoading={pdfLoading}
          subtitle="Password reset — copy now; shown only once"
        />
      ) : null}

      <div className="mb-6">
        <HubHandoverScriptCard username={user.username} defaultOpen />
      </div>

      {canManage ? <HubNotifyCard userId={user.id} phone={user.phone} /> : null}

      <HubSolisPlantCard user={user} canManage={canManage} />
      <HubDeyePlantCard user={user} canManage={canManage} />

      <section className="mb-6 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Account</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[color:var(--text-muted)]">Phone</dt>
            <dd className="font-medium text-[color:var(--text-primary)]">{user.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--text-muted)]">Email</dt>
            <dd className="font-medium text-[color:var(--text-primary)]">{user.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--text-muted)]">Last login</dt>
            <dd className="font-medium text-[color:var(--text-primary)]">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-IN') : 'Never'}
            </dd>
          </div>
          <div>
            <dt className="text-[color:var(--text-muted)]">Member tier</dt>
            <dd className="font-medium text-[color:var(--text-primary)]">
              {user.memberTier ?? '—'} ({user.points ?? 0} pts)
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={`/projects/${user.project.id}`}
            className="rounded-lg border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent-teal)]"
          >
            Open project
          </Link>
        </div>
      </section>

      {canManage ? (
        <section className="mb-6 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[color:var(--accent-gold)]" />
            <h2 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Hub energy (inverter kWh)
            </h2>
          </div>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Log this month’s generation from the inverter or OEM app. Do not use the KSEB bill
            (export is not total generation). Savings in Hub are typical splits, not the bill.
          </p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(energyKwh)
              if (!Number.isFinite(n) || n < 0) {
                toast.error('Enter inverter kWh')
                return
              }
              energyMutation.mutate()
            }}
          >
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">
              Year
              <input
                type="number"
                min={2000}
                max={2100}
                value={energyYear}
                onChange={(e) => setEnergyYear(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">
              Month
              <input
                type="number"
                min={1}
                max={12}
                value={energyMonth}
                onChange={(e) => setEnergyMonth(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <label className="text-xs font-semibold text-[color:var(--text-muted)] sm:col-span-2">
              Generated kWh
              <input
                type="number"
                min={0}
                max={50000}
                step="1"
                value={energyKwh}
                onChange={(e) => setEnergyKwh(e.target.value)}
                placeholder="From inverter / ShinePhone"
                className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <button
              type="submit"
              disabled={energyMutation.isPending}
              className="rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)] disabled:opacity-50 sm:col-span-4"
            >
              {energyMutation.isPending ? 'Saving…' : 'Save generation'}
            </button>
          </form>
        </section>
      ) : null}

      {canManage ? (
        <section className="space-y-3 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Actions</h2>

          <button
            type="button"
            onClick={() => resyncMutation.mutate()}
            disabled={resyncMutation.isPending}
            className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--border-default)] px-4 py-3 text-left text-sm font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]"
          >
            <RefreshCw className="h-4 w-4 text-[color:var(--accent-teal)]" />
            Re-sync phone & email from Customer Master
          </button>

          {user.isActive ? (
            <button
              type="button"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending || user.isDemo}
              className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--border-default)] px-4 py-3 text-left text-sm font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)] disabled:opacity-50"
            >
              <ShieldOff className="h-4 w-4 text-[color:var(--accent-amber)]" />
              Deactivate account
            </button>
          ) : (
            <button
              type="button"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--border-default)] px-4 py-3 text-left text-sm font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]"
            >
              <ShieldCheck className="h-4 w-4 text-[color:var(--accent-teal)]" />
              Activate account
            </button>
          )}

          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => resetPasswordMutation.mutate('default')}
                disabled={resetPasswordMutation.isPending}
                className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--border-default)] px-4 py-3 text-left text-sm font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]"
              >
                <KeyRound className="h-4 w-4 text-[color:var(--accent-gold)]" />
                Reset password (initial / env password)
              </button>
              <button
                type="button"
                onClick={() => resetPasswordMutation.mutate('generated')}
                disabled={resetPasswordMutation.isPending}
                className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--border-default)] px-4 py-3 text-left text-sm font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]"
              >
                <KeyRound className="h-4 w-4 text-[color:var(--accent-gold)]" />
                Reset password (random)
              </button>
            </>
          ) : null}

          {canDelete ? (
            <>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--accent-red-border)] px-4 py-3 text-left text-sm font-semibold text-[color:var(--accent-red)]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete account permanently
                </button>
              ) : (
                <div className="rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-4">
                  <p className="text-sm text-[color:var(--text-primary)]">
                    Permanently delete this Hub account? This cannot be undone. Only allowed because project
                    status is LOST.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 rounded-lg border border-[color:var(--border-default)] py-2 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="flex-1 rounded-lg bg-[color:var(--accent-red)] py-2 text-sm font-bold text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : isAdmin && !user.isDemo ? (
            <p className="text-xs text-[color:var(--text-muted)]">
              Delete is only available when the linked project status is <strong>LOST</strong>.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
