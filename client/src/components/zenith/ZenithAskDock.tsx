import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { ZenithAskIcon } from './zenithAskIcon'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import ZenithAskComposer from './ZenithAskComposer'
import ZenithAskPanel from './ZenithAskPanel'
import { zenithAskExampleChips } from '../../constants/zenithAskExamples'
import {
  readZenithAskHistory,
  writeZenithAskHistory,
  ZENITH_ASK_HISTORY_MAX,
} from '../../utils/zenithAskHistoryStorage'
import { trackZenithAskEvent } from '../../utils/zenithAskAnalytics'
import { zenithAskMappedLabel } from '../../utils/zenithAskMappedLabel'
import { handleZenithAskAction } from '../../utils/zenithAskActionHref'
import { openZenithAskDock, ZENITH_ASK_OPEN_EVENT, type ZenithAskOpenDetail } from '../../utils/zenithAskOpen'
import type {
  ZenithAskHistoryItem,
  ZenithNlPriorContext,
  ZenithNlQueryMetricSuccess,
  ZenithNlQueryResult,
} from '../../types/zenithNlQuery'

const ASK_ROLES: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
]

export function ZenithAskNavButton() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const allowed = Boolean(user?.role && ASK_ROLES.includes(user.role))
  if (!allowed) return null
  const onZenith = location.pathname.startsWith('/zenith')
  return (
    <button
      type="button"
      className="zenith-ask-dock-launcher"
      title="Ask Zenith"
      aria-label="Ask Zenith"
      onClick={() => {
        if (onZenith) {
          navigate('/zenith?askFocus=1')
          return
        }
        openZenithAskDock({ focus: true })
      }}
    >
      <ZenithAskIcon className="h-4 w-4" aria-hidden />
      <span className="hidden lg:inline">Ask</span>
    </button>
  )
}

