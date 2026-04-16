import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { helpSections, HelpSection, getHelpSectionForRoute, getHelpContextLabel } from '../help/sections'
import { getHelpContent } from '../help/contentLoader'
import { searchHelpContent } from '../help/searchHelp'
import HelpSidebar from '../components/help/HelpSidebar'
import ErrorBoundary from '../components/ErrorBoundary'
import { BookOpen } from 'lucide-react'
import { slugifyHeadingLabel, textFromChildren } from '../help/markdownHeadingUtils'

/** Normalize markdown string for safe rendering; avoids formatting/crash on hard refresh. */
function normalizeHelpMarkdown(raw: string | undefined): string {
  if (raw == null) return ''
  return String(raw)
    .replace(/\r\n?/g, '\n')
    .replace(/\0/g, '')
    .trim()
}

const Help = () => {
  const { section } = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const helpContextPathRef = useRef<string | null>(null)

  // Legacy URL: /help/zenith → Zenith is a subsection under Analytics
  useEffect(() => {
    if (section === 'zenith') {
      navigate('/help/analytics#zenith-command-center', { replace: true })
    }
  }, [section, navigate])

  // Determine current section - simplified and safe for hard refresh
  const selectedSection = useMemo(() => {
    try {
      // If explicit section in URL, use it. Still read referrer for context banner (e.g. opened via ? or Help menu from another page).
      if (section) {
        try {
          const referrerPath = sessionStorage.getItem('helpReferrer')
          if (referrerPath) {
            helpContextPathRef.current = referrerPath
            sessionStorage.removeItem('helpReferrer')
          }
        } catch (_) { /* ignore storage errors */ }
        const found = helpSections.find(s => s.routeKey === section)
        if (found) return found
      }

      // On open without section: use referrer for context-sensitive section + banner
      try {
        const referrerPath = sessionStorage.getItem('helpReferrer')
        if (referrerPath) {
          const contextSectionId = getHelpSectionForRoute(referrerPath)
          const found = helpSections.find(s => s.id === contextSectionId)
          if (found) {
            helpContextPathRef.current = referrerPath
            sessionStorage.removeItem('helpReferrer')
            return found
          }
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn('Error accessing sessionStorage:', e)
      }

      helpContextPathRef.current = null
      return helpSections.find(s => s.id === 'getting-started') || helpSections[0] || null
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error determining section:', error)
      return helpSections[0] || null
    }
  }, [section])

  // Sync URL to section so hard refresh preserves current help section
  useEffect(() => {
    if (!section && selectedSection) {
      navigate(`/help/${selectedSection.routeKey}`, { replace: true })
    }
  }, [section, selectedSection, navigate])

  // Esc key to close Help
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        navigate('/dashboard')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [navigate])

  // Content is loaded at build time via Vite – no fetch
  const rawContent = selectedSection
    ? getHelpContent(selectedSection.id) || `# ${selectedSection.title}\n\nContent for ${selectedSection.title} is coming soon.`
    : ''
  const markdownContent = useMemo(() => normalizeHelpMarkdown(rawContent), [rawContent])

  // Deep-link to heading within a section (e.g. shared /help/analytics#proposal-engine-card)
  useEffect(() => {
    const raw = window.location.hash?.slice(1)
    if (!raw || !markdownContent.trim()) return
    const id = decodeURIComponent(raw)
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [section, selectedSection?.id, markdownContent])

  const [searchQuery, setSearchQuery] = useState('')
  const allContent = useMemo(
    () =>
      helpSections.map((s) => ({
        id: s.id,
        title: s.title,
        routeKey: s.routeKey,
        content: getHelpContent(s.id) || '',
      })),
    []
  )
  const searchResults = useMemo(
    () => searchHelpContent(searchQuery, allContent),
    [searchQuery, allContent]
  )

  const handleSectionSelect = (section: HelpSection) => {
    helpContextPathRef.current = null
    navigate(`/help/${section.routeKey}`)
  }

  const handleSearchResultClick = (routeKey: string) => {
    const sec = helpSections.find((s) => s.routeKey === routeKey)
    if (sec) handleSectionSelect(sec)
    setSearchQuery('')
  }

  const contextLabel = helpContextPathRef.current ? getHelpContextLabel(helpContextPathRef.current) : null

  // Ensure we have a valid section before rendering
  if (!selectedSection) {
    return (
      <div className="zenith-root flex min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] w-full items-center justify-center px-4">
        <div className="text-center">
          <div
            className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
            aria-hidden
          />
          <p className="mt-4 text-sm font-medium text-[color:var(--text-muted)]">Initializing help content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">
        <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
                <BookOpen className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">Help</h1>
                <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">Documentation and guidance for using the CRM</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-6 gap-y-8 lg:gap-y-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 min-h-0 space-y-4">
            {/* Search */}
            <div className="flex-shrink-0 overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)]">
              <label htmlFor="help-search" className="sr-only">
                Search help
              </label>
              <input
                id="help-search"
                type="search"
                placeholder="Search help…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="zenith-native-filter-input w-full rounded-none border-0 px-4 py-3 text-sm placeholder:text-[color:var(--text-placeholder)] focus:ring-0"
                aria-describedby={searchQuery.length > 0 ? 'help-search-results' : undefined}
              />
              {searchQuery.trim().length > 0 && (
                <div
                  id="help-search-results"
                  className="max-h-64 overflow-y-auto border-t border-[color:var(--border-default)]"
                  role="list"
                >
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[color:var(--text-muted)]">No matches</p>
                  ) : (
                    searchResults.map((r) => (
                      <button
                        key={r.routeKey}
                        type="button"
                        onClick={() => handleSearchResultClick(r.routeKey)}
                        className="w-full border-b border-[color:var(--border-default)] px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-[color:var(--bg-table-hover)]"
                        role="listitem"
                      >
                        <span className="block font-semibold text-[color:var(--accent-gold)]">{r.sectionTitle}</span>
                        <span className="line-clamp-2 text-[color:var(--text-secondary)]">{r.snippet}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedSection && (
              <HelpSidebar
                sections={helpSections}
                selectedSection={selectedSection}
                onSectionSelect={handleSectionSelect}
              />
            )}
          </div>

          {/* Right Content Area */}
          <div className="border-t border-[color:var(--border-default)] pt-6 lg:col-span-3 lg:border-t-0 lg:pl-1 lg:pt-0">
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)]">
              <div
                className="h-1.5 bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-amber)] to-[color:var(--accent-teal)]"
                aria-hidden
              />
              <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
                {contextLabel && (
                  <div className="mb-6 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-secondary)] shadow-sm">
                    <span className="font-semibold text-[color:var(--accent-teal)]">Help for:</span>{' '}
                    <span className="font-bold text-[color:var(--text-primary)]">{contextLabel}</span>
                    {selectedSection && (
                      <span className="ml-1 text-[color:var(--text-muted)]">
                        {' '}— <strong className="text-[color:var(--text-primary)]">{selectedSection.title}</strong> section
                      </span>
                    )}
                  </div>
                )}
                {markdownContent ? (
                  <ErrorBoundary
                    fallback={
                      <div className="rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-4 text-[color:var(--accent-red)]">
                        <p className="mb-2 font-semibold">Error rendering content</p>
                        <p className="text-sm text-[color:var(--text-secondary)]">Please try refreshing the page.</p>
                      </div>
                    }
                  >
                    <div className="max-w-none">
                      <Suspense fallback={<div className="py-4 text-center text-[color:var(--text-muted)]">Loading…</div>}>
                        {markdownContent && markdownContent.trim() ? (
                          <ErrorBoundary
                            fallback={
                              <div className="rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-4 text-[color:var(--accent-red)]">
                                <p className="mb-2 font-semibold">Error rendering content</p>
                                <p className="text-sm text-[color:var(--text-secondary)]">
                                  The help content could not be displayed. Please try refreshing the page.
                                </p>
                              </div>
                            }
                          >
                            <ReactMarkdown
                              key={selectedSection?.id ?? 'help'}
                              remarkPlugins={[remarkGfm]}
                              components={{
                      h1: ({ children, ...props }) => (
                        <h1
                          className="zenith-display mb-6 mt-0 border-b border-[color:var(--border-default)] bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-amber)] to-[color:var(--accent-teal)] bg-clip-text pb-4 text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl"
                          {...props}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children, ...props }) => {
                        const id = slugifyHeadingLabel(textFromChildren(children))
                        return (
                          <h2
                            id={id}
                            className="zenith-display scroll-mt-28 mb-4 mt-10 flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-3 text-lg font-bold text-[color:var(--text-primary)] shadow-sm sm:text-xl"
                            {...props}
                          >
                            {children}
                          </h2>
                        )
                      },
                      h3: ({ children, ...props }) => {
                        const id = slugifyHeadingLabel(textFromChildren(children))
                        return (
                          <h3
                            id={id}
                            className="scroll-mt-24 mb-2 mt-7 border-l-4 border-[color:var(--accent-teal)] pl-3 text-base font-semibold text-[color:var(--text-primary)] sm:text-lg"
                            {...props}
                          >
                            {children}
                          </h3>
                        )
                      },
                      h4: ({ children, ...props }) => {
                        const id = slugifyHeadingLabel(textFromChildren(children))
                        return (
                          <h4
                            id={id}
                            className="scroll-mt-20 mb-2 mt-5 text-base font-semibold text-[color:var(--text-primary)]"
                            {...props}
                          >
                            {children}
                          </h4>
                        )
                      },
                      p: ({ ...props }) => (
                        <p className="mb-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]" {...props} />
                      ),
                      ul: ({ ...props }) => (
                        <ul
                          className="mb-5 list-outside list-disc space-y-2.5 pl-5 text-[15px] text-[color:var(--text-secondary)]"
                          {...props}
                        />
                      ),
                      ol: ({ ...props }) => (
                        <ol
                          className="mb-5 list-outside list-decimal space-y-2.5 pl-5 text-[15px] text-[color:var(--text-secondary)]"
                          {...props}
                        />
                      ),
                      li: ({ ...props }) => (
                        <li className="pl-1 leading-relaxed marker:text-[color:var(--accent-gold)]" {...props} />
                      ),
                      strong: ({ ...props }) => (
                        <strong className="font-semibold text-[color:var(--text-primary)]" {...props} />
                      ),
                      hr: () => (
                        <hr className="mx-auto my-8 h-px max-w-lg rounded-full border-0 bg-gradient-to-r from-transparent via-[color:var(--border-strong)] to-transparent" />
                      ),
                      code: ({ inline, ...props }: React.ComponentProps<'code'> & { inline?: boolean }) => {
                        if (inline) {
                          return (
                            <code
                              className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] px-1.5 py-0.5 font-mono text-sm text-[color:var(--accent-gold)]"
                              {...props}
                            />
                          )
                        }
                        return (
                          <code
                            className="mb-4 block overflow-x-auto rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-4 font-mono text-sm text-[color:var(--text-primary)] shadow-inner"
                            {...props}
                          />
                        )
                      },
                      pre: ({ ...props }) => (
                        <pre
                          className="mb-4 overflow-x-auto rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-4 text-[color:var(--text-primary)] shadow-inner"
                          {...props}
                        />
                      ),
                      a: (props: React.ComponentProps<'a'>) => {
                        const href = props.href ?? ''
                        const linkClass =
                          'font-semibold text-[color:var(--accent-teal)] underline decoration-[color:var(--border-strong)] underline-offset-2 transition-opacity hover:opacity-90'
                        if (href.startsWith('#') && href.length > 1) {
                          const rawId = href.slice(1)
                          return (
                            <a
                              {...props}
                              href={href}
                              className={linkClass}
                              onClick={(e) => {
                                e.preventDefault()
                                const id = decodeURIComponent(rawId)
                                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                const base = `${window.location.pathname}${window.location.search}`
                                window.history.replaceState(null, '', `${base}#${encodeURIComponent(id)}`)
                              }}
                            />
                          )
                        }
                        if (href.startsWith('/help/')) {
                          const sectionKey = href
                            .replace('/help/', '')
                            .split('?')[0]
                            .split('#')[0]
                            .replace(/\/$/, '')
                          const targetSection = helpSections.find((s) => s.routeKey === sectionKey)
                          if (targetSection) {
                            return (
                              <a
                                {...props}
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleSectionSelect(targetSection)
                                }}
                                className={`${linkClass} cursor-pointer`}
                              />
                            )
                          }
                        }
                        if (href.startsWith('http://') || href.startsWith('https://')) {
                          return (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={linkClass}
                            />
                          )
                        }
                        return <a className={linkClass} {...props} />
                      },
                      blockquote: ({ children, ...props }) => {
                        const t = textFromChildren(children).trim()
                        const isTip = /^(\*\*)?tip(\*\*)?:/i.test(t)
                        const isNote = /^(\*\*)?note(\*\*)?:/i.test(t)
                        const box = isTip
                          ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)]'
                          : isNote
                            ? 'border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--text-primary)]'
                            : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)]'
                        return (
                          <blockquote
                            className={`rounded-xl border px-4 py-3 my-6 text-sm leading-relaxed not-italic border-l-4 shadow-sm [&_p]:mb-2 [&_p:last-child]:mb-0 ${box}`}
                            {...props}
                          >
                            {children}
                          </blockquote>
                        )
                      },
                      table: ({ ...props }) => (
                        <div className="mb-6 overflow-x-auto rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] shadow-md">
                          <table
                            className="min-w-full border-collapse text-[13px] sm:text-sm"
                            {...props}
                          />
                        </div>
                      ),
                      thead: ({ ...props }) => (
                        <thead className="bg-[color:var(--zenith-table-header-bg)] text-[color:var(--zenith-table-header-fg)]" {...props} />
                      ),
                      th: ({ ...props }) => (
                        <th
                          className="border-b border-[color:var(--border-default)] px-3 py-3 text-left text-xs font-bold uppercase tracking-wide sm:px-4"
                          {...props}
                        />
                      ),
                      tbody: ({ ...props }) => <tbody className="divide-y divide-[color:var(--border-default)]" {...props} />,
                      tr: ({ ...props }) => (
                        <tr className="bg-[color:var(--bg-card)] transition-colors hover:bg-[color:var(--bg-table-hover)]" {...props} />
                      ),
                      td: ({ ...props }) => (
                        <td
                          className="border-b border-[color:var(--border-default)] px-3 py-3 align-top text-[15px] leading-relaxed text-[color:var(--text-secondary)] last:border-b-0 sm:px-4 sm:text-sm"
                          {...props}
                        />
                      ),
                      img: (props: React.ComponentProps<'img'>) => {
                        let src = props.src || ''
                        // If it's a relative path, resolve it
                        if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/')) {
                          const currentPath = selectedSection?.markdownPath || ''
                          const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'))
                          src = `${basePath}/${src}`
                        }
                        return (
                          <span className="my-6 flex justify-center w-full">
                            <img
                              {...props}
                              src={src}
                              className="mx-auto h-auto max-w-full rounded-xl border border-[color:var(--border-default)] shadow-lg"
                              alt={props.alt || 'Permission Matrix'}
                              style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                              loading="lazy"
                              onError={(e) => {
                                if (import.meta.env.DEV) console.debug('Help image failed to load:', src)
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </span>
                        )
                      },
                    }}
                  >
                  {markdownContent}
                </ReactMarkdown>
                          </ErrorBoundary>
                        ) : (
                          <div className="py-8 text-center text-[color:var(--text-muted)]">No content available</div>
                        )}
                      </Suspense>
                    </div>
                  </ErrorBoundary>
                ) : (
                  <div className="py-8 text-center text-[color:var(--text-muted)]">No content available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Help
