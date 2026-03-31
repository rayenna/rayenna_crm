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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 sm:p-6">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md sm:max-w-lg w-full border border-primary-100 ring-2 ring-primary-200/60 overflow-hidden"
        role="dialog"
        aria-labelledby="tip-of-the-day-title"
        aria-describedby="tip-of-the-day-body"
      >
        <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-amber-500 px-4 sm:px-5 py-3.5 flex items-center gap-3">
          <span className="text-2xl shrink-0" aria-hidden>
            💡
          </span>
          <h3 id="tip-of-the-day-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Tip of the Day
          </h3>
        </div>
        <div className="px-4 sm:px-6 py-5 sm:py-6 bg-gradient-to-b from-white to-primary-50/30">
          <p
            id="tip-of-the-day-body"
            className="text-gray-800 text-sm sm:text-base leading-relaxed text-pretty"
          >
            {tip}
          </p>
        </div>
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-primary-50/80 border-t border-primary-100/80 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sm:items-center">
          <button
            onClick={handleDontShowAgain}
            className="text-xs sm:text-sm text-primary-700 hover:text-primary-900 font-medium sm:mr-auto py-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Don&apos;t show again
          </button>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              onClick={handleNextTip}
              className="px-4 py-2.5 bg-white border-2 border-primary-200 text-primary-800 hover:bg-primary-50 font-semibold rounded-xl transition-colors shadow-sm"
            >
              Next tip
            </button>
            <button
              onClick={handleGotIt}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-md"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TipOfTheDay
