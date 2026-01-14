import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'

const Layout = () => {
  const { user, logout, hasRole } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Customers', path: '/customers', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
    { name: 'Projects', path: '/projects', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE, UserRole.MANAGEMENT] },
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
              <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
                {filteredNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
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
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/90 font-medium">{user?.name}</span>
              <span className="text-xs text-primary-700 bg-gradient-to-r from-white to-primary-50 px-4 py-2 rounded-full font-bold shadow-lg border-2 border-white/50">
                {user?.role}
              </span>
              <button
                onClick={logout}
                className="text-sm text-white font-semibold hover:text-white hover:bg-white/20 px-4 py-2 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 border-2 border-white/20 hover:border-white/40"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
