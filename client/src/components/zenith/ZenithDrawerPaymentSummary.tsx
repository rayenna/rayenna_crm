import { Project, ProjectStatus, PaymentStatus } from '../../types'

function formatINR(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Same N/A bucket as Project Detail payment tracking (no order value or early / lost stage). */
export function zenithDrawerPaymentIsNa(project: Project): boolean {
  const projectCost = project.projectCost
  const hasNoOrderValue = !projectCost || Number(projectCost) <= 0
  const isEarlyOrLostStage =
    project.projectStatus === ProjectStatus.LEAD ||
    project.projectStatus === ProjectStatus.SITE_SURVEY ||
    project.projectStatus === ProjectStatus.PROPOSAL ||
    project.projectStatus === ProjectStatus.LOST
  return hasNoOrderValue || isEarlyOrLostStage
}

function paymentStatusLine(project: Project, isNaBucket: boolean): string {
  if (isNaBucket) return 'N/A'
  const s = project.paymentStatus
  if (s === PaymentStatus.PENDING) return 'Pending'
  if (s === PaymentStatus.PARTIAL) return 'Partial'
  if (s === PaymentStatus.FULLY_PAID) return 'Fully paid'
  return String(s || 'PENDING').replace(/_/g, ' ')
}

function statusValueClass(statusText: string, na: boolean): string {
  if (na) return 'text-white/50'
  if (statusText === 'Pending') return 'text-rose-300'
  if (statusText === 'Partial') return 'text-[#f5a623]'
  if (statusText === 'Fully paid') return 'text-emerald-400'
  return 'text-white/90'
}

/**
 * Dark Zenith quick-drawer payment summary (matches Finance drawer card rhythm).
 * Omit on Finance / Payment Radar drawer — that screen already includes this block.
 */
export default function ZenithDrawerPaymentSummary({ project }: { project: Project | null | undefined }) {
  if (!project) return null

  const na = zenithDrawerPaymentIsNa(project)
  const statusText = paymentStatusLine(project, na)

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 space-y-2.5">
      <div className="text-[11px] uppercase tracking-[0.08em] text-white/35">Payment</div>
      <div className="flex justify-between gap-3 text-[13px]">
        <span className="text-white/45 shrink-0">Payment status</span>
        <span className={`font-medium text-right ${statusValueClass(statusText, na)}`}>{statusText}</span>
      </div>
      <div className="flex justify-between gap-3 text-[13px]">
        <span className="text-white/45 shrink-0">Total amount received</span>
        <span className="text-white/90 font-medium tabular-nums text-right">
          {na ? 'N/A' : formatINR(project.totalAmountReceived)}
        </span>
      </div>
      <div className="flex justify-between gap-3 text-[13px]">
        <span className="text-white/45 shrink-0">Balance pending</span>
        <span
          className={`font-semibold tabular-nums text-right ${na ? 'text-white/50' : 'text-[#f5a623]'}`}
        >
          {na ? 'N/A' : formatINR(project.balanceAmount)}
        </span>
      </div>
    </div>
  )
}
