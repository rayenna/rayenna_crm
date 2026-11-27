import { lazy, Suspense, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { ZenithAskIcon } from './zenithAskIcon'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import ZenithAskComposer from './ZenithAskComposer'

const ZenithAskPanel = lazy(() => import('./ZenithAskPanel'))
import { zenithAskExampleChips } from '../../constants/zenithAskExamples'
import { useZenithAskPreferences } from '../../hooks/useZenithAskPreferences'
import ZenithAskPrefsBar from './ZenithAskPrefsBar'
import AskChipWithFav from './AskChipWithFav'
import {
  mergeFavoriteAskChips,
  type ZenithAskPreferences,
  writeZenithAskPreferences,
} from '../../utils/zenithAskPreferencesStorage'
import toast from 'react-hot-toast'
import {
  readZenithAskHistory,
  writeZenithAskHistory,
  ZENITH_ASK_HISTORY_MAX,
} from '../../utils/zenithAskHistoryStorage'
import { trackZenithAskEvent } from '../../utils/zenithAskAnalytics'
import { zenithAskMappedLabel } from '../../utils/zenithAskMappedLabel'
import { handleZenithAskAction } from '../../utils/zenithAskActionHref'
import { ZENITH_ASK_OPEN_EVENT, type ZenithAskOpenDetail } from '../../utils/zenithAskOpen'
import { getZenithAskDateFilters } from '../../utils/zenithAskDateFilters'
import { formatZenithFilterSummary } from '../../utils/zenithFilterSummary'
import {
  clampAskDockFrame,
  getAskDockViewport,
  readAskDockFrame,
  writeAskDockFrame,
  type ZenithAskDockFrame,
} from '../../utils/zenithAskDockFrame'

function isAskDockInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  // Body / composer / results must not start a drag — that fights hover tooltips on table cells.
  return Boolean(
    target.closest(
      [
        'button',
        'a',
        'input',
        'textarea',
        'select',
        'label',
        '[role="button"]',
        '[contenteditable="true"]',
        '.zenith-ask-dock__resize',
        '.zenith-ask-dock__composer',
        '.zenith-ask-dock__body',
        '.zenith-ask-table',
        '.zenith-ask-table__cell',
        '.zenith-ask-table__tip',
      ].join(', '),
    ),
  )
}
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

