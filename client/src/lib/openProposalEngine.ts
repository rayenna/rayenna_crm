import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import toast from 'react-hot-toast'

function proposalEngineBaseUrl(): string | null {
  const base = import.meta.env.VITE_PROPOSAL_ENGINE_URL
  if (!base) return null
  return base.endsWith('/') ? base.slice(0, -1) : base
}

/**
 * Open Proposal Engine Customers / Projects via CRM SSO.
 * Pass `projectId` to deep-link that CRM project; omit it for the list with nothing pre-selected.
 */
export async function openProposalEngine(options?: { projectId?: string }): Promise<void> {
  const projectId = options?.projectId?.trim() || ''
  const normalizedBase = proposalEngineBaseUrl()
  if (!normalizedBase) {
    toast.error('Proposal Engine URL is not configured.')
    return
  }

  const openWindow = (ticket?: string) => {
    const params = new URLSearchParams()
    if (ticket) params.set('ticket', ticket)
    if (projectId) params.set('openProjectId', projectId)
    else params.set('clearSelection', '1')
    const q = params.toString()
    window.open(`${normalizedBase}/customers${q ? `?${q}` : ''}`, '_blank', 'noopener,noreferrer')
    if (projectId) {
      void axiosInstance.post('/api/proposal-engine/audit/proposal-click', { projectId }).catch(() => {})
    }
  }

  try {
    const { data } = await axiosInstance.post<{ ticket: string }>('/api/auth/sso-ticket')
    openWindow(data?.ticket)
  } catch (err: unknown) {
    toast.error(getFriendlyApiErrorMessage(err) || 'Could not open Proposal Engine.')
    openWindow()
  }
}

/** Open Proposal Engine for a CRM project (SSO ticket + openProjectId). */
export async function openProposalEngineForProject(projectId: string): Promise<void> {
  const id = projectId.trim()
  if (!id) return
  await openProposalEngine({ projectId: id })
}

export function isPeAskHref(href: string | undefined | null): href is string {
  return Boolean(href && href.startsWith('pe:'))
}

export function peProjectIdFromHref(href: string): string {
  return href.slice(3).trim()
}
