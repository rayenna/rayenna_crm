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
    { name: 'Users', path: '/users', roles: [UserRole.ADMIN] },
  ]

  const filteredNav = navigation.filter((nav) => hasRole(nav.roles))

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md border-b border-primary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center mr-6 hover:opacity-80 transition-opacity">
                <img 
                  src="/rayenna_logo.jpg" 
                  alt="Rayenna Energy Logo" 
                  className="h-12 w-auto"
                />
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {filteredNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      location.pathname.startsWith(item.path)
                        ? 'border-primary-600 text-primary-700 font-semibold'
                        : 'border-transparent text-secondary-600 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-secondary-700 font-medium">{user?.name}</span>
              <span className="text-xs text-white bg-primary-600 px-3 py-1.5 rounded-full font-medium">
                {user?.role}
              </span>
              <button
                onClick={logout}
                className="text-sm text-secondary-600 hover:text-primary-600 font-medium transition-colors"
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
