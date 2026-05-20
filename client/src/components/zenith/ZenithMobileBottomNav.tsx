import { UserRole } from '../../types'
import { getZenithMobileNavItems, type ZenithMobileTab } from './zenithMobileNav'

type Props = {
  role: UserRole
  activeTab: ZenithMobileTab
  onTabChange: (tab: ZenithMobileTab) => void
  showHitList?: boolean
  pendingSyncCount?: number
  isOnline?: boolean
}

export default function ZenithMobileBottomNav({
  role,
  activeTab,
  onTabChange,
  showHitList,
  pendingSyncCount = 0,
  isOnline = true,
}: Props) {
  const items = getZenithMobileNavItems(role, { showHitList })

  return (
    <nav
      className="zenith-mobile-bottom-nav lg:hidden"
      aria-label="Zenith sections"
    >
      <div className="zenith-mobile-bottom-nav-inner">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`zenith-mobile-bottom-nav-btn touch-manipulation ${active ? 'is-active' : ''}`}
            >
              <span className="relative inline-flex shrink-0">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} aria-hidden />
                {!isOnline && pendingSyncCount > 0 && id === 'overview' ? (
                  <span
                    className="absolute -right-1.5 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[color:var(--accent-red)] px-1 text-[9px] font-bold text-white"
                    aria-label={`${pendingSyncCount} queued`}
                  >
                    {pendingSyncCount > 9 ? '9+' : pendingSyncCount}
                  </span>
                ) : null}
              </span>
              <span className="zenith-mobile-bottom-nav-label">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
