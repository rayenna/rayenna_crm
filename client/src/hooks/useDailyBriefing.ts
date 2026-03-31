import { useEffect, useState } from 'react'

const STORAGE_KEY = 'zenith_briefing_dismissed_date'

function todayKey(): string {
  return new Date().toISOString().split('T')[0]!
}

export function useDailyBriefing() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const dismissedDate = localStorage.getItem(STORAGE_KEY)
    const today = todayKey()
    if (dismissedDate !== today) {
      const t = window.setTimeout(() => setIsVisible(true), 800)
      return () => window.clearTimeout(t)
    }
  }, [])

  const dismiss = (dontShowToday = false) => {
    if (dontShowToday) {
      localStorage.setItem(STORAGE_KEY, todayKey())
    }
    setIsVisible(false)
  }

  const showBriefing = () => setIsVisible(true)

  return { isVisible, dismiss, showBriefing }
}

