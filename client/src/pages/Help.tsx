import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { helpSections, HelpSection, getHelpSectionForRoute } from '../help/sections'
import HelpSidebar from '../components/help/HelpSidebar'
import ErrorBoundary from '../components/ErrorBoundary'

const Help = () => {
  const { section } = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const [markdownContent, setMarkdownContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)

  // Determine current section - simplified and safe for hard refresh
  const selectedSection = useMemo(() => {
    try {
      // If explicit section in URL, use it
      if (section) {
        const found = helpSections.find(s => s.routeKey === section)
        if (found) return found
      }
      
      // On hard refresh without section param, default to getting-started
      // Only do context-sensitive detection if we have a referrer stored
      try {
        const referrerPath = sessionStorage.getItem('helpReferrer')
        if (referrerPath) {
          const contextSectionId = getHelpSectionForRoute(referrerPath)
          const found = helpSections.find(s => s.id === contextSectionId)
          if (found) {
            sessionStorage.removeItem('helpReferrer')
            return found
          }
        }
      } catch (e) {
        // Ignore sessionStorage errors
        console.warn('Error accessing sessionStorage:', e)
      }
      
      // Fallback to getting started
      return helpSections.find(s => s.id === 'getting-started') || helpSections[0] || null
    } catch (error) {
      console.error('Error determining section:', error)
      return helpSections[0] || null
    }
  }, [section])

  // Sync URL to section so hard refresh preserves current help section (fix: losing formatting on hard refresh)
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

  // Load markdown content - simplified and safe
  useEffect(() => {
    if (!selectedSection) {
      setLoading(false)
      setMarkdownContent('')
      return
    }

    // Prevent multiple simultaneous loads
    if (loadingRef.current) return
    loadingRef.current = true

    let cancelled = false
    setLoading(true)
    setError(null)
    setMarkdownContent('') // Clear previous content

    const FETCH_TIMEOUT_MS = 25000 // 25s – accommodates iPad on slow networks
    let willRetry = false
    const loadMarkdown = async (retryCount = 0) => {
      willRetry = false
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

        const response = await fetch(selectedSection.markdownPath, {
          cache: 'default', // Allow browser cache – avoids repeat fetches on slow connections (e.g. iPad)
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (cancelled || !mountedRef.current) return

        if (response.ok) {
          const content = await response.text()
          if (!cancelled && mountedRef.current) {
            setMarkdownContent(content || `# ${selectedSection.title}\n\nContent for ${selectedSection.title} is coming soon.`)
            setError(null)
          }
        } else {
          if (!cancelled && mountedRef.current) {
            setMarkdownContent(`# ${selectedSection.title}\n\nContent for ${selectedSection.title} is coming soon.`)
            setError(null)
          }
        }
      } catch (err: any) {
        console.error('Error loading markdown:', err)
        if (!cancelled && mountedRef.current) {
          const isTimeout = err?.name === 'AbortError'
          if (isTimeout && retryCount < 1) {
            willRetry = true
            // Retry once – helps when first attempt times out (e.g. cold connection on iPad)
            setTimeout(() => loadMarkdown(retryCount + 1), 1500)
            return
          }
          if (isTimeout) {
            setError('Request timed out. Please try again.')
          } else {
            setError('Failed to load help content. Please try refreshing the page.')
          }
          setMarkdownContent(`# ${selectedSection.title}\n\nContent for ${selectedSection.title} is coming soon.`)
        }
      } finally {
        if (!cancelled && mountedRef.current && !willRetry) {
          setLoading(false)
          loadingRef.current = false
        }
      }
    }

    // Small delay to prevent race conditions on hard refresh
    const timeoutId = setTimeout(() => {
      loadMarkdown()
    }, 50)
    
    return () => {
      cancelled = true
      loadingRef.current = false
      clearTimeout(timeoutId)
    }
  }, [selectedSection?.id]) // Only depend on section ID to prevent unnecessary reloads

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleSectionSelect = (section: HelpSection) => {
    navigate(`/help/${section.routeKey}`)
  }

  // Render loading state
  if (loading && !markdownContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading help content...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error && !markdownContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

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
          <div className="lg:col-span-1 min-h-[400px]">
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
              {loading && !markdownContent ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600">Loading content...</span>
                </div>
              ) : markdownContent ? (
                <ErrorBoundary
                  fallback={
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
                      <p className="font-semibold mb-2">Error rendering content</p>
                      <p className="text-sm">Please try refreshing the page.</p>
                    </div>
                  }
                >
                  <div className="max-w-none">
                    {error && (
                      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                        {error}
                      </div>
                    )}
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
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600">Loading content...</span>
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
