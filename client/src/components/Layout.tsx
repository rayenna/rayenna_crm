import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'

const Layout = () => {
  const { user, logout, hasRole } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Customers', path: '/customers', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Projects', path: '/projects', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Support Tickets', path: '/support-tickets', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS] },
    { name: 'Tally Export', path: '/tally-export', roles: [UserRole.ADMIN, UserRole.FINANCE] },
    { name: 'Users', path: '/users', roles: [UserRole.ADMIN] },
    { name: 'About', path: '/about', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
  ]

  const filteredNav = navigation.filter((nav) => hasRole(nav.roles))

  return (
    <div className="min-h-screen">
      <nav className="bg-gradient-to-r from-primary-600 via-primary-500 to-green-600 shadow-2xl border-b-4 border-primary-400 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center mr-6 hover:opacity-80 transition-opacity">
                <img 
                  src="/rayenna_logo.jpg" 
                  alt="Rayenna Energy Logo" 
                  className="h-12 w-auto"
                />
              </Link>
              {/* Desktop Navigation - Show on large screens only (lg and above) */}
              <div className="hidden lg:ml-6 lg:flex lg:space-x-3 xl:space-x-4">
                {filteredNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-3 xl:px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                      location.pathname.startsWith(item.path)
                        ? 'bg-white/25 text-white shadow-2xl font-bold backdrop-blur-md border-2 border-white/30 transform scale-105'
                        : 'text-white/95 hover:bg-white/15 hover:text-white hover:shadow-lg hover:backdrop-blur-sm transform hover:scale-105'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
              {/* User info - show on medium screens and above, but hide when hamburger is visible */}
              <span className="hidden md:inline lg:hidden text-sm text-white/90 font-medium truncate max-w-[100px]">{user?.name}</span>
              <span className="hidden xl:inline text-sm text-white/90 font-medium">{user?.name}</span>
              <span className="hidden xl:inline text-xs text-primary-700 bg-gradient-to-r from-white to-primary-50 px-3 py-2 rounded-full font-bold shadow-lg border-2 border-white/50">
                {user?.role}
              </span>
              <Link
                to="/change-password"
                className="hidden xl:inline text-xs sm:text-sm text-white font-semibold hover:text-white hover:bg-white/20 px-3 py-2 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 border-2 border-white/20 hover:border-white/40 whitespace-nowrap"
              >
                Change Password
              </Link>
              <button
                onClick={logout}
                className="hidden xl:inline text-xs sm:text-sm text-white font-semibold hover:text-white hover:bg-white/20 px-3 py-2 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 border-2 border-white/20 hover:border-white/40 whitespace-nowrap"
              >
                Logout
              </button>
              {/* Hamburger menu button - Show on screens below lg (includes mobile landscape) */}
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
          {/* Mobile Navigation Menu - Show on screens below lg (includes mobile landscape) */}
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
