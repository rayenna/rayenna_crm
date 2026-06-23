import { NavLink } from 'react-router-dom'
import { Home, LineChart, Wrench, Headphones, User } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/track', label: 'Track', icon: LineChart, end: false },
  { to: '/maintain', label: 'Maintain', icon: Wrench, end: false },
  { to: '/support', label: 'Support', icon: Headphones, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
] as const

export default function BottomNav() {
  return (
    <nav className="hub-bottom-nav" aria-label="Main navigation">
      <div className="hub-bottom-nav-inner">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `hub-bottom-nav-btn ${isActive ? 'is-active' : ''}`
            }
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="hub-bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
