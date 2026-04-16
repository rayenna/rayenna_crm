import { useLocation } from 'react-router-dom'

/** Fallback while lazy routes load. Full viewport on auth pages (no Layout); compact under nav elsewhere. */
const PageLoader = () => {
  const { pathname } = useLocation()
  const fullBleed = pathname === '/login' || pathname === '/reset-password'

  return (
    <div
      className={
        fullBleed
          ? 'flex min-h-screen min-h-[100dvh] w-full items-center justify-center bg-[color:var(--bg-page)] [-webkit-tap-highlight-color:transparent]'
          : 'flex min-h-[min(65vh,36rem)] w-full items-center justify-center py-16 [-webkit-tap-highlight-color:transparent]'
      }
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--border-default)] border-t-[color:var(--accent-gold)]"
          aria-hidden
        />
        <p className="text-sm text-[color:var(--text-muted)]">Loading…</p>
      </div>
    </div>
  )
}

export default PageLoader
