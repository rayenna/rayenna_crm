import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[color:var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
