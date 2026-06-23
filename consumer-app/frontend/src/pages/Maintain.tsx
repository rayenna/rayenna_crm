import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Shield,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import {
  useCreateMaintenanceRequest,
  useMaintenanceSchedule,
  useWarranty,
} from '@/hooks/useConsumerMaintain'
import type { MaintenanceRequestType } from '@/types/maintain'

function healthBadgeClass(status: string) {
  if (status === 'CRITICAL') return 'bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]'
  if (status === 'WARNING') return 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
  return 'bg-[color:var(--accent-green-muted)] text-[color:var(--accent-green)]'
}

function RequestModal({
  open,
  type,
  onClose,
}: {
  open: boolean
  type: MaintenanceRequestType
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const mutation = useCreateMaintenanceRequest()

  if (!open) return null

  const isIssue = type === 'REPORT_ISSUE'
  const heading = isIssue ? 'Report an issue' : 'Schedule service'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await mutation.mutateAsync({
        requestType: type,
        title: title.trim(),
        description: description.trim() || undefined,
        preferredDate: preferredDate || undefined,
      })
      toast.success(isIssue ? 'Issue reported — we will contact you soon' : 'Service request submitted')
      setTitle('')
      setDescription('')
      setPreferredDate('')
      onClose()
    } catch {
      toast.error('Could not submit request. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--bg-overlay)] p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)] p-5 shadow-[var(--shadow-modal)]">
        <h2 className="zenith-display text-lg font-bold text-[color:var(--text-primary)]">{heading}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              Subject
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isIssue ? 'e.g. Inverter showing error code' : 'e.g. Annual panel cleaning'}
              className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              Details
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or service needed…"
              className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
            />
          </div>
          {!isIssue && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                Preferred date (optional)
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)]"
              />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[color:var(--border-default)] py-2.5 text-sm font-semibold text-[color:var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-[color:var(--accent-gold)] py-2.5 text-sm font-bold text-[color:var(--text-inverse)] disabled:opacity-60"
            >
              {mutation.isPending ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Maintain() {
  const warrantyQuery = useWarranty()
  const scheduleQuery = useMaintenanceSchedule()
  const [modalType, setModalType] = useState<MaintenanceRequestType | null>(null)

  const loading = warrantyQuery.isLoading || scheduleQuery.isLoading
  const health = warrantyQuery.data?.systemHealth
  const warrantyItems = warrantyQuery.data?.items ?? []
  const schedule = scheduleQuery.data ?? []

  return (
    <div className="px-4 py-6">
      <header className="mb-4">
        <h1 className="zenith-display text-2xl font-bold text-[color:var(--text-primary)]">
          Maintain
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          System health & warranty
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
        </div>
      ) : (
        <>
          {health && (
            <section className="zenith-glass relative mb-4 overflow-hidden rounded-2xl p-4">
              <span
                className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-xs font-bold ${healthBadgeClass(health.status)}`}
              >
                {health.label}
              </span>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--accent-green-muted)] text-[color:var(--accent-green)]">
                  <Shield className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <div className="pr-16">
                  <h2 className="text-sm font-bold text-[color:var(--text-primary)]">System Health</h2>
                  <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{health.message}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[color:var(--border-default)] pt-4 text-center">
                <div>
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">
                    {health.systemKw} kW
                  </p>
                  <p className="text-[10px] text-[color:var(--text-muted)]">System Size</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">
                    {health.panelCount}
                  </p>
                  <p className="text-[10px] text-[color:var(--text-muted)]">Panels</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">
                    {health.installedLabel ?? '—'}
                  </p>
                  <p className="text-[10px] text-[color:var(--text-muted)]">Installed</p>
                </div>
              </div>
            </section>
          )}

          <section className="mb-4">
            <h2 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">Warranty Status</h2>
            <div className="space-y-3">
              {warrantyItems.map((item) => (
                <div key={item.id} className="zenith-glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                        {item.name}
                      </p>
                      {item.specification && (
                        <p className="text-xs text-[color:var(--text-muted)]">{item.specification}</p>
                      )}
                    </div>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--accent-green)]" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-[color:var(--text-secondary)]">
                      {item.yearsRemaining} yr remaining
                    </span>
                    <span className="text-[color:var(--text-muted)]">
                      Expires{' '}
                      {new Date(item.expiryDate).toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--bg-badge)]">
                    <div
                      className="h-full rounded-full bg-[color:var(--accent-green)] transition-all"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <h2 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">
              Maintenance Schedule
            </h2>
            <div className="zenith-glass divide-y divide-[color:var(--border-default)] overflow-hidden rounded-2xl">
              {schedule.map((task) => {
                const isCompleted = task.status === 'COMPLETED'
                const isOverdue = task.status === 'OVERDUE'
                const Icon = isCompleted ? CheckCircle2 : isOverdue ? AlertTriangle : Clock
                const statusColor = isCompleted
                  ? 'text-[color:var(--accent-green)]'
                  : isOverdue
                    ? 'text-[color:var(--accent-red)]'
                    : 'text-[color:var(--accent-gold)]'

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${statusColor}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[color:var(--text-primary)]">
                        {task.title}
                      </p>
                      <p className={`text-xs ${statusColor}`}>{task.statusLabel}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                  </div>
                )
              })}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setModalType('SCHEDULE_SERVICE')}
              className="zenith-glass flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition hover:opacity-95"
            >
              <Wrench className="h-6 w-6 text-[color:var(--accent-gold)]" />
              <span className="text-xs font-bold text-[color:var(--text-primary)]">
                Schedule Service
              </span>
            </button>
            <button
              type="button"
              onClick={() => setModalType('REPORT_ISSUE')}
              className="zenith-glass flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition hover:opacity-95"
            >
              <TriangleAlert className="h-6 w-6 text-[color:var(--accent-red)]" />
              <span className="text-xs font-bold text-[color:var(--text-primary)]">
                Report Issue
              </span>
            </button>
          </div>
        </>
      )}

      <RequestModal
        open={modalType !== null}
        type={modalType ?? 'SCHEDULE_SERVICE'}
        onClose={() => setModalType(null)}
      />
    </div>
  )
}