export default function ZenithAskDock() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const narrow = useZenithNarrowLayout()
  const { isOnline } = useOfflineSync()
  const onZenith = location.pathname.startsWith('/zenith')
  const allowed = Boolean(user?.role && ASK_ROLES.includes(user.role))
  const [open, setOpen] = useState(false)
  const askPrefs = useZenithAskPreferences(user?.id, Boolean(allowed && isOnline && open))
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
    /** Move waits for a small threshold so vertical scrolls still work in the answer body. */
    armed?: boolean
    originClientX?: number
    originClientY?: number
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
    if (!open) return
    const reclamp = () => {
      const el = dockRef.current
      if (!el) return
      commitFrame(rectToFrame(el, frameRef.current?.sized === true))
    }
    window.addEventListener('resize', reclamp)
    const vv = window.visualViewport
    vv?.addEventListener('resize', reclamp)
    vv?.addEventListener('scroll', reclamp)
    return () => {
      window.removeEventListener('resize', reclamp)
      vv?.removeEventListener('resize', reclamp)
      vv?.removeEventListener('scroll', reclamp)
    }
  }, [open, commitFrame, rectToFrame])

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
    if (isAskDockInteractiveTarget(e.target)) return
    const el = dockRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const current = clampAskDockFrame(
      r.left,
      r.top,
      r.width,
      r.height,
      frameRef.current?.sized === true,
      getAskDockViewport(),
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
      armed: true,
      originClientX: e.clientX,
      originClientY: e.clientY,
    }
    el.setPointerCapture(e.pointerId)
  }

  const onResizePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const el = dockRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const current = clampAskDockFrame(r.left, r.top, r.width, r.height, true, getAskDockViewport())
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
    const vp = getAskDockViewport()

    if (drag.mode === 'move' && drag.armed) {
      const dx = e.clientX - (drag.originClientX ?? e.clientX)
      const dy = e.clientY - (drag.originClientY ?? e.clientY)
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      // Prefer native vertical scroll inside the answer body when the gesture is mostly vertical.
      const inScrollBody = Boolean(
        (e.target as Element | null)?.closest?.(
          '.zenith-ask-dock__body, .zenith-ask-result__body, .zenith-ask-table__body',
        ),
      )
      if (inScrollBody && Math.abs(dy) >= Math.abs(dx) * 1.15) {
        dragRef.current = null
        setDragging(false)
        try {
          el.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        return
      }
      drag.armed = false
      setDragging(true)
      e.preventDefault()
    }

    if (drag.mode === 'move') {
      paintFrame(
        clampAskDockFrame(
          e.clientX - drag.offsetX,
          e.clientY - drag.offsetY,
          drag.startW,
          drag.startH,
          frameRef.current?.sized === true,
          vp,
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
        vp,
      ),
    )
  }

  const onDockPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return
    const wasDragging = !drag.armed
    dragRef.current = null
    setDragging(false)
    if (wasDragging || drag.mode === 'resize') {
      applyFrame(frameRef.current)
      writeAskDockFrame(frameRef.current)
    }
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

  const chips = mergeFavoriteAskChips(
    askPrefs.preferences.favoriteQuestions,
    zenithAskExampleChips(user?.role),
    8,
  )
  const playbookChips = askPrefs.playbooks
  const mapped = askLoading ? zenithAskMappedLabel(askValue) : null
  const dates = getZenithAskDateFilters()
  const filterSummary = formatZenithFilterSummary(dates.fy, dates.quarter, dates.month)

  const saveAskFavorites = async (favoriteQuestions: string[]) => {
    if (!user?.id) return
    const next = { ...askPrefs.preferences, favoriteQuestions }
    askPrefs.setPreferences(next)
    writeZenithAskPreferences(user.id, next)
    try {
      const { data } = await axiosInstance.put<{ preferences: ZenithAskPreferences }>(
        '/api/dashboard/zenith-ask-preferences',
        next,
      )
      if (data?.preferences) {
        askPrefs.setPreferences(data.preferences)
        writeZenithAskPreferences(user.id, data.preferences)
      }
    } catch (err: unknown) {
      toast.error(getFriendlyApiErrorMessage(err) || 'Could not save favorite')
    }
  }
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
        onPointerDown={onMovePointerDown}
        onPointerMove={onDockPointerMove}
        onPointerUp={onDockPointerUp}
        onPointerCancel={onDockPointerUp}
        onDoubleClick={(e) => {
          if (isAskDockInteractiveTarget(e.target)) return
          resetFrame()
        }}
      >
        <div className="zenith-ask-dock__bar" aria-label="Drag header to move Ask Zenith">
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
              {user?.id ? (
                <ZenithAskPrefsBar
                  userId={user.id}
                  preferences={askPrefs.preferences}
                  onPreferencesChange={askPrefs.setPreferences}
                  dense
                />
              ) : null}
              {playbookChips.length > 0 ? (
                <div className="zenith-ask-playbooks">
                  <span className="zenith-ask-playbooks__label">Playbooks</span>
                  <div className="zenith-ask-examples zenith-ask-examples--panel">
                    {playbookChips.map((q) => (
                      <AskChipWithFav
                        key={q}
                        question={q}
                        disabled={!isOnline}
                        preferences={askPrefs.preferences}
                        onFavoritesChange={(next) => void saveAskFavorites(next)}
                        onAsk={() => void runAsk(q, 'chip')}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <span className="zenith-ask-examples__label">Try asking</span>
              <div className="zenith-ask-examples zenith-ask-examples--panel">
                {chips.map((q) => (
                  <AskChipWithFav
                    key={q}
                    question={q}
                    disabled={!isOnline}
                    preferences={askPrefs.preferences}
                    onFavoritesChange={(next) => void saveAskFavorites(next)}
                    onAsk={() => void runAsk(q, 'chip')}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <Suspense fallback={null}>
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
              onNavigateAway={close}
              onAskSuggestion={(q, source) => void runAsk(q, source === 'catalog' ? 'catalog' : 'follow_up')}
              onReplayHistory={(item) => void runAsk(item.question, 'history')}
            />
          </Suspense>
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
