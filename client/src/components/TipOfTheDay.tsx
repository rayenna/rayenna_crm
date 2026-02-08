import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import {
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

  const handleDontShowAgain = () => {
    markDontShowAgain()
    setShow(false)
    clearShowTipFromUrl()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border-2 border-primary-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-yellow-500 px-4 py-3 flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            💡
          </span>
          <h3 className="text-lg font-bold text-white">Tip of the Day</h3>
        </div>
        <div className="px-4 py-4">
          <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
            {tip}
          </p>
        </div>
        <div className="px-4 py-3 bg-primary-50/50 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={handleDontShowAgain}
            className="text-xs sm:text-sm text-primary-600 hover:text-primary-800"
          >
            Don&apos;t show again
          </button>
          <button
            onClick={handleGotIt}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

export default TipOfTheDay
