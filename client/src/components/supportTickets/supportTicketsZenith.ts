import { SupportTicketStatus } from '../../types'

/** Field labels — theme tokens (light + dark). */
export const stLabelCls =
  'mb-1.5 block text-sm font-semibold leading-snug tracking-tight text-[color:var(--text-primary)]'

/** Small all-caps meta labels (STATUS, TITLE, …). */
export const stFieldMetaLabelCls =
  'text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]'

/** Table header cells aligned with {@link stFieldMetaLabelCls}. */
export const stTableThCls = `px-4 py-3 text-left ${stFieldMetaLabelCls}`

/** Secondary timestamps / meta lines. */
export const stTimestampCls = 'text-xs text-[color:var(--text-muted)]'

/** Text inputs & textareas — use with `zenith-root` / `data-theme` on ancestor. */
export const stInputCls =
  'zenith-native-filter-input w-full rounded-xl px-3 py-2.5 text-sm placeholder:text-[color:var(--text-placeholder)] focus:border-[color:var(--accent-gold-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)]'

/** Native `<select>` — do not combine with {@link stInputCls}. */
export const stSelectCls =
  'zenith-native-select w-full rounded-xl px-3 py-2.5 text-sm focus:border-[color:var(--accent-gold-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)]'

export const stMutedCls = 'text-xs text-[color:var(--text-muted)]'

export const stSectionInner =
  'rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-[3px] border-l-[color:var(--accent-gold)]'

export const stPrimaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50'

export const stGhostBtn =
  'rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--accent-gold-border)] hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-45'

export const stLinkAccent =
  'font-semibold text-[color:var(--accent-gold)] underline-offset-2 hover:opacity-90 hover:underline'

export function supportTicketStatusLabel(status: SupportTicketStatus): string {
  switch (status) {
    case SupportTicketStatus.OPEN:
      return 'Open'
    case SupportTicketStatus.IN_PROGRESS:
      return 'In Progress'
    case SupportTicketStatus.CLOSED:
      return 'Closed'
    default:
      return String(status)
  }
}

/** Status chips — readable on light and dark surfaces. */
export function supportTicketStatusPillClass(status: SupportTicketStatus): string {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1'
  switch (status) {
    case SupportTicketStatus.OPEN:
      return `${base} border border-[color:var(--accent-blue-border)] bg-[color:var(--accent-blue-muted)] text-[color:var(--accent-blue)] ring-[color:var(--accent-blue-border)]`
    case SupportTicketStatus.IN_PROGRESS:
      return `${base} border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)] ring-[color:var(--accent-gold-border)]`
    case SupportTicketStatus.CLOSED:
      return `${base} border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] text-[color:var(--text-secondary)] ring-[color:var(--border-default)]`
    default:
      return `${base} border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-muted)] ring-[color:var(--border-default)]`
  }
}
