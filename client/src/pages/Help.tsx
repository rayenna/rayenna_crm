import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { helpSections, HelpSection, getHelpSectionForRoute, getHelpContextLabel } from '../help/sections'
import { getHelpContent } from '../help/contentLoader'
import { searchHelpContent } from '../help/searchHelp'
import HelpSidebar from '../components/help/HelpSidebar'
import ErrorBoundary from '../components/ErrorBoundary'
import PageCard from '../components/PageCard'
import { FaBook } from 'react-icons/fa'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing help content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-0 py-6 sm:px-0">
      <PageCard
        title="Help"
        subtitle="Documentation and guidance for using the CRM"
        icon={<FaBook className="w-5 h-5 text-white" />}
        className="max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-6 gap-y-8 lg:gap-y-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 min-h-0 space-y-4">
            {/* Search */}
            <div className="rounded-2xl border border-primary-100/90 bg-white shadow-md overflow-hidden flex-shrink-0 ring-1 ring-primary-50/80">
              <label htmlFor="help-search" className="sr-only">
                Search help
              </label>
              <input
                id="help-search"
                type="search"
                placeholder="Search help…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border-0 focus:ring-2 focus:ring-primary-500 focus:ring-inset placeholder-gray-400"
                aria-describedby={searchQuery.length > 0 ? 'help-search-results' : undefined}
              />
              {searchQuery.trim().length > 0 && (
                <div
                  id="help-search-results"
                  className="border-t border-primary-100 max-h-64 overflow-y-auto"
                  role="list"
                >
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No matches</p>
                  ) : (
                    searchResults.map((r) => (
                      <button
                        key={r.routeKey}
                        type="button"
                        onClick={() => handleSearchResultClick(r.routeKey)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50/80 border-b border-primary-50 last:border-b-0 transition-colors"
                        role="listitem"
                      >
                        <span className="font-medium text-primary-700 block">{r.sectionTitle}</span>
                        <span className="text-gray-600 line-clamp-2">{r.snippet}</span>
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

          {/* Right Content Area – clear separation from sidebar on portrait */}
          <div className="lg:col-span-3 pt-6 lg:pt-0 border-t border-primary-100 lg:border-t-0 lg:pl-1">
            <div className="rounded-2xl border-2 border-primary-200/45 bg-white shadow-lg shadow-primary-900/5 overflow-hidden backdrop-blur-sm">
              <div className="h-1.5 bg-gradient-to-r from-primary-600 via-indigo-500 to-amber-500" aria-hidden />
              <div className="bg-gradient-to-br from-white via-primary-50/20 to-indigo-50/15 px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
              {contextLabel && (
                <div className="mb-6 rounded-xl border border-sky-200/90 bg-gradient-to-r from-sky-50/95 to-indigo-50/50 px-4 py-3 text-sm text-sky-950 shadow-sm">
                  <span className="font-semibold text-indigo-900">Help for:</span>{' '}
                  <span className="font-bold text-gray-900">{contextLabel}</span>
                  {selectedSection && (
                    <span className="ml-1 text-indigo-800/90">
                      {' '}— <strong>{selectedSection.title}</strong> section
                    </span>
                  )}
                </div>
              )}
              {markdownContent ? (
                <ErrorBoundary
                  fallback={
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
                      <p className="font-semibold mb-2">Error rendering content</p>
                      <p className="text-sm">Please try refreshing the page.</p>
                    </div>
                  }
                >
                  <div className="max-w-none">
                    <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
                      {markdownContent && markdownContent.trim() ? (
                        <ErrorBoundary
                          fallback={
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
                              <p className="font-semibold mb-2">Error rendering content</p>
                              <p className="text-sm">The help content could not be displayed. Please try refreshing the page.</p>
                            </div>
                          }
                        >
                          <ReactMarkdown
                            key={selectedSection?.id ?? 'help'}
                            components={{
                      h1: ({ children, ...props }) => (
                        <h1
                          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 mb-6 mt-0 pb-4 border-b-2 border-primary-100/90"
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
                            className="scroll-mt-28 text-lg sm:text-xl font-bold text-gray-800 mb-4 mt-10 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200/90 bg-gradient-to-r from-white via-primary-50/45 to-indigo-50/35 px-4 py-3 shadow-sm ring-1 ring-gray-100/90"
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
                            className="scroll-mt-24 text-base sm:text-lg font-semibold text-indigo-950 mb-2 mt-7 border-l-4 border-indigo-400 pl-3"
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
                            className="scroll-mt-20 text-base font-semibold text-gray-800 mb-2 mt-5"
                            {...props}
                          >
                            {children}
                          </h4>
                        )
                      },
                      p: ({ ...props }) => (
                        <p className="text-gray-700 mb-4 leading-relaxed text-[15px]" {...props} />
                      ),
                      ul: ({ ...props }) => (
                        <ul
                          className="list-disc list-outside mb-5 space-y-2.5 text-gray-700 pl-5 text-[15px]"
                          {...props}
                        />
                      ),
                      ol: ({ ...props }) => (
                        <ol
                          className="list-decimal list-outside mb-5 space-y-2.5 text-gray-700 pl-5 text-[15px]"
                          {...props}
                        />
                      ),
                      li: ({ ...props }) => (
                        <li className="leading-relaxed pl-1 marker:text-primary-600" {...props} />
                      ),
                      strong: ({ ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                      hr: () => (
                        <hr className="my-8 border-0 h-px max-w-lg bg-gradient-to-r from-transparent via-primary-200 to-transparent mx-auto rounded-full" />
                      ),
                      code: ({ inline, ...props }: React.ComponentProps<'code'> & { inline?: boolean }) => {
                        if (inline) {
                          return (
                            <code
                              className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded-md text-sm font-mono border border-indigo-100/80"
                              {...props}
                            />
                          )
                        }
                        return (
                          <code
                            className="block bg-slate-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-sm font-mono mb-4 border border-slate-700 shadow-inner"
                            {...props}
                          />
                        )
                      },
                      pre: ({ ...props }) => (
                        <pre className="bg-slate-900 text-gray-100 p-4 rounded-xl overflow-x-auto mb-4 border border-slate-700 shadow-inner" {...props} />
                      ),
                      a: (props: React.ComponentProps<'a'>) => {
                        const href = props.href ?? ''
                        const linkClass =
                          'text-primary-600 hover:text-primary-800 font-medium underline decoration-primary-300 underline-offset-2 transition-colors'
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
                          ? 'bg-amber-50/95 border-amber-200 text-amber-950'
                          : isNote
                            ? 'bg-sky-50/95 border-sky-200 text-sky-950'
                            : 'bg-gray-50/95 border-gray-200 text-gray-800'
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
                        <div className="overflow-x-auto mb-6 rounded-xl border-2 border-indigo-100/90 shadow-md ring-1 ring-indigo-50/60 bg-white">
                          <table
                            className="min-w-full border-collapse text-[13px] sm:text-sm"
                            {...props}
                          />
                        </div>
                      ),
                      thead: ({ ...props }) => (
                        <thead className="bg-gradient-to-r from-indigo-600 to-primary-600 text-white" {...props} />
                      ),
                      th: ({ ...props }) => (
                        <th
                          className="px-3 sm:px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-white border-b border-white/20"
                          {...props}
                        />
                      ),
                      tbody: ({ ...props }) => <tbody className="divide-y divide-gray-200 bg-white" {...props} />,
                      tr: ({ ...props }) => (
                        <tr className="even:bg-slate-50/80 hover:bg-primary-50/50 transition-colors" {...props} />
                      ),
                      td: ({ ...props }) => (
                        <td className="px-3 sm:px-4 py-3 text-gray-800 align-top leading-relaxed border-b border-gray-100 last:border-b-0" {...props} />
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
                          <div className="my-6 flex justify-center w-full">
                            <img
                              {...props}
                              src={src}
                              className="max-w-full h-auto rounded-lg shadow-lg border-2 border-gray-300 mx-auto"
                              alt={props.alt || 'Permission Matrix'}
                              style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                              loading="lazy"
                              onError={(e) => {
                                if (import.meta.env.DEV) console.error('Image failed to load:', src)
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )
                      },
                    }}
                  >
                  {markdownContent}
                </ReactMarkdown>
                        </ErrorBoundary>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No content available
                        </div>
                      )}
                    </Suspense>
                  </div>
                </ErrorBoundary>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No content available
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </PageCard>
    </div>
  )
}

export default Help
