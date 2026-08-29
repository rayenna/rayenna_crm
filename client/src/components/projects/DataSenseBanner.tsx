import { Link } from 'react-router-dom'
import type { DataSenseFinding } from '../../utils/dataSense'

type Props = {
  findings: Array<DataSenseFinding & { href?: string }>
}

export default function DataSenseBanner({ findings }: Props) {
  if (!findings.length) return null

  const hasCritical = findings.some((f) => f.severity === 'critical')

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
        hasCritical
          ? 'border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--text-primary)]'
          : 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)]'
      }`}
      role="note"
    >
      <p className="font-extrabold text-[color:var(--text-primary)]">Needs review</p>
      <p className="mt-1 text-[color:var(--text-secondary)]">
        Dates, payments, or capacity do not match this project’s stage. This is a reminder, not a hard block. Saving with reversed commissioning vs confirmation dates, or an advance larger than order value, asks you to confirm first.
      </p>
      <ul className="mt-3 space-y-2">
        {findings.map((f) => (
          <li key={f.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <span
              className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${
                f.severity === 'critical'
                  ? 'text-[color:var(--accent-red)]'
                  : 'text-[color:var(--accent-gold)]'
              }`}
            >
              {f.severity === 'critical' ? 'Review' : 'Check'}
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
