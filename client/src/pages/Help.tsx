import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { helpSections, HelpSection, getHelpSectionForRoute, getHelpContextLabel } from '../help/sections'
import { getHelpContent } from '../help/contentLoader'
import { searchHelpContent } from '../help/searchHelp'
import HelpSidebar from '../components/help/HelpSidebar'
import ErrorBoundary from '../components/ErrorBoundary'

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
        } catch (_) {}
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
        console.warn('Error accessing sessionStorage:', e)
      }

      helpContextPathRef.current = null
      return helpSections.find(s => s.id === 'getting-started') || helpSections[0] || null
    } catch (error) {
      console.error('Error determining section:', error)
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50/50 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 min-h-[400px] space-y-4">
            {/* Search */}
            <div className="rounded-xl border border-sky-100/80 bg-white shadow-sm overflow-hidden">
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
                  className="border-t border-sky-100 max-h-64 overflow-y-auto"
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
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-sky-50/80 border-b border-sky-50 last:border-b-0 transition-colors"
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

          {/* Right Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-white to-sky-50/30 rounded-xl shadow-sm border-l-4 border-l-sky-400 border border-sky-100/60 p-6 lg:p-8">
              {contextLabel && (
                <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/80 px-4 py-2.5 text-sm text-sky-800">
                  <span className="font-medium">Help for:</span>{' '}
                  <span className="font-semibold">{contextLabel}</span>
                  {selectedSection && (
                    <span className="ml-1 text-sky-600">
                      {' '}— you're in the <strong>{selectedSection.title}</strong> section
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
                      h1: ({ node, ...props }) => (
                        <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-6 first:mt-0" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-2xl font-semibold text-gray-800 mb-3 mt-6" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-xl font-semibold text-gray-700 mb-2 mt-4" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-lg font-medium text-gray-700 mb-2 mt-3" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-gray-700 mb-4 leading-relaxed" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="ml-4" {...props} />
                      ),
                      code: ({ node, inline, ...props }: any) => {
                        if (inline) {
                          return (
                            <code className="bg-gray-100 text-primary-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                          )
                        }
                        return (
                          <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4" {...props} />
                        )
                      },
                      pre: ({ node, ...props }) => (
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
                      ),
                      a: ({ node, ...props }: any) => {
                        const href = props.href
                        // Intercept help links and navigate within the Help component
                        if (href && href.startsWith('/help/')) {
                          const sectionKey = href
                            .replace('/help/', '')
                            .split('?')[0]
                            .split('#')[0]
                            .replace(/\/$/, '')
                          
                          const targetSection = helpSections.find(s => s.routeKey === sectionKey)
                          
                          if (targetSection) {
                            return (
                              <a
                                {...props}
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleSectionSelect(targetSection)
                                }}
                                className="text-primary-600 hover:text-primary-700 underline cursor-pointer"
                              />
                            )
                          }
                        }
                        // External links open in new tab
                        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                          return (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 underline"
                            />
                          )
                        }
                        // Regular links
                        return (
                          <a className="text-primary-600 hover:text-primary-700 underline" {...props} />
                        )
                      },
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-primary-500 pl-4 italic text-gray-600 my-4" {...props} />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto mb-4">
                          <table className="min-w-full divide-y divide-gray-200 border border-gray-300" {...props} />
                        </div>
                      ),
                      thead: ({ node, ...props }) => (
                        <thead className="bg-gray-50" {...props} />
                      ),
                      th: ({ node, ...props }) => (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200" {...props} />
                      ),
                      img: ({ node, ...props }: any) => {
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
                                console.error('Image failed to load:', src)
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
    </div>
  )
}

export default Help
