import { Link } from 'react-router-dom'
import type { LifecycleDataQualityFinding } from '../../utils/lifecycleDataQuality'

type Props = {
  findings: LifecycleDataQualityFinding[]
}

export default function LifecycleDataQualityBanner({ findings }: Props) {
  if (!findings.length) return null

  const hasWarning = findings.some((f) => f.severity === 'warning')

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
        hasWarning
          ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)]'
          : 'border-[color:var(--border-default)] bg-[color:var(--bg-card)] text-[color:var(--text-primary)]'
      }`}
      role="note"
    >
      <p className="font-extrabold text-[color:var(--text-primary)]">Data quality</p>
      <p className="mt-1 text-[color:var(--text-secondary)]">
        Items below match what you can fix, or who to ask when a field is outside your role.
      </p>
      <ul className="mt-3 space-y-2">
        {findings.map((f) => (
          <li key={f.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <span
              className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${
                f.severity === 'warning'
                  ? 'text-[color:var(--accent-gold)]'
                  : 'text-[color:var(--text-muted)]'
              }`}
            >
              {f.severity === 'warning' ? 'Warning' : 'Info'}
            </span>
            <span className="min-w-0">
              <span className="font-semibold text-[color:var(--text-primary)]">{f.title}</span>
              <span className="text-[color:var(--text-secondary)]"> — {f.detail}</span>
              {f.href ? (
                <>
                  {' '}
                  <Link
                    to={f.href}
                    className="font-semibold text-[color:var(--accent-gold)] underline-offset-2 hover:underline"
                  >
                    Fix →
                  </Link>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
