import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import InstallHubPrompt from './InstallHubPrompt'
import HubPushOptIn from './HubPushOptIn'

export default function Layout() {
  return (
    <div className="hub-shell zenith-root zenith-animated-bg flex h-full w-full flex-col">
      <main className="hub-main min-h-0 min-w-0 flex-1">
        <Outlet />
      </main>
      <InstallHubPrompt />
      <HubPushOptIn />
      <BottomNav />
    </div>
  )
}
