import type { ReactNode } from 'react'
import { LeadSource } from '../types'

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.WEBSITE]: 'Website',
  [LeadSource.REFERRAL]: 'Referral',
  [LeadSource.GOOGLE]: 'Google',
  [LeadSource.CHANNEL_PARTNER]: 'Channel Partner',
  [LeadSource.DIGITAL_MARKETING]: 'Digital Marketing',
  [LeadSource.SALES]: 'Sales',
  [LeadSource.MANAGEMENT_CONNECT]: 'Management Connect',
  [LeadSource.OTHER]: 'Other',
}

export const LEAD_SOURCES_WITH_DETAILS: readonly LeadSource[] = [
  LeadSource.REFERRAL,
  LeadSource.CHANNEL_PARTNER,
  LeadSource.OTHER,
]

/** Popover value accent + chart hex — one distinct hue per lead source. */
export const LEAD_SOURCE_ACCENT_VARS: Record<LeadSource, string> = {
  [LeadSource.WEBSITE]: 'var(--accent-blue)',
  [LeadSource.REFERRAL]: 'var(--accent-green)',
  [LeadSource.GOOGLE]: 'var(--accent-gold)',
  [LeadSource.CHANNEL_PARTNER]: 'var(--accent-red)',
  [LeadSource.DIGITAL_MARKETING]: 'var(--accent-purple)',
  [LeadSource.SALES]: 'var(--accent-pink)',
  [LeadSource.MANAGEMENT_CONNECT]: 'var(--accent-cyan)',
  [LeadSource.OTHER]: 'var(--accent-lime)',
}

const DETAIL_FIELD_LABELS: Partial<Record<LeadSource, string>> = {
  [LeadSource.REFERRAL]: 'Referral Name',
  [LeadSource.CHANNEL_PARTNER]: 'Channel Partner Name',
  [LeadSource.OTHER]: 'Other Details',
}

const DETAIL_INSIGHT_LINES: Partial<Record<LeadSource, string>> = {
  [LeadSource.REFERRAL]: 'Referred by this contact.',
  [LeadSource.CHANNEL_PARTNER]: 'Lead from this channel partner.',
  [LeadSource.OTHER]: 'Additional lead source information.',
}

/** Static class strings so Tailwind JIT picks up every variant. */
const LEAD_SOURCE_PILL_CLASSES: Record<LeadSource, string> = {
  [LeadSource.WEBSITE]:
    'border border-[color:var(--accent-blue-border)] bg-[color:var(--accent-blue-muted)] text-[color:var(--accent-blue)] font-semibold',
  [LeadSource.REFERRAL]:
    'border border-[color:var(--accent-green-border)] bg-[color:var(--accent-green-muted)] text-[color:var(--accent-green)] font-semibold',
  [LeadSource.GOOGLE]:
    'border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] font-semibold',
  [LeadSource.CHANNEL_PARTNER]:
    'border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)] font-semibold',
  [LeadSource.DIGITAL_MARKETING]:
    'border border-[color:var(--accent-purple-border)] bg-[color:var(--accent-purple-muted)] text-[color:var(--accent-purple)] font-semibold',
  [LeadSource.SALES]:
    'border border-[color:var(--accent-pink-border)] bg-[color:var(--accent-pink-muted)] text-[color:var(--accent-pink)] font-semibold',
  [LeadSource.MANAGEMENT_CONNECT]:
    'border border-[color:var(--accent-cyan-border)] bg-[color:var(--accent-cyan-muted)] text-[color:var(--accent-cyan)] font-semibold',
  [LeadSource.OTHER]:
    'border border-[color:var(--accent-lime-border)] bg-[color:var(--accent-lime-muted)] text-[color:var(--accent-lime)] font-semibold',
}

export function getLeadSourceAccent(leadSource: LeadSource | string): string {
  return LEAD_SOURCE_ACCENT_VARS[leadSource as LeadSource] ?? 'var(--accent-teal)'
}

export function getLeadSourceLabel(leadSource?: string | null): string | null {
  if (!leadSource) return null
  return LEAD_SOURCE_LABELS[leadSource as LeadSource] ?? leadSource.replace(/_/g, ' ')
}

export function leadSourceRequiresDetails(leadSource?: string | null): boolean {
  if (!leadSource) return false
  return (LEAD_SOURCES_WITH_DETAILS as readonly string[]).includes(leadSource)
}

export function getLeadSourceDetailValue(
  leadSource?: string | null,
  leadSourceDetails?: string | null,
): string | null {
  if (!leadSourceRequiresDetails(leadSource)) return null
  const trimmed = leadSourceDetails?.trim()
  return trimmed || null
}

export function getLeadSourceDetailFieldLabel(leadSource: LeadSource): string {
  return DETAIL_FIELD_LABELS[leadSource] ?? 'Details'
}

export function getLeadSourceDetailInsight(leadSource: LeadSource): string {
  return DETAIL_INSIGHT_LINES[leadSource] ?? ''
}

/** User-facing message when the detail field is required but empty. */
export function getLeadSourceDetailsRequiredMessage(leadSource: LeadSource | string): string {
  switch (leadSource) {
    case LeadSource.REFERRAL:
      return 'Please enter the referral name'
    case LeadSource.CHANNEL_PARTNER:
      return 'Please enter the channel partner name'
    case LeadSource.OTHER:
      return 'Please enter other lead source details'
    default:
      return 'Please enter lead source details'
  }
}

export function validateLeadSourceDetailsInput(
  leadSource?: string | null,
  leadSourceDetails?: string | null,
): true | string {
  if (!leadSourceRequiresDetails(leadSource)) return true
  if (!getLeadSourceDetailValue(leadSource, leadSourceDetails)) {
    return getLeadSourceDetailsRequiredMessage(leadSource as LeadSource)
  }
  return true
}

export function getLeadSourceDetailAccent(leadSource: LeadSource): string {
  return getLeadSourceAccent(leadSource)
}

/** Tailwind classes for the lead-source pill in the Projects table. */
export function getLeadSourcePillClasses(leadSource: string): string {
  return (
    LEAD_SOURCE_PILL_CLASSES[leadSource as LeadSource] ??
    'border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)]'
  )
}

/** Compact label for narrow table cells (Channel Partner, Management Connect). */
export function getLeadSourcePillCompactLabel(leadSource: string): string | null {
  if (leadSource === LeadSource.CHANNEL_PARTNER) return 'Channel'
  if (leadSource === LeadSource.MANAGEMENT_CONNECT) return 'Mgmt'
  return null
}

export function formatLeadSourceDisplay(
  leadSource?: string | null,
  leadSourceDetails?: string | null,
): ReactNode {
  if (!leadSource) return null
  const label = getLeadSourceLabel(leadSource)
  const detail = getLeadSourceDetailValue(leadSource, leadSourceDetails)
  return (
    <>
      {label}
      {detail ? (
        <span className="mt-1 block text-[color:var(--text-muted)] sm:mt-0 sm:inline sm:pl-1">({detail})</span>
      ) : null}
    </>
  )
}
