import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Headphones,
  Search,
  X,
} from 'lucide-react'
import { useConsumerHelp } from '@/hooks/useConsumerHelp'
import HelpContextSuggestions from '@/components/HelpContextSuggestions'

const ALL_CATEGORY = 'all'

function normalizeQuery(value: string) {
  return value.trim().toLowerCase()
}

export default function Help() {
  const helpQuery = useConsumerHelp()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') ?? ALL_CATEGORY
  const [search, setSearch] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const loading = helpQuery.isLoading
  const helpData = helpQuery.data

  const activeCategory =
    categoryParam === ALL_CATEGORY ||
    (helpData?.categories ?? []).some((c) => c.id === categoryParam)
      ? categoryParam
      : ALL_CATEGORY

  const filteredArticles = useMemo(() => {
    const articles = helpData?.articles ?? []
    const q = normalizeQuery(search)
    return articles.filter((article) => {
      if (activeCategory !== ALL_CATEGORY && article.category !== activeCategory) {
        return false
      }
      if (!q) return true
      return (
        article.title.toLowerCase().includes(q) ||
        article.subtitle.toLowerCase().includes(q) ||
        article.categoryLabel.toLowerCase().includes(q)
      )
    })
  }, [helpData, activeCategory, search])

  const filteredFaqs = useMemo(() => {
    const faqs = helpData?.faqs ?? []
    const q = normalizeQuery(search)
    return faqs.filter((faq) => {
      if (activeCategory !== ALL_CATEGORY && faq.category !== activeCategory) {
        return false
      }
      if (!q) return true
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.categoryLabel.toLowerCase().includes(q)
      )
    })
  }, [helpData, activeCategory, search])

  const setCategory = (id: string) => {
    if (id === ALL_CATEGORY) {
      searchParams.delete('category')
      setSearchParams(searchParams, { replace: true })
      return
    }
    setSearchParams({ category: id }, { replace: true })
  }

  const showGuides = filteredArticles.length > 0
  const showFaqs = filteredFaqs.length > 0
  const noResults = !showGuides && !showFaqs

  return (
    <div className="px-4 py-6 pb-8">
      <header className="mb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="zenith-display text-2xl font-bold text-[color:var(--text-primary)]">
              Help Center
            </h1>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Guides for your Rayenna solar system
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          <HelpContextSuggestions
            screen="help"
            title="Recommended for you"
            showBrowseLink={false}
          />

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guides and FAQs…"
              className="w-full rounded-2xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] py-3 pl-10 pr-10 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setCategory(ALL_CATEGORY)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === ALL_CATEGORY
                  ? 'bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)]'
                  : 'bg-[color:var(--bg-card)] text-[color:var(--text-secondary)]'
              }`}
            >
              All topics
            </button>
            {(helpData?.categories ?? []).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  activeCategory === cat.id
                    ? 'bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)]'
                    : 'bg-[color:var(--bg-card)] text-[color:var(--text-secondary)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {activeCategory !== ALL_CATEGORY && (
            <p className="text-xs text-[color:var(--text-muted)]">
              {(helpData?.categories ?? []).find((c) => c.id === activeCategory)?.description}
            </p>
          )}

          {noResults ? (
            <div className="zenith-glass rounded-2xl p-6 text-center">
              <p className="text-sm text-[color:var(--text-secondary)]">
                No guides or FAQs match your search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setCategory(ALL_CATEGORY)
                }}
                className="mt-3 text-sm font-semibold text-[color:var(--accent-gold)]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {showGuides && (
                <section>
                  <h2 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">Guides</h2>
                  <div className="space-y-2">
                    {filteredArticles.map((article) => (
                      <Link
                        key={article.id}
                        to={`/help/${article.id}`}
                        className="zenith-glass flex items-center gap-3 rounded-2xl p-4 transition hover:opacity-95"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]">
                          <BookOpen className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[color:var(--text-primary)]">
                            {article.title}
                          </span>
                          <span className="text-xs text-[color:var(--text-muted)]">
                            {article.subtitle}
                          </span>
                          <span className="mt-1 flex items-center gap-1 text-[10px] text-[color:var(--accent-gold)]">
                            {article.categoryLabel}
                            <span className="text-[color:var(--text-muted)]">·</span>
                            <Clock className="h-3 w-3" aria-hidden />
                            {article.readMinutes} min
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {showFaqs && (
                <section>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-[color:var(--text-primary)]">
                      {search ? 'Matching FAQs' : 'Quick answers'}
                    </h2>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {filteredFaqs.length}
                    </span>
                  </div>
                  <div className="zenith-glass divide-y divide-[color:var(--border-default)] overflow-hidden rounded-2xl">
                    {filteredFaqs.map((faq) => {
                      const open = expandedFaq === faq.id
                      return (
                        <div key={faq.id} id={faq.id}>
                          <button
                            type="button"
                            onClick={() => setExpandedFaq(open ? null : faq.id)}
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[color:var(--text-primary)]">
                                {faq.question}
                              </p>
                              <p className="text-xs text-[color:var(--accent-gold)]">
                                {faq.categoryLabel}
                              </p>
                            </div>
                            {open ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                            )}
                          </button>
                          {open && (
                            <div className="border-t border-[color:var(--border-default)] px-4 py-3">
                              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[color:var(--text-secondary)]">
                                {faq.answer}
                              </p>
                              {faq.articleId ? (
                                <Link
                                  to={`/help/${faq.articleId}`}
                                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent-gold)]"
                                >
                                  Read full guide
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          <Link
            to="/support"
            className="zenith-glass flex items-center gap-3 rounded-2xl p-4 transition hover:opacity-95"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent-green-muted)] text-[color:var(--accent-green)]">
              <Headphones className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-[color:var(--text-primary)]">
                Still need help?
              </span>
              <span className="text-xs text-[color:var(--text-muted)]">
                Contact Support — tickets, emergency line & referrals
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
          </Link>
        </div>
      )}
    </div>
  )
}
