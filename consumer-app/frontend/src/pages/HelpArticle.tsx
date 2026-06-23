import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Headphones } from 'lucide-react'
import HelpMarkdown from '@/components/HelpMarkdown'
import { useConsumerHelpArticle } from '@/hooks/useConsumerHelp'

export default function HelpArticle() {
  const { articleId } = useParams<{ articleId: string }>()
  const navigate = useNavigate()
  const articleQuery = useConsumerHelpArticle(articleId)

  const article = articleQuery.data
  const loading = articleQuery.isLoading

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[color:var(--accent-gold)]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  )

  if (loading) {
    return (
      <div className="px-4 py-6 pb-8">
        {backButton}
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="px-4 py-6 pb-8">
        {backButton}
        <div className="zenith-glass rounded-2xl p-6 text-center">
          <p className="text-sm text-[color:var(--text-secondary)]">Article not found.</p>
          <Link to="/help" className="mt-3 inline-block text-sm font-semibold text-[color:var(--accent-gold)]">
            Return to Help Center
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-8">
      {backButton}
      <article>
        <header className="mb-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[color:var(--accent-gold-muted)] px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--accent-gold)]">
              {article.categoryLabel}
            </span>
            <span className="text-[10px] text-[color:var(--text-muted)]">
              {article.readMinutes} min read
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="zenith-display text-xl font-bold text-[color:var(--text-primary)]">
                {article.title}
              </h1>
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{article.subtitle}</p>
            </div>
          </div>
        </header>

        <div className="zenith-glass rounded-2xl p-4 sm:p-5">
          <HelpMarkdown markdown={article.markdown} />
        </div>

        <Link
          to="/support"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] py-3 text-sm font-semibold text-[color:var(--text-primary)]"
        >
          <Headphones className="h-4 w-4 text-[color:var(--accent-green)]" />
          Contact Support
        </Link>
      </article>
    </div>
  )
}
