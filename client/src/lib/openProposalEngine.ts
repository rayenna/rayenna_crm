import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import toast from 'react-hot-toast'

/** Open Proposal Engine for a CRM project (SSO ticket + openProjectId). Stays on the current CRM tab. */
export async function openProposalEngineForProject(projectId: string): Promise<void> {
  const id = projectId.trim()
  if (!id) return
  const base = import.meta.env.VITE_PROPOSAL_ENGINE_URL
  if (!base) {
    toast.error('Proposal Engine URL is not configured.')
    return
  }
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  try {
    const { data } = await axiosInstance.post<{ ticket: string }>('/api/auth/sso-ticket')
    const ticket = data?.ticket
    const url = ticket
      ? `${normalizedBase}/customers?ticket=${encodeURIComponent(ticket)}&openProjectId=${encodeURIComponent(id)}`
      : `${normalizedBase}/customers?openProjectId=${encodeURIComponent(id)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    void axiosInstance.post('/api/proposal-engine/audit/proposal-click', { projectId: id }).catch(() => {})
  } catch (err: unknown) {
    toast.error(getFriendlyApiErrorMessage(err) || 'Could not open Proposal Engine.')
    window.open(
      `${normalizedBase}/customers?openProjectId=${encodeURIComponent(id)}`,
      '_blank',
      'noopener,noreferrer',
    )
    void axiosInstance.post('/api/proposal-engine/audit/proposal-click', { projectId: id }).catch(() => {})
  }
}

export function isPeAskHref(href: string | undefined | null): href is string {
  return Boolean(href && href.startsWith('pe:'))
}

export function peProjectIdFromHref(href: string): string {
  return href.slice(3).trim()
}
