import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMyDayContext } from '../../contexts/MyDayContext'

/**
 * Opens My Day from deep-links used by Ask / palette:
 * `?myday=1` (tasks) or `?myday=journal`.
 */
export default function MyDayUrlBridge() {
  const location = useLocation()
  const navigate = useNavigate()
  const { open, openTab } = useMyDayContext()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const myday = params.get('myday')
    if (!myday) return
    params.delete('myday')
    const next = params.toString()
    navigate(
      { pathname: location.pathname, search: next ? `?${next}` : '' },
      { replace: true },
    )
    if (myday === 'journal') openTab('journal')
    else open()
  }, [location.pathname, location.search, navigate, open, openTab])

  return null
}
