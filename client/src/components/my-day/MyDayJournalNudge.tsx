import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useMyDayContext } from '../../contexts/MyDayContext'
import { useMyDaySnapshotQuery } from '../../hooks/useMyDaySnapshotQuery'
import {
  dismissJournalNudgeToday,
  shouldShowJournalNudge,
} from '../../lib/myDayHabits'

/**
 * End-of-day banner: gentle journal reminder after 4:30pm when today's note is empty.
 */
export default function MyDayJournalNudge() {
  const { user } = useAuth()
  const { isOpen, openTab } = useMyDayContext()
  const snapQ = useMyDaySnapshotQuery(!!user)
  const [visible, setVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined)

  // Best-effort: read last tab from localStorage (drawer persists it)
  useEffect(() => {
    try {
      setActiveTab(localStorage.getItem('zenith_myday_last_tab') ?? undefined)
    } catch {
      setActiveTab(undefined)
    }
  }, [isOpen])

  useEffect(() => {
    const journalStarted = snapQ.data?.journalStarted ?? false
    const show = shouldShowJournalNudge({
      userId: user?.id,
      journalStarted,
      drawerOpen: isOpen,
      activeTab,
    })
    setVisible(show)
  }, [user?.id, snapQ.data?.journalStarted, isOpen, activeTab])

  // Re-check every minute so 4:30 window opens without refresh
  useEffect(() => {
    const id = window.setInterval(() => {
      const journalStarted = snapQ.data?.journalStarted ?? false
      setVisible(
        shouldShowJournalNudge({
          userId: user?.id,
          journalStarted,
          drawerOpen: isOpen,
          activeTab,
        }),
      )
    }, 60_000)
    return () => clearInterval(id)
  }, [user?.id, snapQ.data?.journalStarted, isOpen, activeTab])

  if (!visible || !user?.id) return null

  const dismiss = () => {
    dismissJournalNudgeToday(user.id)
    setVisible(false)
  }

  const openJournal = () => {
    dismissJournalNudgeToday(user.id)
    setVisible(false)
    openTab('journal')
  }

  return (
    <div
      className="myday-journal-nudge"
      role="region"
      aria-label="Journal reminder"
    >
      <div className="myday-journal-nudge-inner">
        <p className="myday-journal-nudge-text">
          <strong>End of day?</strong> Log what moved today in your My Day journal — private to you, synced across devices.
        </p>
        <div className="myday-journal-nudge-actions">
          <button type="button" className="myday-journal-nudge-secondary" onClick={dismiss}>
            Not today
          </button>
          <button type="button" className="myday-journal-nudge-primary" onClick={openJournal}>
            Write journal
          </button>
        </div>
      </div>
    </div>
  )
}
