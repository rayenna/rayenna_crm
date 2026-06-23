import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight } from 'lucide-react'

export default function HelpContextLink({
  articleId,
  title,
  subtitle,
  reason,
}: {
  articleId: string
  title: string
  subtitle?: string
  reason?: string
}) {
  return (
    <Link
      to={`/help/${articleId}`}
      className="zenith-glass flex items-center gap-3 rounded-2xl p-3.5 transition hover:opacity-95"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]">
        <BookOpen className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-[color:var(--text-primary)]">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-[10px] text-[color:var(--text-muted)]">{subtitle}</span>
        ) : null}
        {reason ? (
          <span className="mt-1 inline-block rounded-full bg-[color:var(--accent-teal-muted)] px-2 py-0.5 text-[9px] font-semibold text-[color:var(--accent-teal)]">
            {reason}
          </span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
    </Link>
  )
}
