/**
 * Shared stage pill tones, deal value formatting, and “Open →” controls so
 * Hit List, Pipeline today, and quick-drawer project lists stay visually aligned.
 */

import { ProjectStatus } from '../../types'

/** Projects grid / detail: enum-based pills (same accents as Zenith string pills). */
export function projectStatusStagePillClass(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.LEAD:
      return 'border border-[color:var(--accent-blue-border)] bg-[color:var(--accent-blue-muted)] text-[color:var(--accent-blue)] font-semibold'
    case ProjectStatus.SITE_SURVEY:
      return 'border border-[color:var(--accent-purple-border)] bg-[color:var(--accent-purple-muted)] text-[color:var(--accent-purple)] font-semibold'
    case ProjectStatus.PROPOSAL:
      return 'border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] font-semibold'
    case ProjectStatus.CONFIRMED:
    case ProjectStatus.UNDER_INSTALLATION:
      return 'border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)] font-semibold'
    case ProjectStatus.SUBMITTED_FOR_SUBSIDY:
      return 'border border-[color:var(--accent-purple-border)] bg-[color:var(--accent-purple-muted)] text-[color:var(--accent-purple)] font-semibold'
    case ProjectStatus.COMPLETED:
    case ProjectStatus.COMPLETED_SUBSIDY_CREDITED:
      return 'border border-[color:var(--accent-teal-border)] bg-[color:var(--stage-complete)] text-[color:var(--stage-complete-text)] font-semibold'
    case ProjectStatus.LOST:
      return 'border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)] font-semibold'
    default:
      return 'border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] text-[color:var(--text-secondary)] font-medium'
  }
}

/** Muted fill + accent text + border — readable on light cards and dark Zenith surfaces. */
export function zenithStagePillToneClass(stage: string): string {
  const s = stage.trim()
  if (s === 'Lead')
    return 'bg-[color:var(--accent-blue-muted)] text-[color:var(--accent-blue)] border border-[color:var(--accent-blue-border)]'
  if (s === 'Site Survey')
    return 'bg-[color:var(--accent-purple-muted)] text-[color:var(--accent-purple)] border border-[color:var(--accent-purple-border)]'
  if (s === 'Proposal')
    return 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] border border-[color:var(--accent-gold-border)]'
  if (s === 'Confirmed Order')
    return 'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)] border border-[color:var(--accent-teal-border)]'
  if (s === 'Under Installation')
    return 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] border border-[color:var(--accent-gold-border)]'
  return 'bg-[color:var(--bg-badge)] text-[color:var(--text-secondary)] border border-[color:var(--border-default)]'
}

/** Table / dense list rows (Hit List desktop, pipeline table). */
export function zenithDealRowStagePillClass(stage: string): string {
  return `inline-block rounded-[8px] px-1.5 py-px text-[10px] leading-tight ${zenithStagePillToneClass(stage)}`
}

/** Hit List–style stage pill on narrow screens. */
export function zenithDealRowStagePillClassMobile(stage: string): string {
  return `shrink-0 rounded-[10px] px-2 py-0.5 text-[11px] ${zenithStagePillToneClass(stage)}`
}

/** Quick drawer headers (single project chrome). */
export function zenithDrawerStagePillClass(stageLabel: string): string {
  return `inline-block rounded-[20px] px-3 py-1 text-[12px] ${zenithStagePillToneClass(stageLabel)}`
}

/** Same tones as “Your pipeline today” last-activity pill (shared with Hit List). */
export function zenithLastActivityTone(days: number): { text: string; className: string } {
  if (days < 3)
    return { text: 'text-[color:var(--accent-teal)]', className: 'bg-[color:var(--accent-teal-muted)] border border-[color:var(--accent-teal-border)]' }
  if (days <= 7)
    return { text: 'text-[color:var(--accent-gold)]', className: 'bg-[color:var(--accent-gold-muted)] border border-[color:var(--accent-gold-border)]' }
  return { text: 'text-[color:var(--accent-red)]', className: 'bg-[color:var(--accent-red-muted)] border border-[color:var(--accent-red-border)]' }
}

export function formatZenithDealInrParts(v: number | null | undefined): {
  text: string
  muted: boolean
} {
  if (v == null || v === 0) return { text: '—', muted: true }
  return {
    text: `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)}`,
    muted: false,
  }
}

/** Use inside a parent with `group` for hover (Hit List row pattern). */
export const ZENITH_DEAL_OPEN_BUTTON_CLASS =
  'inline-block rounded-md border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2.5 py-1 text-[10px] font-semibold text-[color:var(--accent-gold)] shadow-sm transition-all duration-200 ease-out hover:border-[color:var(--accent-gold)] hover:bg-[color:color-mix(in srgb,var(--accent-gold) 22%, transparent)] hover:text-[color:var(--text-inverse)] group-hover:border-[color:var(--accent-gold)] group-hover:bg-[color:color-mix(in srgb,var(--accent-gold) 18%, transparent)] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--bg-page)]'

export const ZENITH_DEAL_OPEN_BUTTON_CLASS_BLOCK =
  'block w-full rounded-lg border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] py-1.5 text-center text-[13px] font-semibold text-[color:var(--accent-gold)] shadow-sm transition-all duration-200 ease-out hover:border-[color:var(--accent-gold)] hover:bg-[color:color-mix(in srgb,var(--accent-gold) 22%, transparent)] hover:text-[color:var(--text-inverse)] group-hover:border-[color:var(--accent-gold)] group-hover:bg-[color:color-mix(in srgb,var(--accent-gold) 18%, transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--bg-page)]'
