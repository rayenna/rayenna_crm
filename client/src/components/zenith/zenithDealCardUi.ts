/**
 * Shared stage pill tones, deal value formatting, and “Open →” controls so
 * Hit List, Pipeline today, and quick-drawer project lists stay visually aligned.
 */

export function zenithStagePillToneClass(stage: string): string {
  const s = stage.trim()
  if (s === 'Lead') return 'bg-[rgba(56,139,255,0.15)] text-[#3B8BFF]'
  if (s === 'Site Survey') return 'bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]'
  if (s === 'Proposal') return 'bg-[rgba(245,166,35,0.15)] text-[#F5A623]'
  if (s === 'Confirmed Order') return 'bg-[rgba(0,212,180,0.15)] text-[#00D4B4]'
  if (s === 'Under Installation') return 'bg-[rgba(245,166,35,0.15)] text-[#F5A623]'
  return 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)]'
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
  if (days < 3) return { text: 'text-emerald-300', className: 'bg-emerald-500/15' }
  if (days <= 7) return { text: 'text-amber-300', className: 'bg-amber-500/15' }
  return { text: 'text-red-300', className: 'bg-red-500/15' }
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
  'inline-block rounded-md border border-white/20 bg-transparent px-2 py-1 text-[10px] text-white/70 transition-all duration-200 ease-out group-hover:border-[#F5A623] group-hover:bg-[rgba(245,166,35,0.08)] group-hover:text-[#F5A623] whitespace-nowrap'

export const ZENITH_DEAL_OPEN_BUTTON_CLASS_BLOCK =
  'block w-full rounded-lg border border-white/20 bg-transparent py-1.5 text-center text-[13px] text-white/70 transition-all duration-200 ease-out group-hover:border-[#F5A623] group-hover:bg-[rgba(245,166,35,0.08)] group-hover:text-[#F5A623]'
