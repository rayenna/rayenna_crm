import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react'
import { useConsumerHelpContext } from '@/hooks/useConsumerHelp'
import HelpContextLink from '@/components/HelpContextLink'
import type { HelpContextScreen } from '@/types/help'

export default function HelpContextSuggestions({
  screen,
  title = 'Suggested for you',
  className = '',
  showBrowseLink = true,
}: {
  screen: HelpContextScreen
  title?: string
  className?: string
  showBrowseLink?: boolean
}) {
  const contextQuery = useConsumerHelpContext(screen)
  const suggestions = contextQuery.data?.suggestions ?? []

  if (contextQuery.isLoading) {
    return (
      <div className={`zenith-glass rounded-2xl p-4 ${className}`}>
        <div className="h-4 w-32 animate-pulse rounded bg-[color:var(--bg-badge)]" />
        <div className="mt-3 space-y-2">
          <div className="h-14 animate-pulse rounded-xl bg-[color:var(--bg-badge)]" />
          <div className="h-14 animate-pulse rounded-xl bg-[color:var(--bg-badge)]" />
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    if (!showBrowseLink) return null
    return (
      <Link
        to="/help"
        className={`zenith-glass flex items-center gap-3 rounded-2xl p-3.5 transition hover:opacity-95 ${className}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]">
          <BookOpen className="h-4 w-4" aria-hidden />
        </span>
        <span className="flex-1 text-xs font-semibold text-[color:var(--text-primary)]">
          Browse Help Center
        </span>
        <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
      </Link>
    )
  }

  return (
    <section className={className}>
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[color:var(--accent-gold)]" aria-hidden />
        <h2 className="text-sm font-bold text-[color:var(--text-primary)]">{title}</h2>
      </div>
      <div className="space-y-2">
        {suggestions.map((item) => (
          <HelpContextLink
            key={item.id}
            articleId={item.articleId}
            title={item.title}
            subtitle={item.subtitle}
            reason={item.reason}
          />
        ))}
      </div>
      {showBrowseLink ? (
        <Link
          to="/help"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent-gold)]"
        >
          View all help topics
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </section>
  )
}
