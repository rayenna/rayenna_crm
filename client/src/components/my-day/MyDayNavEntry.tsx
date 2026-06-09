import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useMyDayContext } from '../../contexts/MyDayContext'
import { dismissMyDayCoach, shouldShowMyDayCoach } from '../../lib/myDayHabits'
import MyDayButton from './MyDayButton'
import MyDayCoachMark from './MyDayCoachMark'

/** Nav ☀ button with one-time coach mark (Phase 2). */
export default function MyDayNavEntry() {
  const { user } = useAuth()
  const { isOpen, open } = useMyDayContext()
  const anchorRef = useRef<HTMLDivElement>(null)
  const [showCoach, setShowCoach] = useState(false)

  useEffect(() => {
    if (!shouldShowMyDayCoach(user?.id)) {
      setShowCoach(false)
      return
    }
    const delay = window.setTimeout(() => setShowCoach(true), 1400)
    return () => clearTimeout(delay)
  }, [user?.id])

  useEffect(() => {
    if (isOpen && user?.id) {
      dismissMyDayCoach(user.id)
      setShowCoach(false)
    }
  }, [isOpen, user?.id])

  const handleDismissCoach = () => {
    if (user?.id) dismissMyDayCoach(user.id)
    setShowCoach(false)
  }

  const handleBeforeOpen = () => {
    if (user?.id) dismissMyDayCoach(user.id)
    setShowCoach(false)
  }

  return (
    <div className="myday-btn-wrap relative" ref={anchorRef}>
      <MyDayButton variant="nav" onBeforeOpen={handleBeforeOpen} />
      {showCoach && !isOpen && user?.id ? (
        <MyDayCoachMark
          anchorRef={anchorRef}
          onDismiss={handleDismissCoach}
          onTryOpen={open}
        />
      ) : null}
    </div>
  )
}
