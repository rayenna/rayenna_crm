import { useState, useEffect, type ReactNode } from 'react'
import { useModalEscape } from '../contexts/ModalEscapeContext'
// Payment Status: Shows N/A in red for projects without Order Value or in early/lost stages
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, UserRole, ProjectStatus } from '../types'
import { projectStatusStagePillClass } from '../components/zenith/zenithDealCardUi'
import RemarksSection from '../components/remarks/RemarksSection'
import SupportTicketsSection from '../components/supportTickets/SupportTicketsSection'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ProposalPreview from '../components/proposal/ProposalPreview'
import HealthDetail from '../components/zenith/HealthDetail'
import { getFinancingBankDisplayName } from '../utils/financingBankDisplay'
import { FaProjectDiagram } from 'react-icons/fa'
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react'
import { ErrorModal } from '@/components/common/ErrorModal'

/** Responsive label/value row: stacked on phones, two columns from sm (tablet+). */
function DetailRow({ label, children, valueClassName = '' }: { label: string; children: ReactNode; valueClassName?: string }) {
  return (
    <div className="grid grid-cols-1 gap-y-0.5 border-b border-[color:var(--border-default)] py-3.5 last:border-b-0 sm:grid-cols-[minmax(10rem,38%)_1fr] sm:gap-x-6 md:gap-x-8">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)] sm:pt-0.5">{label}</dt>
      <dd className={`min-w-0 break-words text-sm leading-snug text-[color:var(--text-primary)] ${valueClassName}`}>{children}</dd>
    </div>
  )
}

