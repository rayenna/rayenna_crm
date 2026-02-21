import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import TipOfTheDay from './TipOfTheDay'
import { getHelpSectionForRoute, helpSections } from '../help/sections'

const Layout = () => {
  const { user, logout, hasRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [helpDropdownOpen, setHelpDropdownOpen] = useState(false)
  const helpDropdownRef = useRef<HTMLDivElement>(null)

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Customers', path: '/customers', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Projects', path: '/projects', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Support Tickets', path: '/support-tickets', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.MANAGEMENT] },
    { name: 'Tally Export', path: '/tally-export', roles: [UserRole.ADMIN, UserRole.FINANCE] },
    { name: 'Users', path: '/users', roles: [UserRole.ADMIN] },
    { name: 'Audit & Security', path: '/audit-security', roles: [UserRole.ADMIN] },
  ]

  const filteredNav = navigation.filter((nav) => hasRole(nav.roles))
  
  // Help menu items - visible to all logged-in users
  const helpMenuItems = [
    { name: 'Help (?)', path: '/help' },
    { name: 'About', path: '/about' },
    { name: 'Tip of the Day', path: '/dashboard?showTip=1', openTip: true },
  ]

  const openTipOfTheDay = () => {
    const params = new URLSearchParams(location.search)
    params.set('showTip', '1')
    navigate({ pathname: location.pathname, search: params.toString() })
    setHelpDropdownOpen(false)
    setMobileMenuOpen(false)
  }
  
  const isHelpActive = location.pathname.startsWith('/help') || location.pathname.startsWith('/about')

  /** Context-sensitive Help path: open the section that matches the current page */
  const getHelpPath = () => {
    const sectionId = getHelpSectionForRoute(location.pathname)
    const section = helpSections.find((s) => s.id === sectionId)
    return section ? `/help/${section.routeKey}` : '/help'
  }

  const openHelp = () => {
    sessionStorage.setItem('helpReferrer', location.pathname)
    navigate(getHelpPath())
    setHelpDropdownOpen(false)
  }

  // Keyboard shortcuts: ? to open Help, Esc to close Help
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or contenteditable element
      const target = event.target as HTMLElement
      const isInputFocused = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null

      // ? key to open Help (only if not typing in an input)
      const isQuestionMark = event.key === '?' || (event.key === '/' && event.shiftKey)
      if (isQuestionMark && !isInputFocused && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (!location.pathname.startsWith('/help')) {
          event.preventDefault()
          sessionStorage.setItem('helpReferrer', location.pathname)
          navigate(getHelpPath())
        }
      }

      // Esc key to close Help (only if on help page)
      if (event.key === 'Escape' && location.pathname.startsWith('/help')) {
        event.preventDefault()
        navigate('/dashboard')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [location.pathname, navigate])

  // Prefetch route chunks when mobile menu opens so navigation feels instant when user taps a link
  useEffect(() => {
    if (!mobileMenuOpen) return
    import('../pages/Dashboard').catch(() => {})
    import('../pages/Projects').catch(() => {})
    import('../pages/CustomerMaster').catch(() => {})
    import('../pages/SupportTicketsDashboard').catch(() => {})
    import('../pages/TallyExport').catch(() => {})
    import('../pages/Users').catch(() => {})
    import('../pages/AuditSecurity').catch(() => {})
    import('../pages/ProjectForm').catch(() => {})
    import('../pages/ProjectDetail').catch(() => {})
    import('../pages/Help').catch(() => {})
    import('../pages/About').catch(() => {})
    import('../pages/ChangePassword').catch(() => {})
  }, [mobileMenuOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(event.target as Node)) {
        setHelpDropdownOpen(false)
      }
    }

    if (helpDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [helpDropdownOpen])

  return (
    <div className="min-h-screen bg-gray-50/80">
      <nav className="bg-gradient-to-r from-primary-600 via-primary-500 to-yellow-500 shadow-2xl border-b-4 border-primary-400 relative">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 relative z-10">
          <div className="flex justify-between items-center h-20 gap-2 lg:gap-4">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center mr-2 lg:mr-3 xl:mr-4 hover:opacity-80 transition-opacity">
                <img 
                  src="/rayenna_logo.jpg" 
                  alt="Rayenna Energy Logo" 
                  className="h-12 xl:h-[3.6rem] w-auto"
                />
              </Link>
              {/* Desktop Navigation - lg and above only; iPad portrait uses hamburger */}
              <div className="hidden lg:ml-4 lg:flex lg:space-x-2 xl:space-x-3 2xl:space-x-4 items-center flex-wrap lg:gap-1.5 xl:gap-0">
                {filteredNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-3 xl:px-3 2xl:px-4 py-2 xl:py-2.5 rounded-lg xl:rounded-xl text-xs xl:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                      location.pathname.startsWith(item.path)
                        ? 'bg-white/25 text-white shadow-xl xl:shadow-2xl font-bold backdrop-blur-md border-2 border-white/30'
                        : 'text-white/95 hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Help Dropdown Menu */}
                <div 
                  ref={helpDropdownRef}
                  className="relative"
                  onMouseEnter={() => setHelpDropdownOpen(true)}
                  onMouseLeave={() => setHelpDropdownOpen(false)}
                >
                  <button
                    onClick={() => setHelpDropdownOpen(!helpDropdownOpen)}
                    className={`inline-flex items-center px-3 xl:px-3 2xl:px-4 py-2 xl:py-2.5 rounded-lg xl:rounded-xl text-xs xl:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                      isHelpActive
                        ? 'bg-white/25 text-white shadow-xl xl:shadow-2xl font-bold backdrop-blur-md border-2 border-white/30'
                        : 'text-white/95 hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm'
                    }`}
                  >
                    Help
                    <svg className={`ml-1 h-3 w-3 xl:h-4 xl:w-4 transition-transform ${helpDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {helpDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]">
                      {helpMenuItems.map((item) =>
                        item.openTip ? (
                          <button
                            key={item.path}
                            type="button"
                            onClick={openTipOfTheDay}
                            className="block w-full text-left px-4 py-2 text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                          >
                            {item.name}
                          </button>
                        ) : item.path.startsWith('/help') ? (
                          <button
                            key={item.path}
                            type="button"
                            onClick={openHelp}
                            className={`block w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                              isHelpActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                            }`}
                          >
                            {item.name}
                          </button>
                        ) : (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setHelpDropdownOpen(false)}
                            className={`block px-4 py-2 text-sm font-medium transition-colors ${
                              location.pathname.startsWith(item.path)
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                            }`}
                          >
                            {item.name}
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-2.5 xl:space-x-3 flex-shrink-0">
              {/* User name next to hamburger when in mobile/tablet view (md up to lg) */}
              <span className="hidden md:inline lg:hidden text-sm text-white/90 font-medium truncate max-w-[100px]">{user?.name}</span>
              <span className="hidden lg:inline text-xs xl:text-sm text-white/90 font-medium truncate max-w-[120px] xl:max-w-none">{user?.name}</span>
              <span className="hidden lg:inline text-xs text-primary-700 bg-gradient-to-r from-white to-primary-50 px-2 xl:px-3 py-1.5 xl:py-2 rounded-full font-bold shadow-lg border-2 border-white/50">
                {user?.role}
              </span>
              <Link
                to="/change-password"
                className="hidden lg:inline text-xs xl:text-sm text-white font-semibold hover:text-white hover:bg-white/20 px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg xl:rounded-xl transition-all duration-300 shadow-md hover:shadow-lg border-2 border-white/20 hover:border-white/40 whitespace-nowrap"
              >
                Change Password
              </Link>
              <button
                onClick={logout}
                className="hidden lg:inline text-xs xl:text-sm text-white font-semibold hover:text-white hover:bg-white/20 px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg xl:rounded-xl transition-all duration-300 shadow-md hover:shadow-lg border-2 border-white/20 hover:border-white/40 whitespace-nowrap"
              >
                Logout
              </button>
              {/* Hamburger menu - below lg (includes iPad portrait) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden ml-2 inline-flex items-center justify-center p-2 rounded-xl text-white hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 border-2 border-white/20"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {/* Mobile/Tablet menu - below lg (iPad portrait uses hamburger) */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 pt-2">
              <div className="space-y-2">
                {filteredNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      location.pathname.startsWith(item.path)
                        ? 'bg-white/25 text-white shadow-2xl font-bold backdrop-blur-md border-2 border-white/30'
                        : 'text-white/95 hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                {/* Help Menu Items for Mobile */}
                {helpMenuItems.map((item) =>
                  item.openTip ? (
                    <button
                      key={item.path}
                      type="button"
                      onClick={openTipOfTheDay}
                      className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-white/95 hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm"
                    >
                      {item.name}
                    </button>
                  ) : item.path.startsWith('/help') ? (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        openHelp()
                      }}
                      className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                        isHelpActive ? 'bg-white/25 text-white shadow-2xl font-bold backdrop-blur-md border-2 border-white/30' : 'text-white/95 hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm'
                      }`}
                    >
                      {item.name}
                    </button>
                  ) : (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                        location.pathname.startsWith(item.path)
                          ? 'bg-white/25 text-white shadow-2xl font-bold backdrop-blur-md border-2 border-white/30'
                          : 'text-white/95 hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )
                )}
                {/* Mobile user info and actions */}
                <div className="mt-4 pt-4 border-t border-white/20 px-4 space-y-2">
                  <div className="text-sm text-white/90 font-medium mb-2">{user?.name}</div>
                  <div className="text-xs text-primary-700 bg-gradient-to-r from-white to-primary-50 px-3 py-1 rounded-full font-bold inline-block border-2 border-white/50">
                    {user?.role}
                  </div>
                  <Link
                    to="/change-password"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-white/95 hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm"
                  >
                    Change Password
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      logout()
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-white/95 hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-2 sm:px-4 md:px-6 lg:px-8">
        <Outlet />
      </main>

      <TipOfTheDay />
    </div>
  )
}

export default Layout
