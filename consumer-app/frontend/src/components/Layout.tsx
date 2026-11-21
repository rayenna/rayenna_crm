import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import InstallHubPrompt from './InstallHubPrompt'
import HubPushOptIn from './HubPushOptIn'
import { attachIosEdgeOverscrollLock } from '@/utils/lockIosEdgeOverscroll'

export default function Layout() {
  const mainRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    return attachIosEdgeOverscrollLock(el)
  }, [])

  return (
    <div className="hub-shell zenith-root zenith-animated-bg flex h-full w-full flex-col">
      <main ref={mainRef} className="hub-main min-h-0 min-w-0 flex-1">
        <Outlet />
      </main>
      <InstallHubPrompt />
      <HubPushOptIn />
      <BottomNav />
    </div>
  )
}
