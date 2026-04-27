import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import ThemeToggle from './ThemeToggle'
import TipOfTheDay from './TipOfTheDay'
import { getHelpSectionForRoute, getHelpHashForRoute, helpSections } from '../help/sections'
import { setSessionStorageItem } from '../lib/safeLocalStorage'
import '../styles/zenith.css'
import VictoryToast from './zenith/VictoryToast'
import { useVictoryToast } from '../hooks/useVictoryToast'

/** For `/help/dashboard#foo`, `pathname` is `/help/dashboard` and `hash` is `#foo`. */
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
  const { toast: victoryToast, dismiss: dismissVictoryToast } = useVictoryToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [helpDropdownOpen, setHelpDropdownOpen] = useState(false)
  const [dashboardDropdownOpen, setDashboardDropdownOpen] = useState(false)
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const helpDropdownRef = useRef<HTMLDivElement>(null)
  const dashboardDropdownRef = useRef<HTMLDivElement>(null)
  const moreDropdownRef = useRef<HTMLDivElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

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

  // Keep the header clean: show the 3 most-used links inline; push admin/secondary to "More".
  const PRIMARY_NAV_ORDER = ['/customers', '/projects', '/support-tickets'] as const
  const primaryNav = PRIMARY_NAV_ORDER
    .map((p) => filteredNav.find((n) => n.path === p))
    .filter(Boolean) as typeof filteredNav
  const secondaryNav = filteredNav.filter((n) => !PRIMARY_NAV_ORDER.includes(n.path as any))

  const initials = (name?: string | null) => {
    const parts = String(name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    if (!parts.length) return 'U'
    const a = parts[0]?.[0] ?? 'U'
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
    return (a + b).toUpperCase()
  }
  
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
  const isMoreActive = secondaryNav.some((n) => location.pathname.startsWith(n.path))

  /** Context-sensitive Help path: open the section that matches the current page */
  const getHelpPath = useCallback(() => {
    const sectionId = getHelpSectionForRoute(location.pathname)
    const section = helpSections.find((s) => s.id === sectionId)
    if (!section) return '/help'
    if (location.pathname.startsWith('/zenith')) {
      return `/help/zenith#zenith-command-center`
    }
    const moduleHash = sectionId === 'modules' ? getHelpHashForRoute(location.pathname) : null
    if (moduleHash) {
      return `/help/${section.routeKey}#${moduleHash}`
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

  // Below lg: hamburger only (all orientations) — avoids landscape cramming with inline nav + menus.
  useEffect(() => {
    setHelpDropdownOpen(false)
    setDashboardDropdownOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileMenuOpen])

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
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false)
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }

    if (helpDropdownOpen || dashboardDropdownOpen || moreDropdownOpen || profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [helpDropdownOpen, dashboardDropdownOpen, moreDropdownOpen, profileDropdownOpen])

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[color:var(--bg-page)] text-[color:var(--text-primary)] [-webkit-tap-highlight-color:transparent]">
      <nav className="sticky top-0 z-50 border-b border-[color:var(--nav-border)] bg-[color:var(--nav-bg)] pt-[env(safe-area-inset-top,0px)] shadow-lg shadow-black/40 ring-1 ring-[color:var(--nav-border)]">
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex min-h-[3.5rem] items-center justify-between gap-2 py-2 sm:min-h-[3.75rem] lg:h-20 lg:min-h-0 lg:gap-4 lg:py-0">
            <div className="flex min-w-0 flex-1 items-center">
              <Link to="/dashboard" className="mr-2 flex shrink-0 items-center lg:mr-3 xl:mr-4 hover:opacity-80 transition-opacity">
                <img 
                  src="/CRM_Logo.jpg" 
                  alt="Rayenna CRM" 
                  className="h-10 w-auto max-h-[2.75rem] object-contain sm:h-12 sm:max-h-none md:h-14 lg:h-14 xl:h-16 2xl:h-[4.25rem]"
                />
              </Link>
              {/* Desktop Navigation — lg+ (Windows scaling friendly); below lg use hamburger */}
              <div className="hidden min-w-0 flex-1 flex-nowrap items-center gap-2 lg:ml-4 lg:flex 2xl:gap-3">
                {canAccessDashboardMenu && (
                  <div
                    ref={dashboardDropdownRef}
                    className="relative shrink-0"
                    onMouseEnter={() => setDashboardDropdownOpen(true)}
                    onMouseLeave={() => setDashboardDropdownOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setDashboardDropdownOpen(!dashboardDropdownOpen)}
                      className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                        isDashboardMenuActive
                          ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                          : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
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
                      <div
                        className="absolute left-0 top-full z-[250] mt-1 flex w-52 min-w-[12rem] flex-col overflow-hidden rounded-xl border border-[color:var(--nav-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_92%,#ffffff_8%)] py-1 shadow-2xl shadow-black/60 ring-1 ring-black/40"
                        role="menu"
                        aria-label="Dashboard menu"
                      >
                        <Link
                          to="/dashboard"
                          role="menuitem"
                          className={`block px-4 py-2.5 text-sm font-medium ${
                            location.pathname.startsWith('/dashboard')
                              ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                              : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
                          }`}
                          onClick={() => setDashboardDropdownOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/zenith"
                          role="menuitem"
                          title="Zenith — Ctrl+Shift+Z or ⌘⇧Z"
                          className={`block px-4 py-2.5 text-sm font-medium ${
                            location.pathname.startsWith('/zenith')
                              ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                              : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
                          }`}
                          onClick={() => setDashboardDropdownOpen(false)}
                        >
                          Zenith ✦
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                {primaryNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex shrink-0 items-center px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                      location.pathname.startsWith(item.path)
                        ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                        : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}

                {/* More (secondary/admin) */}
                {secondaryNav.length ? (
                  <div
                    ref={moreDropdownRef}
                    className="relative shrink-0"
                    onMouseEnter={() => setMoreDropdownOpen(true)}
                    onMouseLeave={() => setMoreDropdownOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setMoreDropdownOpen((v) => !v)}
                      className={`inline-flex shrink-0 items-center px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                        isMoreActive
                          ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                          : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
                      }`}
                      aria-expanded={moreDropdownOpen}
                      aria-label="More menu"
                    >
                      More
                      <svg className={`ml-1 h-4 w-4 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {moreDropdownOpen ? (
                      <div
                        className="absolute left-0 top-full z-[250] mt-1 flex w-56 min-w-[12rem] flex-col overflow-hidden rounded-xl border border-[color:var(--nav-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_92%,#ffffff_8%)] py-1 shadow-2xl shadow-black/60 ring-1 ring-black/40"
                        role="menu"
                        aria-label="More menu"
                      >
                        {secondaryNav.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            role="menuitem"
                            className={`block px-4 py-2.5 text-sm font-medium ${
                              location.pathname.startsWith(item.path)
                                ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                                : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
                            }`}
                            onClick={() => setMoreDropdownOpen(false)}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                
                {/* Help Dropdown Menu */}
                <div 
                  ref={helpDropdownRef}
                  className="relative shrink-0"
                  onMouseEnter={() => setHelpDropdownOpen(true)}
                  onMouseLeave={() => setHelpDropdownOpen(false)}
                >
                  <button
                    onClick={() => setHelpDropdownOpen(!helpDropdownOpen)}
                    className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                      isHelpActive
                        ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                        : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
                    }`}
                  >
                    Help
                    <svg className={`ml-1 h-3 w-3 xl:h-4 xl:w-4 transition-transform ${helpDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {helpDropdownOpen && (
                    <div
                      className="absolute left-0 top-full z-[250] mt-1 flex min-w-[12rem] w-max max-w-[min(100vw,16rem)] flex-col overflow-hidden rounded-xl border border-[color:var(--nav-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_92%,#ffffff_8%)] py-1 shadow-2xl shadow-black/60 ring-1 ring-black/40"
                      role="menu"
                      aria-label="Help menu"
                    >
                      {helpMenuItems.map((item) =>
                        'openTip' in item && item.openTip ? (
                          <button
                            key={item.name}
                            type="button"
                            onClick={openTipOfTheDay}
                            className="block w-full px-4 py-2 text-left text-sm font-medium text-[color:var(--nav-text)] transition-colors hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]"
                          >
                            {item.name}
                          </button>
                        ) : 'contextHelp' in item && item.contextHelp ? (
                          <button
                            key={item.name}
                            type="button"
                            onClick={openHelp}
                            className={`block w-full px-4 py-2 text-left text-sm font-medium transition-colors ${
                              isHelpActive
                                ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                                : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
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
                                ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                                : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
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
                                ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                                : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
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
            <div className="flex shrink-0 items-center space-x-1.5 sm:space-x-2">
              {/* User name next to hamburger when in mobile/tablet view (md up to lg) */}
              <span className="hidden max-w-[min(7rem,28vw)] truncate text-sm font-medium text-[color:var(--nav-text-hover)] md:inline lg:hidden">
                {user?.name}
              </span>

              {/* Profile menu — lg+; consolidates role + theme + actions */}
              <div ref={profileDropdownRef} className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--nav-border)] bg-[color:var(--nav-active-bg)] px-2.5 py-2 text-sm font-semibold text-[color:var(--nav-text-hover)] shadow-sm transition-colors hover:brightness-105"
                  aria-expanded={profileDropdownOpen}
                  aria-label="User menu"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-xs font-extrabold text-[color:var(--nav-text-active)]">
                    {initials(user?.name)}
                  </span>
                  <span className="hidden 2xl:inline max-w-[14rem] truncate">{user?.name}</span>
                  <svg className={`h-4 w-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {profileDropdownOpen ? (
                  <div
                    className="absolute right-0 top-full z-[250] mt-2 w-[min(92vw,19rem)] overflow-hidden rounded-2xl border border-[color:var(--nav-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_92%,#ffffff_8%)] p-3 shadow-2xl shadow-black/60 ring-1 ring-black/40"
                    role="menu"
                    aria-label="User menu"
                  >
                    <div className="px-2 pb-2">
                      <div className="text-sm font-semibold text-[color:var(--nav-text-active)]">{user?.name}</div>
                      <div className="mt-1 inline-flex rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2.5 py-1 text-[11px] font-extrabold text-[color:var(--nav-text-active)]">
                        {user?.role}
                      </div>
                    </div>
                    <div className="px-2 py-2">
                      <ThemeToggle />
                    </div>
                    <div className="mt-2 space-y-1 border-t border-[color:var(--nav-border)] pt-2">
                      <Link
                        to="/change-password"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-semibold text-[color:var(--nav-text-hover)] transition-colors hover:bg-[color:var(--nav-active-bg)]"
                        role="menuitem"
                      >
                        Change Password
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          logout()
                        }}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[color:var(--nav-text-hover)] transition-colors hover:bg-[color:var(--nav-active-bg)]"
                        role="menuitem"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Hamburger menu - below lg */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="ml-1 inline-flex min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-xl border-2 border-[color:var(--nav-border)] p-2 text-[color:var(--nav-text-hover)] transition-colors duration-200 hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)] lg:hidden"
                aria-expanded={mobileMenuOpen}
                aria-controls="crm-mobile-nav"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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
            <div
              id="crm-mobile-nav"
              className="mobile-menu-scroll max-h-[min(88dvh,calc(100dvh-3.5rem))] overflow-y-auto overflow-x-hidden overscroll-y-contain border-t border-[color:var(--nav-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_82%,#000000_18%)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3 lg:hidden"
            >
              <div className="space-y-1.5 px-1 sm:px-0">
                {canAccessDashboardMenu && (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                        location.pathname.startsWith('/dashboard')
                          ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                          : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
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
                          ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                          : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
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
                        ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                        : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
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
                      className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200 text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]"
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
                        isHelpActive
                          ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                          : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
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
                          ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                          : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
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
                          ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-text-active)] shadow-md font-bold border-2 border-[color:var(--nav-border)]'
                          : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)]'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ) : null
                )}
                {/* Mobile user info and actions */}
                <div className="mt-4 pt-4 border-t border-[color:var(--nav-border)] px-4 space-y-2">
                  <div className="text-sm text-[color:var(--nav-text-hover)] font-medium mb-2">{user?.name}</div>
                  <div className="inline-block rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-1 text-xs font-bold text-[color:var(--nav-text-active)]">
                    {user?.role}
                  </div>
                  <div className="flex justify-start py-1">
                    <ThemeToggle />
                  </div>
                  <Link
                    to="/change-password"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)] transition-colors duration-200"
                  >
                    Change Password
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      logout()
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-[color:var(--nav-text)] hover:bg-[color:var(--nav-active-bg)] hover:text-[color:var(--nav-text-hover)] transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Zenith + Users admin: avoid overflow-x clip/hidden on main — CSS pairs it with overflow-y: auto and breaks document scroll in Chrome/Edge */}
      <main
        className={
          location.pathname.startsWith('/zenith') ||
          location.pathname.startsWith('/users') ||
          location.pathname.startsWith('/audit-security') ||
          location.pathname.startsWith('/about') ||
          location.pathname.startsWith('/help') ||
          location.pathname.startsWith('/tally-export') ||
          location.pathname.startsWith('/support-tickets') ||
          location.pathname.startsWith('/change-password') ||
          location.pathname.startsWith('/customers') ||
          location.pathname.startsWith('/projects') ||
          location.pathname.startsWith('/dashboard')
            ? 'w-full max-w-none mx-auto py-0 px-0'
            : 'mx-auto w-full max-w-[1600px] py-6 px-2 sm:px-4 md:px-6 lg:px-8'
        }
      >
        <Outlet />
      </main>

      {user ? <VictoryToast toast={victoryToast} onDismiss={dismissVictoryToast} /> : null}

      <TipOfTheDay />
    </div>
  )
}

export default Layout
