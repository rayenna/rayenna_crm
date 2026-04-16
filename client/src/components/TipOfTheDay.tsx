import { useState, useEffect } from 'react'
import { useModalEscape } from '../contexts/ModalEscapeContext'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import {
  TIPS,
  getTipForToday,
  shouldShowTip,
  markTipShown,
  markDontShowAgain,
} from '../data/tipOfTheDay'

const TipOfTheDay = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [show, setShow] = useState(false)
  const [tip, setTip] = useState('')

  useEffect(() => {
    const forceShow = searchParams.get('showTip') === '1'
    if (forceShow || shouldShowTip()) {
      setTip(getTipForToday())
      setShow(true)
    }
  }, [searchParams])

  const clearShowTipFromUrl = () => {
    if (searchParams.get('showTip') !== '1') return
    const params = new URLSearchParams(location.search)
    params.delete('showTip')
    const newSearch = params.toString()
    navigate({ pathname: location.pathname, search: newSearch ? `?${newSearch}` : '' }, { replace: true })
  }

  const handleGotIt = () => {
    markTipShown()
    setShow(false)
    clearShowTipFromUrl()
  }

  useModalEscape(show, handleGotIt)

  const handleDontShowAgain = () => {
    markDontShowAgain()
    setShow(false)
    clearShowTipFromUrl()
  }

  const handleNextTip = () => {
    const idx = TIPS.indexOf(tip)
    const nextIdx = idx >= 0 ? (idx + 1) % TIPS.length : 0
    setTip(TIPS[nextIdx])
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--bg-overlay)] p-4 backdrop-blur-[3px] sm:p-6">
      {/* Do not use .zenith-root here — it applies min-h ~ viewport and the Zenith page grid to the panel. */}
      <div
        className="mx-auto w-full max-w-md shrink-0 overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-modal)] shadow-[var(--shadow-modal)] ring-1 ring-[color:var(--border-default)] sm:max-w-lg"
        role="dialog"
        aria-labelledby="tip-of-the-day-title"
        aria-describedby="tip-of-the-day-body"
      >
        <div className="flex items-center gap-3 border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-3.5 sm:px-5">
          <span className="shrink-0 text-2xl" aria-hidden>
            💡
          </span>
          <h3
            id="tip-of-the-day-title"
            className="text-lg font-bold tracking-tight text-[color:var(--text-primary)] sm:text-xl"
          >
            Tip of the Day
          </h3>
        </div>
        <div className="max-h-[min(50vh,20rem)] overflow-y-auto bg-[color:var(--bg-card)] px-4 py-5 sm:px-6 sm:py-6">
          <p
            id="tip-of-the-day-body"
            className="text-pretty text-sm leading-relaxed text-[color:var(--text-secondary)] sm:text-base"
          >
            {tip}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={handleDontShowAgain}
            className="rounded-md py-1 text-left text-xs font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-muted)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-surface)] touch-manipulation sm:mr-auto sm:text-sm"
          >
            Don&apos;t show again today
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleNextTip}
              className="touch-manipulation rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 py-2.5 font-semibold text-[color:var(--text-primary)] shadow-sm transition-colors hover:border-[color:var(--accent-gold-border)] hover:bg-[color:var(--bg-card-hover)]"
            >
              Next tip
            </button>
            <button
              type="button"
              onClick={handleGotIt}
              className="touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 font-bold text-[color:var(--text-inverse)] shadow-md transition-opacity hover:opacity-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TipOfTheDay
