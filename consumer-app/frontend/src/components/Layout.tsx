import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="hub-shell zenith-root zenith-animated-bg flex h-[100dvh] w-full flex-col">
      <main className="min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
