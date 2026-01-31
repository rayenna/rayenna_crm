import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiBaseUrl } from '../utils/axios'
import toast from 'react-hot-toast'

const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
const apiNotConfigured = isProd && !apiBaseUrl

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(email, password)
      toast.success('Login successful')
      navigate('/dashboard')
    } catch (error: any) {
      const msg = error.response?.data?.error ?? (error.response ? 'Login failed' : 'Cannot reach API. Check API base below — set VITE_API_BASE_URL, redeploy static site, ensure backend is Live.')
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border-2 border-white/20">
        {apiNotConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-100 border border-amber-400 text-amber-900 text-sm">
            <strong>API not configured.</strong> Set <code className="bg-amber-200/60 px-1 rounded">VITE_API_BASE_URL</code> in Render (Static Site → Environment), then <strong>redeploy</strong>. Login will not work until then.
          </div>
        )}
        <div className="text-center">
          <div className="mb-6">
            <img 
              src="/rayenna_logo.jpg" 
              alt="Rayenna Energy Logo" 
              className="h-32 w-auto mx-auto mb-4 drop-shadow-lg"
            />
          </div>
          <h2 className="text-4xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 to-yellow-500 bg-clip-text text-transparent mb-2">
            Rayenna CRM
          </h2>
          <p className="mt-2 text-sm font-medium text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-secondary-300 placeholder-secondary-400 text-secondary-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm bg-white"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-secondary-300 placeholder-secondary-400 text-secondary-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm bg-white"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-600">
            Forgot your Password? Contact your administrator
          </p>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            By signing in, you acknowledge and agree to the Credits, Copyright, intellectual property and Terms of Usage of this product. Refer the About section to know more
          </p>
        </div>
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => {
              throw new Error('Sentry frontend test')
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Test Sentry (frontend)
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