export default function ZenithAskDock() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const onZenith = location.pathname.startsWith('/zenith')
  const allowed = Boolean(user?.role && ASK_ROLES.includes(user.role))
  const [open, setOpen] = useState(false)
  const [askValue, setAskValue] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [askResult, setAskResult] = useState<ZenithNlQueryResult | null>(null)
  const [askHistory, setAskHistory] = useState<ZenithAskHistoryItem[]>(() =>
    readZenithAskHistory(user?.id),
  )
  const [remainingAsks, setRemainingAsks] = useState<number | null>(null)
  const [wantFocus, setWantFocus] = useState(false)
  const askPriorRef = useRef<ZenithNlPriorContext | null>(null)
  const pendingRun = useRef<string | null>(null)

  const pushAskHistory = useCallback(
    (success: ZenithNlQueryMetricSuccess) => {
      const entry: ZenithAskHistoryItem = {
        id: `${Date.now()}-${success.intent.metric}`,
        question: success.question,
        insight: success.insight,
        metric: success.intent.metric,
        at: Date.now(),
      }
      setAskHistory((prev) => {
        const next = [entry, ...prev.filter((h) => h.question !== entry.question)].slice(
          0,
          ZENITH_ASK_HISTORY_MAX,
        )
        writeZenithAskHistory(user?.id, next)
        return next
      })
      askPriorRef.current = {
        question: success.question,
        metric: success.intent.metric,
        filters: success.intent.filters,
      }
    },
    [user?.id],
  )

  const runAsk = useCallback(
    async (
      question: string,
      source: 'typed' | 'chip' | 'follow_up' | 'history' | 'dictate' | 'palette' | 'catalog' = 'typed',
    ) => {
      const q = question.trim()
      if (!q || !allowed) return
      setAskLoading(true)
      setAskError(null)
      setAskResult(null)
      setAskValue(q)
      trackZenithAskEvent('ask_submitted', { role: user?.role, source })
      const started = Date.now()
      try {
        const res = await axiosInstance.post<ZenithNlQueryResult>('/api/dashboard/zenith-nl-query', {
          question: q,
          fy: [],
          quarter: [],
          month: [],
          prior: askPriorRef.current,
        })
        const quota = (res.data as ZenithNlQueryResult & { quota?: { remaining?: number } }).quota
        if (typeof quota?.remaining === 'number') setRemainingAsks(quota.remaining)
        setAskResult(res.data)
        if (res.data.ok && res.data.kind === 'action') {
          trackZenithAskEvent('ask_action', {
            role: user?.role,
            action: res.data.action,
            href: res.data.href,
            source,
            ms: Date.now() - started,
          })
          await handleZenithAskAction(res.data, navigate)
        } else if (res.data.ok && res.data.kind === 'metric') {
          pushAskHistory(res.data)
          trackZenithAskEvent('ask_success', {
            role: user?.role,
            metric: res.data.intent.metric,
            source,
            ms: Date.now() - started,
          })
        } else if (!res.data.ok) {
          trackZenithAskEvent('ask_clarify', { role: user?.role, source, ms: Date.now() - started })
        }
      } catch (err) {
        setAskError(getFriendlyApiErrorMessage(err))
        setAskResult(null)
        trackZenithAskEvent('ask_error', { role: user?.role, source, ms: Date.now() - started })
      } finally {
        setAskLoading(false)
      }
    },
    [allowed, user?.role, navigate, pushAskHistory],
  )

  useEffect(() => {
    const onOpen = (ev: Event) => {
      if (onZenith) return
      const detail = (ev as CustomEvent<ZenithAskOpenDetail>).detail || {}
      setOpen(true)
      if (detail.focus) setWantFocus(true)
      if (detail.question?.trim()) {
        setAskValue(detail.question)
        if (detail.run) pendingRun.current = detail.question.trim()
      }
    }
    window.addEventListener(ZENITH_ASK_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(ZENITH_ASK_OPEN_EVENT, onOpen)
  }, [onZenith])

  useEffect(() => {
    if (!open || !pendingRun.current) return
    const q = pendingRun.current
    pendingRun.current = null
    void runAsk(q, 'palette')
  }, [open, runAsk])

  useEffect(() => {
    if (!open || !wantFocus) return
    setWantFocus(false)
    window.requestAnimationFrame(() => {
      document.getElementById('zenith-ask-dock-input')?.focus()
    })
  }, [open, wantFocus])

  if (!allowed || onZenith || !open) return null

  const chips = zenithAskExampleChips(user?.role)
  const mapped = askLoading ? zenithAskMappedLabel(askValue) : null
  const overlay = (
    <div className="zenith-root zenith-ask-dock" role="dialog" aria-label="Ask Zenith">
      <div className="zenith-ask-dock__bar">
        <p className="zenith-ask-dock__title">
          <ZenithAskIcon className="h-3.5 w-3.5" aria-hidden />
          Ask Zenith
          {remainingAsks != null ? (
            <span className="zenith-ask-composer__quota">{remainingAsks} left</span>
          ) : null}
        </p>
        <button
          type="button"
          className="zenith-ask-result__close"
          onClick={() => setOpen(false)}
          aria-label="Close Ask"
        >
          <X className="w-4 h-4 mx-auto" aria-hidden />
        </button>
      </div>
      <ZenithAskComposer
        value={askValue}
        onChange={setAskValue}
        onSubmit={(q, source) => void runAsk(q, source ?? 'typed')}
        loading={askLoading}
        isOnline
        inputId="zenith-ask-dock-input"
        mappedLabel={mapped}
        hideTitle
      />
      {!askResult && !askLoading && !askError ? (
        <div className="zenith-ask-examples zenith-ask-examples--panel">
          {chips.map((q) => (
            <button
              key={q}
              type="button"
              className="zenith-ask-examples__chip"
              onClick={() => void runAsk(q, 'chip')}
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}
      <ZenithAskPanel
        result={askResult}
        error={askError}
        loading={askLoading}
        history={askHistory}
        role={user?.role}
        mappedLabel={mapped}
        onClose={() => {
          setAskResult(null)
          setAskError(null)
        }}
        onAskSuggestion={(q, source) => void runAsk(q, source === 'catalog' ? 'catalog' : 'follow_up')}
        onReplayHistory={(item) => void runAsk(item.question, 'history')}
      />
    </div>
  )

  return createPortal(overlay, document.body)
}
