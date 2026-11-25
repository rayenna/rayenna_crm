import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import { useZenithNarrowLayout } from '../../hooks/useZenithNarrowLayout'
import { openZenithAskDock } from '../../utils/zenithAskOpen'
import { ZenithAskIcon } from './zenithAskIcon'

const ASK_ROLES: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
]

/** Lightweight nav control — kept separate so Layout does not pull Ask panel / charts. */
export default function ZenithAskNavButton() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const narrow = useZenithNarrowLayout()
  const [dockOpen, setDockOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const allowed = Boolean(user?.role && ASK_ROLES.includes(user.role))
  const showHint = hintOpen && !dockOpen

  useEffect(() => {
    const sync = () => setDockOpen(document.body.classList.contains('zenith-ask-dock-open'))
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (dockOpen) setHintOpen(false)
  }, [dockOpen])

  if (!allowed) return null
  const onZenith = location.pathname.startsWith('/zenith')
  return (
    <span
      className="zenith-ask-launcher-wrap"
      onMouseEnter={() => {
        if (!dockOpen) setHintOpen(true)
      }}
      onMouseLeave={() => setHintOpen(false)}
    >
      <button
        type="button"
        className={`zenith-ask-dock-launcher${dockOpen ? ' zenith-ask-dock-launcher--open' : ''}`}
        aria-label="Ask Zenith"
        aria-expanded={dockOpen}
        aria-describedby={showHint ? 'zenith-ask-launcher-hint' : undefined}
        onFocus={() => {
          if (!dockOpen) setHintOpen(true)
        }}
        onBlur={() => setHintOpen(false)}
        onClick={() => {
          setHintOpen(false)
          if (onZenith && narrow) {
            navigate('/zenith?askFocus=1')
            return
          }
          openZenithAskDock({ focus: true })
        }}
      >
        <ZenithAskIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
        <span className="sm:hidden">Ask</span>
        <span className="hidden sm:inline">Ask Zenith</span>
      </button>
      {showHint ? (
        <span
          id="zenith-ask-launcher-hint"
          role="tooltip"
          className="zenith-ask-launcher-hint"
        >
          <span className="zenith-ask-launcher-hint__title">
            Your AI powered personal Assistant
          </span>
          <span className="zenith-ask-launcher-hint__body">
            Ask me anything about Pipeline, Revenue, Payments…!
          </span>
        </span>
      ) : null}
    </span>
  )
}
