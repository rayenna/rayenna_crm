import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import TipOfTheDay from './TipOfTheDay'
import { getHelpSectionForRoute, helpSections } from '../help/sections'
import { setSessionStorageItem } from '../lib/safeLocalStorage'

/** For `/help/analytics#foo`, `pathname` is `/help/analytics` and `hash` is `#foo`. */
function isHelpMenuPathActive(itemPath: string, pathname: string, locHash: string): boolean {
  const i = itemPath.indexOf('#')
  if (i === -1) return pathname === itemPath
  const pathOnly = itemPath.slice(0, i)
  const frag = itemPath.slice(i)
  if (pathname !== pathOnly) return false
  return locHash === frag
}

/** Keyboard Ctrl/Cmd+Shift shortcuts — same access as main nav / buttons */
const SHORTCUT_ROLES_CUSTOMERS_PROJECTS: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
  UserRole.MANAGEMENT,
]
const SHORTCUT_ROLES_SUPPORT: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.OPERATIONS,
  UserRole.MANAGEMENT,
]
const SHORTCUT_ROLES_NEW_CUSTOMER: UserRole[] = [UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN]
const SHORTCUT_ROLES_NEW_PROJECT: UserRole[] = [UserRole.ADMIN, UserRole.SALES]

const Layout = () => {
  const { user, logout, hasRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [helpDropdownOpen, setHelpDropdownOpen] = useState(false)
  const [dashboardDropdownOpen, setDashboardDropdownOpen] = useState(false)
  const helpDropdownRef = useRef<HTMLDivElement>(null)
  const dashboardDropdownRef = useRef<HTMLDivElement>(null)

  const dashboardNavRoles = [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT]

  const navigation = [
    { name: 'Customers', path: '/customers', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Projects', path: '/projects', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Support Tickets', path: '/support-tickets', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.MANAGEMENT] },
    { name: 'Tally Export', path: '/tally-export', roles: [UserRole.ADMIN, UserRole.FINANCE] },
    { name: 'Users', path: '/users', roles: [UserRole.ADMIN] },
    { name: 'Audit & Security', path: '/audit-security', roles: [UserRole.ADMIN] },
  ]

  const filteredNav = navigation.filter((nav) => hasRole(nav.roles))
  
  const helpMenuItems: (
    | { name: string; contextHelp: true }
    | { name: string; path: string; openTip?: boolean }
  )[] = [
    { name: 'Help (?)', contextHelp: true },
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
  const isDashboardMenuActive =
    location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/zenith')
  const canAccessDashboardMenu = hasRole(dashboardNavRoles)

  /** Context-sensitive Help path: open the section that matches the current page */
  const getHelpPath = useCallback(() => {
    const sectionId = getHelpSectionForRoute(location.pathname)
    const section = helpSections.find((s) => s.id === sectionId)
    if (!section) return '/help'
    if (location.pathname.startsWith('/zenith')) {
      return `/help/${section.routeKey}#zenith-command-center`
    }
    return `/help/${section.routeKey}`
  }, [location.pathname])

  const openHelp = () => {
    setSessionStorageItem('helpReferrer', location.pathname)
    navigate(getHelpPath())
    setHelpDropdownOpen(false)
  }

  // Keyboard: ? → Help · Ctrl/Cmd+Shift+ D C P K Z M E → routes (see help docs) · Esc → leave Help
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null

      const isQuestionMark = event.key === '?' || (event.key === '/' && event.shiftKey)
      if (isQuestionMark && !isInputFocused && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (!location.pathname.startsWith('/help')) {
          event.preventDefault()
          setSessionStorageItem('helpReferrer', location.pathname)
          navigate(getHelpPath())
        }
        return
      }

      const mod = event.ctrlKey || event.metaKey
      const isModShiftLetter =
        mod && event.shiftKey && !event.altKey && event.key.length === 1 && !isInputFocused

      if (isModShiftLetter) {
        const key = event.key.toLowerCase()
        const closeMenus = () => {
          setMobileMenuOpen(false)
          setDashboardDropdownOpen(false)
        }
        const go = (to: string) => {
          event.preventDefault()
          navigate(to)
          closeMenus()
        }

        if (key === 'd') {
          go('/dashboard')
          return
        }
        if (key === 'c' && hasRole(SHORTCUT_ROLES_CUSTOMERS_PROJECTS)) {
          go('/customers')
          return
        }
        if (key === 'p' && hasRole(SHORTCUT_ROLES_CUSTOMERS_PROJECTS)) {
          go('/projects')
          return
        }
        if (key === 'k' && hasRole(SHORTCUT_ROLES_SUPPORT)) {
          go('/support-tickets')
          return
        }
        if (key === 'z' && canAccessDashboardMenu) {
          go('/zenith')
          return
        }
        if (key === 'm' && hasRole(SHORTCUT_ROLES_NEW_CUSTOMER)) {
          go('/customers?new=1')
          return
        }
        if (key === 'e' && hasRole(SHORTCUT_ROLES_NEW_PROJECT)) {
          go('/projects/new')
          return
        }
      }

      if (event.key === 'Escape' && location.pathname.startsWith('/help')) {
        event.preventDefault()
        navigate('/dashboard')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [location.pathname, navigate, canAccessDashboardMenu, hasRole, getHelpPath])

  // Prefetch route chunks when mobile menu opens so navigation feels instant when user taps a link
  useEffect(() => {
    if (!mobileMenuOpen) return
    const run = () => {
      // Prefetch only the most common next navigations to avoid a big JS parse/compile spike.
      import('../pages/Projects').catch(() => {})
      import('../pages/CustomerMaster').catch(() => {})
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => void }
    const ric = w.requestIdleCallback
    if (ric) {
      ric(run)
      return
    }
    const t = window.setTimeout(run, 250)
    return () => window.clearTimeout(t)
  }, [mobileMenuOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(event.target as Node)) {
        setHelpDropdownOpen(false)
      }
      if (dashboardDropdownRef.current && !dashboardDropdownRef.current.contains(event.target as Node)) {
        setDashboardDropdownOpen(false)
      }
    }

    if (helpDropdownOpen || dashboardDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [helpDropdownOpen, dashboardDropdownOpen])

  return (
    <div className="min-h-screen bg-gray-50/80">
      <nav className="bg-gradient-to-r from-primary-600 via-primary-500 to-yellow-500 shadow-lg border-b-4 border-primary-400">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex justify-between items-center h-20 gap-2 lg:gap-4">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center mr-2 lg:mr-3 xl:mr-4 hover:opacity-80 transition-opacity">
                <img 
                  src="/CRM_Logo.jpg" 
                  alt="Rayenna CRM" 
                  className="h-14 sm:h-14 xl:h-16 2xl:h-[4.25rem] w-auto object-contain"
                />
              </Link>
              {/* Desktop Navigation - lg and above; also visible in mobile landscape (left-side nav + Help) */}
              <div className="hidden lg:ml-4 lg:flex lg:space-x-2 xl:space-x-3 2xl:space-x-4 items-center flex-wrap lg:gap-1.5 xl:gap-0 landscape-nav-visible">
                {canAccessDashboardMenu && (
                  <div
                    ref={dashboardDropdownRef}
                    className="relative"
                    onMouseEnter={() => setDashboardDropdownOpen(true)}
                    onMouseLeave={() => setDashboardDropdownOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setDashboardDropdownOpen(!dashboardDropdownOpen)}
                      className={`inline-flex items-center px-3 xl:px-3 2xl:px-4 py-2 xl:py-2.5 rounded-lg xl:rounded-xl text-xs xl:text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                        isDashboardMenuActive
                          ? 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40'
                          : 'text-white/95 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      Dashboard
                      <svg
                        className={`ml-1 h-3 w-3 xl:h-4 xl:w-4 transition-transform ${dashboardDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {dashboardDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]">
                        <Link
                          to="/dashboard"
                          className={`block px-4 py-2 text-sm font-medium ${
                            location.pathname.startsWith('/dashboard')
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                          }`}
                          onClick={() => setDashboardDropdownOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/zenith"
                          title="Zenith — Ctrl+Shift+Z or ⌘⇧Z"
                          className={`block px-4 py-2 text-sm font-medium ${
                            location.pathname.startsWith('/zenith')
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                          }`}
                          onClick={() => setDashboardDropdownOpen(false)}
                        >
                          Zenith ✦
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                {filteredNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-3 xl:px-3 2xl:px-4 py-2 xl:py-2.5 rounded-lg xl:rounded-xl text-xs xl:text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                      location.pathname.startsWith(item.path)
                        ? 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40'
                        : 'text-white/95 hover:bg-white/20 hover:text-white'
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
                    className={`inline-flex items-center px-3 xl:px-3 2xl:px-4 py-2 xl:py-2.5 rounded-lg xl:rounded-xl text-xs xl:text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                      isHelpActive
                        ? 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40'
                        : 'text-white/95 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    Help
                    <svg className={`ml-1 h-3 w-3 xl:h-4 xl:w-4 transition-transform ${helpDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {helpDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 min-w-[11rem] w-max max-w-[min(100vw,15rem)] bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]">
                      {helpMenuItems.map((item) =>
                        'openTip' in item && item.openTip ? (
                          <button
                            key={item.name}
                            type="button"
                            onClick={openTipOfTheDay}
                            className="block w-full text-left px-4 py-2 text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                          >
                            {item.name}
                          </button>
                        ) : 'contextHelp' in item && item.contextHelp ? (
                          <button
                            key={item.name}
                            type="button"
                            onClick={openHelp}
                            className={`block w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                              isHelpActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                            }`}
                          >
                            {item.name}
                          </button>
                        ) : 'path' in item && item.path.startsWith('/help/') ? (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setHelpDropdownOpen(false)}
                            className={`block px-4 py-2 text-sm font-medium transition-colors ${
                              isHelpMenuPathActive(item.path, location.pathname, location.hash)
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                            }`}
                          >
                            {item.name}
                          </Link>
                        ) : 'path' in item ? (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setHelpDropdownOpen(false)}
                            className={`block px-4 py-2 text-sm font-medium transition-colors ${
                              location.pathname.startsWith(item.path.split('?')[0] ?? item.path)
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                            }`}
                          >
                            {item.name}
                          </Link>
                        ) : null
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
                className="hidden lg:inline text-xs xl:text-sm text-white font-semibold hover:text-white hover:bg-white/20 px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg xl:rounded-xl transition-colors duration-200 shadow-sm border-2 border-white/20 hover:border-white/40 whitespace-nowrap"
              >
                Change Password
              </Link>
              <button
                onClick={logout}
                className="hidden lg:inline text-xs xl:text-sm text-white font-semibold hover:text-white hover:bg-white/20 px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg xl:rounded-xl transition-colors duration-200 shadow-sm border-2 border-white/20 hover:border-white/40 whitespace-nowrap"
              >
                Logout
              </button>
              {/* Hamburger menu - below lg (includes iPad portrait) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden ml-2 inline-flex items-center justify-center p-2 rounded-xl text-white hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors duration-200 border-2 border-white/20"
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
          {/* Mobile/Tablet menu - below lg; scrollable so Help is reachable in landscape */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 pt-2 max-h-[min(85vh,400px)] overflow-y-auto overflow-x-hidden overscroll-contain mobile-menu-scroll">
              <div className="space-y-2">
                {canAccessDashboardMenu && (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                        location.pathname.startsWith('/dashboard')
                          ? 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40'
                          : 'text-white/95 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/zenith"
                      title="Zenith — Ctrl+Shift+Z or ⌘⇧Z"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                        location.pathname.startsWith('/zenith')
                          ? 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40'
                          : 'text-white/95 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      Zenith ✦
                    </Link>
                  </>
                )}
                {filteredNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                      location.pathname.startsWith(item.path)
                        ? 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40'
                        : 'text-white/95 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                {/* Help Menu Items for Mobile */}
                {helpMenuItems.map((item) =>
                  'openTip' in item && item.openTip ? (
                    <button
                      key={item.name}
                      type="button"
                      onClick={openTipOfTheDay}
                      className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 text-white/95 hover:bg-white/20 hover:text-white"
                    >
                      {item.name}
                    </button>
                  ) : 'contextHelp' in item && item.contextHelp ? (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        openHelp()
                      }}
                      className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                        isHelpActive ? 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40' : 'text-white/95 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      {item.name}
                    </button>
                  ) : 'path' in item && item.path.startsWith('/help/') ? (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                        isHelpMenuPathActive(item.path, location.pathname, location.hash)
                          ? 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40'
                          : 'text-white/95 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ) : 'path' in item ? (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                        location.pathname.startsWith(item.path.split('?')[0] ?? item.path)
                          ? 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40'
                          : 'text-white/95 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ) : null
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
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-white/95 hover:bg-white/20 hover:text-white transition-colors duration-200"
                  >
                    Change Password
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      logout()
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-white/95 hover:bg-white/20 hover:text-white transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Zenith: avoid overflow-x clip/hidden on main — CSS pairs it with overflow-y: auto and breaks document scroll in Chrome/Edge */}
      <main
        className={
          location.pathname.startsWith('/zenith')
            ? 'w-full max-w-none mx-auto py-0 px-0'
            : 'max-w-7xl mx-auto py-6 px-2 sm:px-4 md:px-6 lg:px-8'
        }
      >
        <Outlet />
      </main>

      <TipOfTheDay />
    </div>
  )
}

export default Layout