function InfoSection({
  title,
  icon,
  borderAccentClass,
  children,
}: {
  title: string
  icon: ReactNode
  borderAccentClass: string
  children: ReactNode
}) {
  return (
    <section
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] ${borderAccentClass}`}
    >
      <div className="flex shrink-0 items-center gap-2.5 border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)] px-4 py-3.5 sm:px-6 sm:py-4">
        <span className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--zenith-table-header-fg)]">{title}</h2>
      </div>
      <div className="min-h-0 flex-1 px-4 pb-4 pt-1 sm:px-6 sm:pb-5">{children}</div>
    </section>
  )
}

const ProjectDetail = () => {
  const shell = (children: ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  const { id } = useParams()
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showProposal, setShowProposal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useModalEscape(showDeleteConfirm, () => setShowDeleteConfirm(false))

  // Escape on read-only detail → Projects list. Overlays (proposal preview, delete confirm, ErrorModal children) register Esc first via capture-phase modal stack.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showDeleteConfirm || showProposal) return
      e.preventDefault()
      navigate('/projects')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, showDeleteConfirm, showProposal])

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/projects/${id}`)
      return res.data as Project
    },
    retry: 1,
  })

  // Lightweight Proposal Engine summary for this project (status + last updated)
  const { data: peSummary } = useQuery({
    queryKey: ['proposal-engine-summary', id],
    enabled: !!id && !!project && (project.projectStatus === ProjectStatus.PROPOSAL || project.projectStatus === ProjectStatus.CONFIRMED),
    queryFn: async () => {
      try {
        const res = await axiosInstance.get(`/api/proposal-engine/projects/${id}`)
        const data = res.data as any
        const artifacts = data?.artifacts ?? {}

        const timestamps: string[] = []
        if (artifacts.costing?.savedAt) timestamps.push(artifacts.costing.savedAt)
        if (artifacts.bom?.savedAt) timestamps.push(artifacts.bom.savedAt)
        if (artifacts.roi?.savedAt) timestamps.push(artifacts.roi.savedAt)
        if (artifacts.proposal?.generatedAt) timestamps.push(artifacts.proposal.generatedAt)

        let lastUpdated: string | undefined
        if (timestamps.length) {
          const msValues = timestamps
            .map((t) => {
              const ms = Date.parse(t)
              return Number.isFinite(ms) ? ms : 0
            })
            .filter((ms) => ms > 0)
          if (msValues.length) {
            lastUpdated = new Date(Math.max(...msValues)).toISOString()
          }
        }

        const hasCosting  = !!artifacts.costing
        const hasBom      = !!artifacts.bom
        const hasRoi      = !!artifacts.roi
        const hasProposal = !!artifacts.proposal

        const hasAnyArtifact = hasCosting || hasBom || hasRoi || hasProposal

        const allFour = hasCosting && hasBom && hasRoi && hasProposal

        const peStatus: 'none' | 'draft' | 'proposal-ready' =
          allFour
            ? 'proposal-ready'
            : hasAnyArtifact
            ? 'draft'
            : 'none'

        return { peStatus, lastUpdated }
      } catch (err: any) {
        // If user has no access or project isn't in Proposal Engine yet, treat as "none"
        if (import.meta.env.DEV) {
          console.warn('Unable to load Proposal Engine summary for project', id, err)
        }
        return { peStatus: 'none' as const, lastUpdated: undefined as string | undefined }
      }
    },
    staleTime: 60_000,
  })

  // Projects in Lost status cannot be edited (only Admin can delete)
  const isLost = project?.projectStatus === ProjectStatus.LOST
  const canEdit = !isLost && (hasRole([UserRole.ADMIN]) || 
    (hasRole([UserRole.SALES]) && project?.salespersonId === user?.id) ||
    hasRole([UserRole.OPERATIONS, UserRole.FINANCE]))
  const canDelete = hasRole([UserRole.ADMIN])

  // Fetch support tickets count for delete confirmation
  const { data: supportTickets } = useQuery({
    queryKey: ['supportTickets', 'project', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/support-tickets/project/${id}`)
      return res.data
    },
    enabled: !!id && canDelete, // Only fetch if admin and project ID exists
    retry: 1,
  })

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.delete(`/api/projects/${id}`)
      return res.data
    },
    onSuccess: (data) => {
      toast.success('Project deleted successfully')
      if (data.deleted?.supportTickets?.count > 0) {
        toast.success(`Project and ${data.deleted.supportTickets.count} support ticket(s) deleted`)
      }
      // Invalidate projects list and dashboard so tiles/charts stay in sync
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/projects')
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  if (isLoading) {
    return shell(
      <div className="py-16 text-center text-[color:var(--text-secondary)]">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]" />
        <p className="text-sm">Loading project details…</p>
      </div>
    )
  }
  if (error) {
    return shell(
      <div className="rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-6 text-center text-sm text-[color:var(--text-primary)]">
        Error loading project: {(error as any).response?.data?.error || (error as any).message}
      </div>
    )
  }
  if (!project) {
    return shell(
      <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-6 text-center text-sm text-[color:var(--text-secondary)] shadow-[var(--shadow-card)]">
        Project not found
      </div>
    )
  }

  // Segment pill classes (match Projects list)
  const getSegmentPillClasses = (type: string): string => {
    switch (type) {
      case 'RESIDENTIAL_SUBSIDY':
        return 'border border-[color:var(--accent-red-border)] bg-[color:color-mix(in srgb,var(--accent-red) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
      case 'RESIDENTIAL_NON_SUBSIDY':
        return 'border border-[color:var(--accent-blue-border)] bg-[color:color-mix(in srgb,var(--accent-blue) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
      case 'COMMERCIAL_INDUSTRIAL':
        return 'border border-emerald-400/35 bg-[color:color-mix(in srgb,var(--accent-green) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
      default:
        return 'border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)]'
    }
  }

  return (
    <>
      <ErrorModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        type="warning"
        surface="zenith"
        message={`Once deleted, this project${
          supportTickets && Array.isArray(supportTickets) && supportTickets.length > 0
            ? ` and ${supportTickets.length} support ticket(s)`
            : ''
        } cannot be recovered.\n\nAre you sure you want to proceed?`}
        actions={[
          { label: 'Cancel', variant: 'ghost', onClick: () => setShowDeleteConfirm(false) },
          {
            label: 'YES',
            variant: 'primary',
            onClick: () => {
              deleteMutation.mutate()
              setShowDeleteConfirm(false)
            },
          },
        ]}
      />
      {showProposal && id && (
        <ProposalPreview projectId={id} onClose={() => setShowProposal(false)} />
      )}
      {shell(
        <>
          {/* ── Sticky Zenith header ── */}
          <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              {/* Icon + title */}
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
                  <FaProjectDiagram className="h-5 w-5 text-[color:var(--accent-gold)]" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="zenith-display truncate text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
                    Project #{project.slNo}
                  </h1>
                  <p className="mt-0.5 truncate text-sm text-[color:var(--text-secondary)]">
                    {project.customer?.customerName || 'Unknown Customer'}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 sm:items-center">
                {(hasRole([UserRole.SALES]) || hasRole([UserRole.OPERATIONS]) || hasRole([UserRole.MANAGEMENT]) || hasRole([UserRole.FINANCE]) || hasRole([UserRole.ADMIN])) &&
                  (project.projectStatus === ProjectStatus.PROPOSAL || project.projectStatus === ProjectStatus.CONFIRMED) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const base = import.meta.env.VITE_PROPOSAL_ENGINE_URL
                        if (!base) { toast.error('Proposal Engine URL is not configured.'); return }
                        const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
                        try {
                          const { data } = await axiosInstance.post<{ ticket: string }>('/api/auth/sso-ticket')
                          const ticket = data?.ticket
                          const url = ticket
                            ? `${normalizedBase}/customers?ticket=${encodeURIComponent(ticket)}&openProjectId=${encodeURIComponent(id ?? '')}`
                            : `${normalizedBase}/customers?openProjectId=${encodeURIComponent(id ?? '')}`
                          window.open(url, '_blank', 'noopener,noreferrer')
                          if (id) void axiosInstance.post('/api/proposal-engine/audit/proposal-click', { projectId: id }).catch(() => {})
                        } catch (err: any) {
                          toast.error(getFriendlyApiErrorMessage(err) || 'Could not open Proposal Engine.')
                          window.open(`${normalizedBase}/customers?openProjectId=${encodeURIComponent(id ?? '')}`, '_blank', 'noopener,noreferrer')
                          if (id) void axiosInstance.post('/api/proposal-engine/audit/proposal-click', { projectId: id }).catch(() => {})
                        }
                      }}
                      className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition-colors hover:opacity-95"
                    >
                      <span className="truncate">Proposals</span>
                      <span className="shrink-0 rounded bg-amber-300 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">New</span>
                    </button>
                  )}
                {canEdit && (
                  <Link
                    to={`/projects/${id}/edit`}
                    className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color:var(--bg-card-hover)]"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden />
                    Edit
                  </Link>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-4 py-2.5 text-sm font-bold text-[color:var(--accent-red)] transition-colors hover:opacity-95"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color:var(--bg-card-hover)]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back
                </button>
              </div>
            </div>
          </header>

          {/* ── Summary card: created date, status pills, financials, PE badge ── */}
          <div className="mb-5 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Created {format(new Date(project.createdAt), 'MMM dd, yyyy')}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${projectStatusStagePillClass(project.projectStatus)}`}>
                    {project.projectStatus.replace(/_/g, ' ')}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${getSegmentPillClasses(project.type)}`}>
                    {project.type.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end sm:gap-4">
                <div className="flex flex-wrap gap-5 sm:gap-8 sm:justify-end">
                  {project.projectCost != null && project.projectCost > 0 && (
                    <div className="sm:text-right">
                      <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">Order Value</p>
                      <p className="text-sm font-bold text-[color:var(--accent-teal)]">₹{project.projectCost.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {project.totalProjectCost != null && project.totalProjectCost > 0 && (
                    <div className="sm:text-right">
                      <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">Total Cost</p>
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">₹{project.totalProjectCost.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  {project.grossProfit != null && project.grossProfit !== undefined && (
                    <div className="sm:text-right">
                      <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">Gross Profit</p>
                      <p className={`text-sm font-semibold ${project.grossProfit >= 0 ? 'text-[color:var(--accent-teal)]' : 'text-[color:var(--accent-red)]'}`}>
                        ₹{project.grossProfit.toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>
                {(project.projectStatus === ProjectStatus.PROPOSAL || project.projectStatus === ProjectStatus.CONFIRMED) && (
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] px-3 py-2 shadow-inner">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--accent-gold)]">Proposal Engine</span>
                    {peSummary?.peStatus === 'proposal-ready' && (
                      <span className="inline-flex items-center rounded-md border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent-teal)]">
                        PE Ready
                      </span>
                    )}
                    {peSummary?.peStatus === 'draft' && (
                      <span className="inline-flex items-center rounded-md border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--text-primary)]">
                        PE Draft
                      </span>
                    )}
                    {(!peSummary || peSummary.peStatus === 'none') && (
                      <span className="inline-flex items-center rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--text-secondary)]">
                        Not Yet Created
                      </span>
                    )}
                    {peSummary?.lastUpdated && (
                      <span className="text-[10px] text-[color:var(--text-muted)]">
                        Last updated {format(new Date(peSummary.lastUpdated), 'MMM dd, yyyy HH:mm')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[min(100%,88rem)] space-y-5 sm:space-y-6 md:space-y-7">

      {/* Info cards: equal-height columns on tablet/desktop */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:items-stretch">
        <InfoSection
          title="Customer Details"
          borderAccentClass="border-l-4 border-l-[color:var(--accent-teal)]"
          icon={<svg className="text-[color:var(--accent-teal)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
        >
          {project.customer ? (
            <dl>
              <DetailRow label="Customer ID" valueClassName="font-semibold">
                {project.customer.customerId}
              </DetailRow>
              <DetailRow label="Customer Name" valueClassName="text-base font-semibold sm:text-lg">
                {project.customer.customerName}
              </DetailRow>
              {(project.customer.addressLine1 || project.customer.city) && (
                <DetailRow label="Address" valueClassName="font-medium leading-relaxed text-[color:var(--text-primary)]">
                  {[
                    project.customer.addressLine1,
                    project.customer.addressLine2,
                    project.customer.city,
                    project.customer.state,
                    project.customer.pinCode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </DetailRow>
              )}
              {project.customer.contactNumbers && (
                <DetailRow label="Contact Numbers" valueClassName="font-medium">
                  {(() => {
                    try {
                      const parsed = JSON.parse(project.customer.contactNumbers || '')
                      return Array.isArray(parsed) ? parsed.join(', ') : project.customer.contactNumbers
                    } catch {
                      return project.customer.contactNumbers
                    }
                  })()}
                </DetailRow>
              )}
              {project.customer.consumerNumber && (
                <DetailRow label="Consumer Number" valueClassName="font-medium">
                  {project.customer.consumerNumber}
                </DetailRow>
              )}
              {project.leadSource && (
                <DetailRow label="Lead Source" valueClassName="font-medium">
                  <>
                    {project.leadSource === 'WEBSITE' && 'Website'}
                    {project.leadSource === 'REFERRAL' && 'Referral'}
                    {project.leadSource === 'GOOGLE' && 'Google'}
                    {project.leadSource === 'CHANNEL_PARTNER' && 'Channel Partner'}
                    {project.leadSource === 'DIGITAL_MARKETING' && 'Digital Marketing'}
                    {project.leadSource === 'SALES' && 'Sales'}
                    {project.leadSource === 'MANAGEMENT_CONNECT' && 'Management Connect'}
                    {project.leadSource === 'OTHER' && 'Other'}
                    {project.leadSourceDetails && (
                      <span className="mt-1 block text-[color:var(--text-muted)] sm:mt-0 sm:inline sm:pl-1">
                        (
                        {project.leadSource === 'CHANNEL_PARTNER' && project.leadSourceDetails}
                        {project.leadSource === 'REFERRAL' && project.leadSourceDetails}
                        {project.leadSource === 'OTHER' && project.leadSourceDetails})
                      </span>
                    )}
                  </>
                </DetailRow>
              )}
            </dl>
          ) : (
            <p className="py-2 text-sm text-[color:var(--text-muted)]">Customer information not available</p>
          )}
        </InfoSection>

        <InfoSection
          title="Project Details"
          borderAccentClass="border-l-4 border-l-[color:var(--accent-blue)]"
          icon={<svg className="text-[color:var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        >
          <dl>
            <DetailRow label="Segment" valueClassName="font-medium">
              {project.type.replace(/_/g, ' ')}
            </DetailRow>
            <DetailRow label="Project Type" valueClassName="font-medium">
              {(() => {
                const typeMap: Record<string, string> = {
                  EPC_PROJECT: 'EPC Project',
                  PANEL_CLEANING: 'Panel Cleaning',
                  MAINTENANCE: 'Maintenance',
                  REPAIR: 'Repair',
                  CONSULTING: 'Consulting',
                  RESALE: 'Resale',
                  OTHER_SERVICES: 'Other Services',
                }
                return typeMap[project.projectServiceType] || project.projectServiceType.replace(/_/g, ' ')
              })()}
            </DetailRow>
            {project.salesperson && (
              <DetailRow label="Salesperson" valueClassName="font-medium">
                {project.salesperson.name}
              </DetailRow>
            )}
          </dl>
        </InfoSection>

        <InfoSection
          title="Sales & Commercial"
          borderAccentClass="border-l-4 border-l-[color:var(--accent-green)]"
          icon={<svg className="text-[color:var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        >
          <dl>
            {project.systemCapacity != null && project.systemCapacity !== undefined && (
              <DetailRow label="System Capacity" valueClassName="font-bold text-[color:var(--accent-gold)]">
                {project.systemCapacity} kW
              </DetailRow>
            )}
            {project.roofType && (
              <DetailRow label="Roof Type" valueClassName="font-medium">
                {project.roofType}
              </DetailRow>
            )}
            {!!project.projectCost && (
              <DetailRow label="Order Value" valueClassName="font-bold text-[color:var(--accent-teal)]">
                ₹{project.projectCost.toLocaleString('en-IN')}
              </DetailRow>
            )}
            {project.confirmationDate && (
              <DetailRow label="Confirmation Date" valueClassName="font-medium">
                {format(new Date(project.confirmationDate), 'MMM dd, yyyy')}
              </DetailRow>
            )}
            <DetailRow label="Gross Profit" valueClassName="font-semibold">
              <span
                className={
                  project.grossProfit !== null && project.grossProfit !== undefined
                    ? project.grossProfit >= 0
                      ? 'text-[color:var(--accent-teal)]'
                      : 'text-[color:var(--accent-red)]'
                    : 'font-medium text-[color:var(--text-muted)]'
                }
              >
                {project.grossProfit !== null && project.grossProfit !== undefined
                  ? `₹${project.grossProfit.toLocaleString('en-IN')}`
                  : 'Not calculated'}
              </span>
            </DetailRow>
            <DetailRow label="Availing Loan / Financing?" valueClassName="font-medium">
              {project.availingLoan === true ? 'Yes' : project.availingLoan === false ? 'No' : 'Not captured'}
            </DetailRow>
            {project.availingLoan && (project.financingBank || project.financingBankOther) && (
              <DetailRow label="Financing Bank" valueClassName="font-medium">
                {getFinancingBankDisplayName(project.financingBank, project.financingBankOther) ?? '—'}
              </DetailRow>
            )}
            <DetailRow label="Profitability" valueClassName="font-semibold">
              <span
                className={
                  project.profitability !== null && project.profitability !== undefined
                    ? project.profitability > 10
                      ? 'text-[color:var(--accent-teal)]'
                      : project.profitability > 0
                        ? 'text-[color:var(--accent-gold)]'
                        : 'text-[color:var(--accent-red)]'
                    : 'font-medium text-[color:var(--text-muted)]'
                }
              >
                {project.profitability !== null && project.profitability !== undefined
                  ? `${project.profitability.toFixed(2)}%`
                  : 'Not calculated'}
              </span>
            </DetailRow>
            {project.finalProfit != null && project.finalProfit !== undefined && !!project.finalProfit && (
              <DetailRow label="Final Profit" valueClassName="font-semibold text-[color:var(--accent-teal)]">
                ₹{project.finalProfit.toLocaleString('en-IN')}
              </DetailRow>
            )}
          </dl>
        </InfoSection>

        <InfoSection
          title="Project Lifecycle"
          borderAccentClass="border-l-4 border-l-[color:var(--accent-purple)]"
          icon={<svg className="text-[color:var(--accent-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
        >
          <dl>
            <DetailRow label="Project Stage" valueClassName="font-medium">
              <span className="inline-flex items-center rounded-md border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2.5 py-0.5 text-xs font-semibold text-[color:var(--accent-gold)]">
                {(() => {
                  const stageMap: Record<string, string> = {
                    LEAD: 'Lead',
                    SITE_SURVEY: 'Site Survey',
                    PROPOSAL: 'Proposal',
                    CONFIRMED: 'Confirmed Order',
                    UNDER_INSTALLATION: 'Installation',
                    COMPLETED: 'Completed',
                    COMPLETED_SUBSIDY_CREDITED: 'Completed - Subsidy Credited',
                  }
                  return stageMap[project.projectStatus] || project.projectStatus.replace(/_/g, ' ')
                })()}
              </span>
            </DetailRow>
            {project.mnrePortalRegistrationDate && (
              <DetailRow label="MNRE Portal Registration" valueClassName="font-medium">
                {format(new Date(project.mnrePortalRegistrationDate), 'MMM dd, yyyy')}
              </DetailRow>
            )}
            {project.feasibilityDate && (
              <DetailRow label="Feasibility Date (DISCOM)" valueClassName="font-medium">
                {format(new Date(project.feasibilityDate), 'MMM dd, yyyy')}
              </DetailRow>
            )}
            {project.registrationDate && (
              <DetailRow label="Registration Date (DISCOM)" valueClassName="font-medium">
                {format(new Date(project.registrationDate), 'MMM dd, yyyy')}
              </DetailRow>
            )}
            {project.installationCompletionDate && (
              <DetailRow label="Installation Completion" valueClassName="font-medium">
                {format(new Date(project.installationCompletionDate), 'MMM dd, yyyy')}
              </DetailRow>
            )}
            {project.completionReportSubmissionDate && (
              <DetailRow label="Completion Report Submission" valueClassName="font-medium">
                {format(new Date(project.completionReportSubmissionDate), 'MMM dd, yyyy')}
              </DetailRow>
            )}
            {project.mnreInstallationDetails && (
              <DetailRow label="MNRE Installation Details" valueClassName="whitespace-pre-line font-medium">
                {project.mnreInstallationDetails}
              </DetailRow>
            )}
            {project.subsidyRequestDate && (
              <DetailRow label="Net Meter Installation Date" valueClassName="font-medium">
                {format(new Date(project.subsidyRequestDate), 'MMM dd, yyyy')}
              </DetailRow>
            )}
            {project.subsidyCreditedDate && (
              <DetailRow label="Subsidy Credited Date" valueClassName="font-semibold text-amber-700">
                {format(new Date(project.subsidyCreditedDate), 'MMM dd, yyyy')}
              </DetailRow>
            )}
            {!!project.totalProjectCost && (
              <DetailRow label="Total Project Cost" valueClassName="font-semibold">
                ₹{project.totalProjectCost.toLocaleString('en-IN')}
              </DetailRow>
            )}
            {project.panelBrand && (
              <DetailRow label="Panel Brand" valueClassName="font-medium">
                {project.panelBrand}
              </DetailRow>
            )}
            {project.inverterBrand && (
              <DetailRow label="Inverter Brand" valueClassName="font-medium">
                {project.inverterBrand}
              </DetailRow>
            )}
            {project.inverterCapacityKw != null && (
              <DetailRow label="Inverter Capacity (kW)" valueClassName="font-medium">
                {project.inverterCapacityKw} kW
              </DetailRow>
            )}
            {project.panelType && (
              <DetailRow label="Panel Type" valueClassName="font-medium">
                {project.panelType}
              </DetailRow>
            )}
            {project.panelCapacityW != null && (
              <DetailRow label="Panel Capacity (W)" valueClassName="font-medium">
                {project.panelCapacityW} W
              </DetailRow>
            )}
            {project.projectStatus === ProjectStatus.LOST && (
              <>
                {project.lostDate && (
                  <DetailRow label="Lost Date" valueClassName="font-semibold text-[color:var(--accent-red)]">
                    {format(new Date(project.lostDate), 'MMM dd, yyyy')}
                  </DetailRow>
                )}
                {project.lostReason && (
                  <DetailRow label="Reason for Loss" valueClassName="font-medium">
                    {(() => {
                      const reasonMap: Record<string, string> = {
                        LOST_TO_COMPETITION: 'Lost to Competition',
                        NO_BUDGET: 'No Budget',
                        INDEFINITELY_DELAYED: 'Indefinitely Delayed',
                        OTHER: 'Other',
                      }
                      return reasonMap[project.lostReason!] || project.lostReason
                    })()}
                  </DetailRow>
                )}
                {project.lostReason === 'LOST_TO_COMPETITION' && project.lostToCompetitionReason && (
                  <DetailRow label="Why lost to competition" valueClassName="font-medium">
                    {(() => {
                      const compReasonMap: Record<string, string> = {
                        LOST_DUE_TO_PRICE: 'Lost due to Price',
                        LOST_DUE_TO_FEATURES: 'Lost due to Features',
                        LOST_DUE_TO_RELATIONSHIP_OTHER: 'Lost due to Relationship/Other factors',
                      }
                      return compReasonMap[project.lostToCompetitionReason!] || project.lostToCompetitionReason
                    })()}
                  </DetailRow>
                )}
                {project.lostOtherReason && (
                  <DetailRow label="Other Reason Details" valueClassName="font-medium">
                    {project.lostOtherReason}
                  </DetailRow>
                )}
              </>
            )}
          </dl>
          {project.projectStatus === ProjectStatus.LOST && isLost && (
            <div className="mt-4 rounded-lg border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-3">
              <p className="text-sm text-[color:var(--accent-red)]">
                <strong>Note:</strong> This project is in Lost stage and cannot be edited. Only Admin can delete it.
              </p>
            </div>
          )}
        </InfoSection>

      </div>

      {/* Deal Health + Payment + Remarks: stack on phone; 3 columns on large desktop */}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:items-stretch xl:grid-cols-3 xl:gap-6">
        <HealthDetail project={project} />

        <InfoSection
          title="Payment Tracking"
          borderAccentClass="border-l-4 border-l-[color:var(--accent-teal)]"
          icon={<svg className="text-[color:var(--accent-teal)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
        >
          <dl>
            <DetailRow label="Payment Status" valueClassName="font-medium">
              {(() => {
                const projectCost = project?.projectCost
                const hasNoOrderValue =
                  !projectCost ||
                  projectCost === 0 ||
                  projectCost === null ||
                  projectCost === undefined ||
                  Number(projectCost) <= 0

                const currentStatus = project?.projectStatus
                const isEarlyOrLostStage =
                  currentStatus === ProjectStatus.LEAD ||
                  currentStatus === ProjectStatus.SITE_SURVEY ||
                  currentStatus === ProjectStatus.PROPOSAL ||
                  currentStatus === ProjectStatus.LOST

                if (hasNoOrderValue || isEarlyOrLostStage) {
                  return (
                    <span className="inline-flex items-center rounded-md border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-2.5 py-0.5 text-xs font-semibold text-[color:var(--accent-red)]">
                      N/A
                    </span>
                  )
                }

                const paymentStatus = project?.paymentStatus || 'PENDING'
                return (
                  <span
                    className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                      paymentStatus === 'FULLY_PAID'
                        ? 'border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                        : paymentStatus === 'PARTIAL'
                          ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                          : 'border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]'
                    }`}
                  >
                    {String(paymentStatus).replace(/_/g, ' ')}
                  </span>
                )
              })()}
            </DetailRow>
            {project.projectCost &&
              (() => {
                const totalReceived =
                  (Number(project.advanceReceived) || 0) +
                  (Number(project.payment1) || 0) +
                  (Number(project.payment2) || 0) +
                  (Number(project.payment3) || 0) +
                  (Number(project.lastPayment) || 0)
                const balance = Math.max(0, Number(project.projectCost) - totalReceived)
                return (
                  <>
                    <DetailRow label="Total Amount Received" valueClassName="font-semibold text-[color:var(--accent-teal)]">
                      ₹{totalReceived.toLocaleString('en-IN')}
                    </DetailRow>
                    <DetailRow label="Balance Amount" valueClassName="font-semibold text-[color:var(--accent-red)]">
                      ₹{balance.toLocaleString('en-IN')}
                    </DetailRow>
                  </>
                )
              })()}
            {!!project.advanceReceived && (
              <DetailRow label="Advance Received" valueClassName="font-medium">
                ₹{project.advanceReceived.toLocaleString('en-IN')}
                {project.advanceReceivedDate && (
                  <span className="mt-0.5 block text-xs font-normal text-[color:var(--text-muted)] sm:inline sm:mt-0 sm:pl-1">
                    ({format(new Date(project.advanceReceivedDate), 'MMM dd, yyyy')})
                  </span>
                )}
              </DetailRow>
            )}

            {(() => {
              const installments = [
                { label: 'Payment 1', amount: project.payment1, date: project.payment1Date },
                { label: 'Payment 2', amount: project.payment2, date: project.payment2Date },
                { label: 'Payment 3', amount: project.payment3, date: project.payment3Date },
                { label: 'Last Payment', amount: project.lastPayment, date: project.lastPaymentDate },
              ].filter((p) => {
                const hasAmount = p.amount != null && Number(p.amount) > 0
                const hasDate = !!p.date
                return hasAmount || hasDate
              })

              if (!installments.length) return null

              return (
                <DetailRow label="Installments Received" valueClassName="block max-w-full p-0 font-normal">
                  <ul className="mt-1 list-none space-y-2 pl-0 sm:mt-0">
                    {installments.map((p) => {
                      const hasAmount = p.amount != null && Number(p.amount) > 0
                      return (
                        <li
                          key={p.label}
                          className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2.5"
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                            {p.label}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[color:var(--text-primary)]">
                            {hasAmount ? `₹${Number(p.amount).toLocaleString('en-IN')}` : '—'}
                            {p.date && (
                              <span className="mt-0.5 block text-xs font-normal text-[color:var(--text-muted)]">
                                {format(new Date(p.date), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </DetailRow>
              )
            })()}
          </dl>
        </InfoSection>

        <div className="min-h-0 min-w-0 md:col-span-2 xl:col-span-1">
          <RemarksSection
            projectId={project.id}
            isEditMode={false}
            className="!mt-0 flex h-full min-h-0 flex-col"
          />
        </div>
      </div>

      {/* Support / Service Tickets */}
      <div className="mt-5 sm:mt-6">
        <SupportTicketsSection projectId={project.id} projectStatus={project.projectStatus} />
      </div>

      {/* Key Artifacts - View Only */}
      <InfoSection
        title="Key Artifacts"
        borderAccentClass="border-l-4 border-l-[color:var(--accent-blue)]"
        icon={<svg className="text-[color:var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
      >
        <p className="mb-4 text-sm text-[color:var(--text-secondary)]">
          To upload new artifacts, use the <strong className="text-[color:var(--accent-gold)]">Edit</strong> button above.
        </p>

        {/* Documents List - View Only */}
        {project.documents && project.documents.length > 0 && (
          <div>
            <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-[color:var(--text-primary)]">Uploaded Documents</h3>
            <div className="overflow-x-auto rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)]">
                    <th className="w-16 border-l-4 border-l-[color:var(--accent-blue)] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--zenith-table-header-fg)]">Sl No.</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--zenith-table-header-fg)]">File Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--zenith-table-header-fg)]">Description</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[color:var(--zenith-table-header-fg)]">View/Download</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[color:var(--zenith-table-header-fg)]">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border-default)]">
              {project.documents.map((doc, index) => {
                // Admin can delete any document
                // Uploader can delete their own documents (except Proposal PDFs which only admin can delete)
                const isProposalPDF = doc.description === 'AI Generated Proposal PDF'
                const isAdmin = hasRole([UserRole.ADMIN])
                const isManagement = hasRole([UserRole.MANAGEMENT])
                const isSales = hasRole([UserRole.SALES])
                const isOperations = hasRole([UserRole.OPERATIONS])
                const isFinance = hasRole([UserRole.FINANCE])
                const isUploader = doc.uploadedById === user?.id
                // Sales users can only view/download documents from their own projects
                const salesHasProjectAccess = isSales && project.salespersonId === user?.id
                const canDelete = isAdmin || (isUploader && !isProposalPDF)
                // View/Download: Admin, Management, Operations, Finance, or Sales (only their projects), or uploader
                const canView = isAdmin || isManagement || isOperations || isFinance || salesHasProjectAccess || isUploader

                return (
                  <tr key={doc.id} className="group transition-colors odd:bg-[color:var(--bg-table-alt)] even:bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-table-hover)]">
                    <td className="px-3 py-2 align-middle text-[color:var(--text-secondary)]">{index + 1}</td>
                    <td className="px-3 py-2 align-middle">
                      <div className="max-w-xs truncate font-medium text-[color:var(--text-primary)]">
                        {doc.fileName}
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        {doc.category === 'photos_videos' ? 'Photos / Videos' :
                         doc.category === 'documents' ? 'Documents' :
                         doc.category === 'sheets' ? 'Sheets' : doc.category}
                        {doc.uploadedBy && <> • Uploaded by {doc.uploadedBy.name}</>}
                      </div>
                    </td>
                    <td className="max-w-xs px-3 py-2 align-middle text-[color:var(--text-secondary)]">
                      <span className="block truncate" title={doc.description || ''}>
                        {doc.description || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center align-middle">
                      {canView && (
                        <DocumentDownloadButton documentId={doc.id} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center align-middle">
                      {canDelete && (
                        <DocumentDeleteButton documentId={doc.id} projectId={project.id} />
                      )}
                    </td>
                  </tr>
                )
              })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Show message if no documents */}
        {(!project.documents || project.documents.length === 0) && (
          <p className="text-sm text-[color:var(--text-muted)]">No artifacts uploaded yet. Click <strong className="text-[color:var(--accent-gold)]">Edit</strong> to upload documents.</p>
        )}
      </InfoSection>
      </div>
        </>,
      )}
    </>
  )
}

// Document Download Button Component (View/Download - opens download with correct filename)
const DocumentDownloadButton = ({ documentId }: { documentId: string }) => {
  const { token } = useAuth()
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setDownloading(true)
    try {
      const response = await axiosInstance.get<{ url: string }>(
        `/api/documents/${documentId}/signed-url`,
        {
          params: { download: true },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const url = response.data?.url
      if (!url) {
        toast.error('Failed to generate download link')
        setDownloading(false)
        return
      }

      window.open(url, '_blank')
    } catch (error: unknown) {
      toast.error(getFriendlyApiErrorMessage(error))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="text-[color:var(--accent-teal)] hover:opacity-75 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      title="View/Download file"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    </button>
  )
}

// Document Delete Button Component
const DocumentDeleteButton = ({ documentId, projectId }: { documentId: string; projectId: string }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      await axiosInstance.delete(`/api/documents/${documentId}`)
      toast.success('Document deleted successfully')
      setShowConfirm(false)
      // Refresh project data
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    } catch (error: unknown) {
      toast.error(getFriendlyApiErrorMessage(error))
      setShowConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-2 py-1 text-xs font-semibold text-[color:var(--accent-red)] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Confirm'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-2 py-1 text-xs font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleDelete}
      className="ml-2 text-[color:var(--accent-red)] hover:opacity-75 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Delete document"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  )
}

export default ProjectDetail
