import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { helpSections, HelpSection, getHelpSectionForRoute } from '../help/sections'
import HelpSidebar from '../components/help/HelpSidebar'

const Help = () => {
  const { section } = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [markdownContent, setMarkdownContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [selectedSection, setSelectedSection] = useState<HelpSection | null>(null)
  const sectionInitialized = useRef(false)
  const locationStateRef = useRef(location.state)

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

  // Determine current section - context-sensitive or explicit
  useEffect(() => {
    let currentSection: HelpSection | null = null

    // If explicit section in URL, use it
    if (section) {
      currentSection = helpSections.find(s => s.routeKey === section) || null
    } else if (!sectionInitialized.current) {
      // Only do context-sensitive detection on first load (not on hard refresh)
      // Context-sensitive: detect route from referrer or document.referrer
      let referrerPath = sessionStorage.getItem('helpReferrer')
      
      // If no stored referrer, try to get from browser history or document referrer
      if (!referrerPath) {
        // Try to extract from document.referrer if available
        try {
          const referrerUrl = document.referrer
          if (referrerUrl) {
            const url = new URL(referrerUrl)
            referrerPath = url.pathname
          }
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Also check location state (safely) - use ref to avoid stale closures
      locationStateRef.current = location.state
      if (!referrerPath && locationStateRef.current && typeof locationStateRef.current === 'object' && 'from' in locationStateRef.current) {
        const stateFrom = (locationStateRef.current as any).from
        if (stateFrom && stateFrom.pathname) {
          referrerPath = stateFrom.pathname
        }
      }
      
      if (referrerPath) {
        const contextSectionId = getHelpSectionForRoute(referrerPath)
        currentSection = helpSections.find(s => s.id === contextSectionId) || null
        // Clear referrer after use
        sessionStorage.removeItem('helpReferrer')
      }
    }

    // Fallback to getting started
    if (!currentSection) {
      currentSection = helpSections.find(s => s.id === 'getting-started') || helpSections[0]
    }
    
    // Update section if it changed
    setSelectedSection(currentSection)
    sectionInitialized.current = true
  }, [section]) // Only depend on section param, not location.state to prevent loops

  // Load markdown content
  useEffect(() => {
    if (!selectedSection) {
      setLoading(false)
      return
    }

    let cancelled = false

    const loadMarkdown = async () => {
      setLoading(true)
      try {
        // Load markdown from public folder
        const response = await fetch(selectedSection.markdownPath, {
          cache: 'no-cache' // Prevent caching issues on hard refresh
        })
        if (cancelled) return
        
        if (response.ok) {
          const content = await response.text()
          if (!cancelled) {
            setMarkdownContent(content)
          }
        } else {
          // Fallback to placeholder content if file doesn't exist
          if (!cancelled) {
            setMarkdownContent(`# ${selectedSection.title}\n\nContent for ${selectedSection.title} is coming soon.`)
          }
        }
      } catch (error) {
        console.error('Error loading markdown:', error)
        // Fallback to placeholder content
        if (!cancelled) {
          setMarkdownContent(`# ${selectedSection.title}\n\nContent for ${selectedSection.title} is coming soon.`)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMarkdown()
    
    return () => {
      cancelled = true
    }
  }, [selectedSection])

  const handleSectionSelect = (section: HelpSection) => {
    navigate(`/help/${section.routeKey}`)
  }

  // Safety check - ensure we have a section before rendering
  if (!selectedSection && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading help content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:p-8">
              {loading || !selectedSection ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600">Loading content...</span>
                </div>
              ) : (
                <div className="max-w-none">
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
                          // Extract section key, removing /help/ prefix and any query params or trailing slashes
                          const sectionKey = href
                            .replace('/help/', '')
                            .split('?')[0] // Remove query params
                            .split('#')[0] // Remove hash
                            .replace(/\/$/, '') // Remove trailing slash
                          
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
                        // Handle image paths - ensure they're properly resolved
                        let src = props.src || ''
                        // If it's a relative path (doesn't start with /, http, or //), resolve it
                        if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('/')) {
                          // Relative path - resolve based on current markdown file location
                          const currentPath = selectedSection?.markdownPath || ''
                          const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'))
                          src = `${basePath}/${src}`
                        }
                        // Ensure absolute paths from public folder work correctly
                        // Paths starting with / are served from public folder root
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
                                // Use React-safe approach - just hide the image
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
