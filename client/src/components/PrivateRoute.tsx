import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-[color:var(--bg-page)] [-webkit-tap-highlight-color:transparent]">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
          aria-hidden
        />
        <p className="mt-4 text-sm font-medium text-[color:var(--text-muted)]">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default PrivateRoute
