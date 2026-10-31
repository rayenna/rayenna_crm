import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
import { getZenithAskDateFilters } from '../../utils/zenithAskDateFilters'
import { formatZenithFilterSummary } from '../../utils/zenithFilterSummary'
import {
  clampAskDockFrame,
  readAskDockFrame,
  writeAskDockFrame,
  type ZenithAskDockFrame,
} from '../../utils/zenithAskDockFrame'
import { useZenithNarrowLayout } from '../../hooks/useZenithNarrowLayout'
import { useOfflineSync } from '../../hooks/useOfflineSync'
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
  const narrow = useZenithNarrowLayout()
  const [dockOpen, setDockOpen] = useState(false)
  const allowed = Boolean(user?.role && ASK_ROLES.includes(user.role))

  useEffect(() => {
    const sync = () => setDockOpen(document.body.classList.contains('zenith-ask-dock-open'))
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  if (!allowed) return null
  const onZenith = location.pathname.startsWith('/zenith')
  return (
    <button
      type="button"
      className={`zenith-ask-dock-launcher${dockOpen ? ' zenith-ask-dock-launcher--open' : ''}`}
      title="Ask Zenith"
      aria-label="Ask Zenith"
      aria-expanded={dockOpen}
      onClick={() => {
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
  )
}

export default function ZenithAskDock() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const narrow = useZenithNarrowLayout()
  const { isOnline } = useOfflineSync()
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
  const dockRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<ZenithAskDockFrame | null>(null)
  const dragRef = useRef<{
    mode: 'move' | 'resize'
    pointerId: number
    offsetX: number
    offsetY: number
    startX: number
    startY: number
    startW: number
    startH: number
  } | null>(null)
  const [frame, setFrame] = useState<ZenithAskDockFrame | null>(null)
  const [dragging, setDragging] = useState(false)
  const expanded = Boolean(askResult || askLoading || askError)

  const close = useCallback(() => setOpen(false), [])

  const paintFrame = useCallback((next: ZenithAskDockFrame | null) => {
    frameRef.current = next
    const el = dockRef.current
    if (!el) return
    if (!next) {
      el.classList.remove('zenith-ask-dock--placed', 'zenith-ask-dock--sized')
      el.style.left = ''
      el.style.top = ''
      el.style.width = ''
      el.style.height = ''
      return
    }
    el.classList.add('zenith-ask-dock--placed')
    el.classList.toggle('zenith-ask-dock--sized', next.sized)
    el.style.left = `${next.x}px`
    el.style.top = `${next.y}px`
    if (next.sized) {
      el.style.width = `${next.w}px`
      el.style.height = `${next.h}px`
    } else {
      el.style.width = ''
      el.style.height = ''
    }
  }, [])

  const applyFrame = useCallback(
    (next: ZenithAskDockFrame | null) => {
      paintFrame(next)
      setFrame(next)
    },
    [paintFrame],
  )

  const commitFrame = useCallback(
    (next: ZenithAskDockFrame | null) => {
      applyFrame(next)
      writeAskDockFrame(next)
    },
    [applyFrame],
  )

  const rectToFrame = useCallback((el: HTMLElement, sized: boolean): ZenithAskDockFrame => {
    const r = el.getBoundingClientRect()
    return clampAskDockFrame(r.left, r.top, r.width, r.height, sized)
  }, [])

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
      if (!q || !allowed || !isOnline) return
      setAskLoading(true)
      setAskError(null)
      setAskResult(null)
      setAskValue(q)
      trackZenithAskEvent('ask_submitted', { role: user?.role, source })
      const started = Date.now()
      const dates = getZenithAskDateFilters()
      try {
        const res = await axiosInstance.post<ZenithNlQueryResult>('/api/dashboard/zenith-nl-query', {
          question: q,
          fy: dates.fy,
          quarter: dates.quarter,
          month: dates.month,
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
    [allowed, isOnline, user?.role, navigate, pushAskHistory],
  )

  useEffect(() => {
    const onOpen = (ev: Event) => {
      if (onZenith && narrow) return
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
  }, [onZenith, narrow])

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

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    document.body.classList.toggle('zenith-ask-dock-open', open)
    return () => {
      document.body.classList.remove('zenith-ask-dock-open')
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      dragRef.current = null
      setDragging(false)
      return
    }
    const saved = readAskDockFrame()
    if (saved) {
      applyFrame(saved)
      return
    }
    applyFrame(null)
  }, [open, applyFrame])

  useEffect(() => {
    if (!open || !frame) return
    const onWinResize = () => {
      const el = dockRef.current
      if (!el) return
      commitFrame(rectToFrame(el, frameRef.current?.sized === true))
    }
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [open, frame, commitFrame, rectToFrame])

  useEffect(() => {
    if (!open || !frameRef.current) return
    const el = dockRef.current
    if (!el) return
    const id = window.requestAnimationFrame(() => {
      commitFrame(rectToFrame(el, frameRef.current?.sized === true))
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, expanded, commitFrame, rectToFrame])

  const onMovePointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    const el = dockRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const current = clampAskDockFrame(
      r.left,
      r.top,
      r.width,
      r.height,
      frameRef.current?.sized === true,
    )
    applyFrame(current)
    dragRef.current = {
      mode: 'move',
      pointerId: e.pointerId,
      offsetX: e.clientX - r.left,
      offsetY: e.clientY - r.top,
      startX: r.left,
      startY: r.top,
      startW: r.width,
      startH: r.height,
    }
    setDragging(true)
    el.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onResizePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const el = dockRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const current = clampAskDockFrame(r.left, r.top, r.width, r.height, true)
    applyFrame(current)
    dragRef.current = {
      mode: 'resize',
      pointerId: e.pointerId,
      offsetX: 0,
      offsetY: 0,
      startX: r.left,
      startY: r.top,
      startW: r.width,
      startH: r.height,
    }
    setDragging(true)
    el.setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  }

  const onDockPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const el = dockRef.current
    if (!drag || !el || e.pointerId !== drag.pointerId) return
    if (drag.mode === 'move') {
      paintFrame(
        clampAskDockFrame(
          e.clientX - drag.offsetX,
          e.clientY - drag.offsetY,
          drag.startW,
          drag.startH,
          frameRef.current?.sized === true,
        ),
      )
      return
    }
    paintFrame(
      clampAskDockFrame(
        drag.startX,
        drag.startY,
        drag.startW + (e.clientX - (drag.startX + drag.startW)),
        drag.startH + (e.clientY - (drag.startY + drag.startH)),
        true,
      ),
    )
  }

  const onDockPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return
    dragRef.current = null
    setDragging(false)
    applyFrame(frameRef.current)
    writeAskDockFrame(frameRef.current)
    try {
      dockRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }

  const resetFrame = () => {
    commitFrame(null)
  }

  if (!allowed || !open || (onZenith && narrow)) return null

  const chips = zenithAskExampleChips(user?.role)
  const mapped = askLoading ? zenithAskMappedLabel(askValue) : null
  const dates = getZenithAskDateFilters()
  const filterSummary = formatZenithFilterSummary(dates.fy, dates.quarter, dates.month)
  const overlay = (
    <div className="zenith-ask-dock-layer">
      <div
        ref={dockRef}
        className={[
          'zenith-root zenith-ask-dock',
          expanded ? 'zenith-ask-dock--expanded' : '',
          frame ? 'zenith-ask-dock--placed' : '',
          frame?.sized ? 'zenith-ask-dock--sized' : '',
          dragging ? 'zenith-ask-dock--dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="false"
        aria-label="Ask Zenith"
        onPointerMove={onDockPointerMove}
        onPointerUp={onDockPointerUp}
        onPointerCancel={onDockPointerUp}
      >
        <div
          className="zenith-ask-dock__bar"
          onPointerDown={onMovePointerDown}
          onDoubleClick={resetFrame}
          title="Drag to move · double-click to reset"
        >
          <p className="zenith-ask-dock__title">
            <ZenithAskIcon className="h-4 w-4 text-[color:var(--accent-gold)]" aria-hidden />
            Ask Zenith
            {remainingAsks != null ? (
              <span className="zenith-ask-composer__quota">{remainingAsks} left</span>
            ) : null}
          </p>
          <button
            type="button"
            className="zenith-ask-result__close"
            onClick={close}
            aria-label="Close Ask Zenith"
          >
            <X className="w-4 h-4 mx-auto" aria-hidden />
          </button>
        </div>
        <div className="zenith-ask-dock__composer">
          <ZenithAskComposer
            value={askValue}
            onChange={setAskValue}
            onSubmit={(q, source) => void runAsk(q, source ?? 'typed')}
            loading={askLoading}
            isOnline={isOnline}
            inputId="zenith-ask-dock-input"
            mappedLabel={mapped}
            hideTitle
            compact
          />
        </div>
        <div className="zenith-ask-dock__body">
          {!askResult && !askLoading && !askError ? (
            <div className="zenith-ask-dock__prompts">
              <span className="zenith-ask-examples__label">Try asking</span>
              <div className="zenith-ask-examples zenith-ask-examples--panel">
                {chips.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={!isOnline}
                    className="zenith-ask-examples__chip"
                    onClick={() => void runAsk(q, 'chip')}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <ZenithAskPanel
            result={askResult}
            error={askError}
            loading={askLoading}
            history={askHistory}
            filterSummary={filterSummary}
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
        <button
          type="button"
          className="zenith-ask-dock__resize"
          aria-label="Resize Ask Zenith"
          title="Drag to resize"
          onPointerDown={onResizePointerDown}
        />
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
