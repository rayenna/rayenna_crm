import { Copy, Download, KeyRound, X } from 'lucide-react'

export type HubCredentials = {
  username: string
  temporaryPassword: string
}

type Props = {
  credentials: HubCredentials
  onDismiss?: () => void
  onCopy: () => void
  onDownloadPdf?: () => void
  pdfLoading?: boolean
  /** Extra line under the title (e.g. “Created just now”). */
  subtitle?: string
}

/**
 * Persistent one-time password panel — survives after toasts dismiss on mobile.
 */
export default function HubCredentialsPanel({
  credentials,
  onDismiss,
  onCopy,
  onDownloadPdf,
  pdfLoading = false,
  subtitle = 'Copy now — this password is shown only once',
}: Props) {
  return (
    <section
      className="mb-4 rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-4 ring-1 ring-[color:var(--accent-gold-border)] sm:p-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[color:var(--text-primary)]">New credentials</h2>
            <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">{subtitle}</p>
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-[36px] min-w-[36px] shrink-0 touch-manipulation items-center justify-center rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
            aria-label="Dismiss credentials"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <p className="mt-3 break-all font-mono text-sm text-[color:var(--text-primary)]">
        Username: <strong>{credentials.username}</strong>
        <br />
        Password: <strong>{credentials.temporaryPassword}</strong>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)]"
        >
          <Copy className="h-4 w-4" /> Copy to clipboard
        </button>
        {onDownloadPdf ? (
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={pdfLoading}
            className="inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-[color:var(--accent-teal)]" />
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
        ) : null}
      </div>
    </section>
  )
}
