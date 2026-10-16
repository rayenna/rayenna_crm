import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import { useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useZenithMainQuery } from '../hooks/useZenithMainQuery'
import { useZenithExplorerQuery } from '../hooks/useZenithExplorerQuery'
import '../styles/zenith.css'
import CommandBar from '../components/zenith/CommandBar'
import ZenithAskComposer from '../components/zenith/ZenithAskComposer'
import ZenithAskPanel from '../components/zenith/ZenithAskPanel'
import DailyBriefing from '../components/zenith/DailyBriefing'
import ZenithExecutiveBody from '../components/zenith/ZenithExecutiveBody'
import ZenithOperationsBody from '../components/zenith/ZenithOperationsBody'
import ZenithFinanceBody from '../components/zenith/ZenithFinanceBody'
import ZenithAiInsightsTicker from '../components/zenith/ZenithAiInsightsTicker'
import SolarNewsTicker from '../components/zenith/SolarNewsTicker'
import { buildZenithAiInsights, buildZenithTickerItems } from '../components/zenith/zenithAiInsights'
import { AnimatePresence } from 'framer-motion'
import { useDailyBriefing } from '../hooks/useDailyBriefing'
import {
  useQuickAction,
  type QuickActionProjectRef,
  type ZenithAutoFocusSection,
} from '../hooks/useQuickAction'
import { useFinanceQuickDrawer } from '../hooks/useFinanceQuickDrawer'
import { useOperationsQuickDrawer } from '../hooks/useOperationsQuickDrawer'
import QuickActionDrawer from '../components/zenith/QuickActionDrawer'
import FinanceQuickDrawer from '../components/zenith/FinanceQuickDrawer'
import OperationsQuickDrawer from '../components/zenith/OperationsQuickDrawer'
import OfflineBanner from '../components/OfflineBanner'
import { useOfflineSync, ZENITH_DATA_SYNCED } from '../hooks/useOfflineSync'
import { useMyDaySnapshotQuery } from '../hooks/useMyDaySnapshotQuery'
import { useZenithNarrowLayout } from '../hooks/useZenithNarrowLayout'
import ZenithMobileBottomNav from '../components/zenith/ZenithMobileBottomNav'
import ZenithMobileStickyActions from '../components/zenith/ZenithMobileStickyActions'
import {
  zenithMobileTabScrollId,
  type ZenithMobileTab,
} from '../components/zenith/zenithMobileNav'
import { scrollToZenithElementId } from '../components/zenith/zenithScrollToSection'
import {
  flashZenithSection,
  requestZenithPanelExpand,
  resolveZenithSectionMobileTab,
} from '../components/zenith/zenithSectionNavigation'
import {
  readZenithMobileTab,
  writeZenithMobileTab,
} from '../utils/zenithMobileTabPreferences'
import ZenithOfflineSnapshotBanner from '../components/zenith/ZenithOfflineSnapshotBanner'
import { fetchZenithWithOfflineCache } from '../utils/zenithOfflineFetch'
import {
  isZenithOfflineSnapshotPayload,
  stripZenithOfflineSnapshotMeta,
  zenithQueryCacheKey,
} from '../utils/zenithOfflineCache'
import { clearZenithDrawerBodyLock } from '../utils/zenithDrawerLifecycle'
import { ZENITH_QUERY_STALE_MS } from '../constants/zenithQueryStale'
import { formatZenithFilterSummary } from '../utils/zenithFilterSummary'
import { zenithAskExampleChips, zenithAskMoreChips } from '../constants/zenithAskExamples'
import {
  mergeZenithAskHistory,
  readZenithAskHistory,
  writeZenithAskHistory,
  ZENITH_ASK_HISTORY_MAX,
} from '../utils/zenithAskHistoryStorage'
import { trackZenithAskEvent } from '../utils/zenithAskAnalytics'
import type {
  ZenithAskHistoryItem,
  ZenithNlPriorContext,
  ZenithNlQueryMetricSuccess,
  ZenithNlQueryResult,
} from '../types/zenithNlQuery'

const Zenith = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const { isVisible, dismiss, showBriefing } = useDailyBriefing()
  const quickAction = useQuickAction()
  const financeQuickDrawer = useFinanceQuickDrawer()
  const operationsQuickDrawer = useOperationsQuickDrawer()
  const { isOnline, isSyncing, pendingCount, syncError, syncNow } = useOfflineSync()

  const [askValue, setAskValue] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askResult, setAskResult] = useState<ZenithNlQueryResult | null>(null)
  const [askError, setAskError] = useState<string | null>(null)
  const [askHistory, setAskHistory] = useState<ZenithAskHistoryItem[]>([])
  /** Close hides the panel; history is kept for the next ask. */
  const [askPanelDismissed, setAskPanelDismissed] = useState(false)
  const askPriorRef = useRef<ZenithNlPriorContext | null>(null)
  const askHistoryHydratedRef = useRef<string | null>(null)

  const wasOfflineRef = useRef(false)
  const [showOnlineAck, setShowOnlineAck] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
      return
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false
      setShowOnlineAck(true)
      const t = window.setTimeout(() => setShowOnlineAck(false), 5000)
      return () => window.clearTimeout(t)
    }
  }, [isOnline])

  useEffect(() => {
    if (!user?.id) return
    if (askHistoryHydratedRef.current === user.id) return
    const local = readZenithAskHistory(user.id)
    setAskHistory(local)
    let cancelled = false
    void axiosInstance
      .get<{ items: ZenithAskHistoryItem[] }>('/api/dashboard/zenith-ask-history')
      .then((res) => {
        if (cancelled) return
        const server = Array.isArray(res.data?.items) ? res.data.items : []
        const merged = mergeZenithAskHistory(local, server)
        setAskHistory(merged)
        writeZenithAskHistory(user.id, merged)
        askHistoryHydratedRef.current = user.id
      })
      .catch(() => {
        /* keep local cache when offline / API unavailable; allow retry on remount */
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const execZenithRole =
    user?.role === UserRole.SALES ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.ADMIN

  const showZenithAsk =
    execZenithRole ||
    user?.role === UserRole.OPERATIONS ||
    user?.role === UserRole.FINANCE

  const askFilterSummary = formatZenithFilterSummary(
    selectedFYs,
    selectedQuarters,
    selectedMonths,
  )
  const askExampleChips = zenithAskExampleChips(user?.role)
  const askMoreChips = zenithAskMoreChips(user?.role)
  const showAskSideSuggestions = Boolean(
    showZenithAsk && user?.role && !askResult && !askLoading && !askError,
  )
  const showAskMoreChips = Boolean(
    showZenithAsk && user?.role && (askResult || askError) && !askLoading && !askPanelDismissed,
  )

  const narrow = useZenithNarrowLayout()
  const [mobileTab, setMobileTab] = useState<ZenithMobileTab>('overview')
  const [mobileTabHydrated, setMobileTabHydrated] = useState(false)

  useEffect(() => {
    if (!user?.id || mobileTabHydrated) return
    const saved = readZenithMobileTab(user.id)
    if (saved) setMobileTab(saved)
    setMobileTabHydrated(true)
  }, [user?.id, mobileTabHydrated])

  const handleMobileTabChange = useCallback(
    (tab: ZenithMobileTab) => {
      setMobileTab(tab)
      if (user?.id) writeZenithMobileTab(user.id, tab)
    },
    [user?.id],
  )

  /** On mobile, Ask lives on its own tab; desktop always shows the composer. */
  const showAskSurface = Boolean(showZenithAsk && (!narrow || mobileTab === 'ask'))

  const focusAskInput = useCallback(() => {
    if (narrow) handleMobileTabChange('ask')
    const tryFocus = (attemptsLeft: number) => {
      const input = document.getElementById('zenith-ask-input') as HTMLTextAreaElement | null
      if (input) {
        input.focus()
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      if (attemptsLeft > 0) {
        window.requestAnimationFrame(() => tryFocus(attemptsLeft - 1))
      }
    }
    window.requestAnimationFrame(() => tryFocus(10))
  }, [narrow, handleMobileTabChange])

  /** Focus Ask composer — `/` or `A` when not typing in a field. */
  useEffect(() => {
    if (!showZenithAsk) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const key = event.key
      if (key !== '/' && key !== 'a' && key !== 'A') return
      event.preventDefault()
      focusAskInput()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showZenithAsk, focusAskInput])

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

  const runZenithAsk = useCallback(
    async (
      question: string,
      source: 'typed' | 'chip' | 'follow_up' | 'history' | 'dictate' | 'palette' | 'catalog' = 'typed',
    ) => {
      const q = question.trim()
      if (!q || !showZenithAsk || !isOnline) return
      if (narrow) handleMobileTabChange('ask')
      const started = Date.now()
      setAskPanelDismissed(false)
      setAskLoading(true)
      setAskError(null)
      setAskResult(null)
      setAskValue(q)
      trackZenithAskEvent('ask_submitted', { role: user?.role, source })
      try {
        const res = await axiosInstance.post<ZenithNlQueryResult>('/api/dashboard/zenith-nl-query', {
          question: q,
          fy: selectedFYs,
          quarter: selectedQuarters,
          month: selectedMonths,
          prior: askPriorRef.current,
        })
        setAskResult(res.data)
        if (res.data.ok && res.data.kind === 'action') {
          trackZenithAskEvent('ask_action', {
            role: user?.role,
            action: res.data.action,
            href: res.data.href,
            chipMatch: res.data.chipMatch,
            source,
            ms: Date.now() - started,
          })
          if (res.data.autoNavigate && res.data.href) {
            navigate(res.data.href)
            return
          }
        } else if (res.data.ok && res.data.kind === 'metric') {
          pushAskHistory(res.data)
          trackZenithAskEvent('ask_success', {
            role: user?.role,
            metric: res.data.intent.metric,
            chipMatch: res.data.chipMatch,
            relativeDate: res.data.effectiveDateFilter?.phrase ?? null,
            source,
            ms: Date.now() - started,
          })
        } else if (!res.data.ok) {
          trackZenithAskEvent('ask_clarify', {
            role: user?.role,
            source,
            relativeDate: res.data.effectiveDateFilter?.phrase ?? null,
            ms: Date.now() - started,
          })
        }
        window.requestAnimationFrame(() => {
          document.getElementById('zenith-ask-result')?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          })
        })
      } catch (err) {
        setAskError(getFriendlyApiErrorMessage(err))
        setAskResult(null)
        trackZenithAskEvent('ask_error', {
          role: user?.role,
          source,
          ms: Date.now() - started,
        })
      } finally {
        setAskLoading(false)
      }
    },
    [
      showZenithAsk,
      isOnline,
      narrow,
      handleMobileTabChange,
      selectedFYs,
      selectedQuarters,
      selectedMonths,
      pushAskHistory,
      user?.role,
      navigate,
    ],
  )

  /** Command palette deep-link: /zenith?askFocus=1 or /zenith?ask=…&askRun=1 */
  useEffect(() => {
    if (!showZenithAsk) return
    const askFocus = searchParams.get('askFocus') === '1'
    const askQ = searchParams.get('ask')?.trim() || ''
    const askRun = searchParams.get('askRun') === '1'
    if (!askFocus && !askQ) return
    const next = new URLSearchParams(searchParams)
    next.delete('askFocus')
    next.delete('ask')
    next.delete('askRun')
    setSearchParams(next, { replace: true })
    setAskPanelDismissed(false)
    if (askQ) {
      setAskValue(askQ)
      if (askRun && isOnline) {
        void runZenithAsk(askQ, 'palette')
      } else {
        window.requestAnimationFrame(() => focusAskInput())
      }
    } else {
      window.requestAnimationFrame(() => focusAskInput())
    }
  }, [
    showZenithAsk,
    searchParams,
    isOnline,
    focusAskInput,
    setSearchParams,
    runZenithAsk,
  ])

  const showQuickActionDrawer =
    execZenithRole || user?.role === UserRole.OPERATIONS || user?.role === UserRole.FINANCE

  const showFinancePaymentDrawer =
    user?.role === UserRole.FINANCE ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.MANAGEMENT

  const showOperationsLifecycleDrawer =
    user?.role === UserRole.OPERATIONS ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.ADMIN

  const myDaySnapQ = useMyDaySnapshotQuery(!!user)

  const handlePriorityNavigate = useCallback(
    (targetId: string) => {
      if (!user?.role) return
      const tab = resolveZenithSectionMobileTab(targetId, user.role)
      if (narrow && tab) {
        handleMobileTabChange(tab)
      }
      requestZenithPanelExpand(targetId)
      const delay = narrow && tab ? 140 : 50
      window.setTimeout(() => {
        scrollToZenithElementId(targetId)
        flashZenithSection(targetId)
      }, delay)
    },
    [narrow, user?.role, handleMobileTabChange],
  )

  const showExecHitList =
    user?.role === UserRole.SALES ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.ADMIN

  useEffect(() => {
    if (!narrow || !user?.role) return
    const id = zenithMobileTabScrollId(mobileTab, user.role, { showHitList: showExecHitList })
    const frame = window.requestAnimationFrame(() => scrollToZenithElementId(id))
    return () => window.cancelAnimationFrame(frame)
  }, [mobileTab, narrow, user?.role, showExecHitList])

  const fyCacheKey = zenithQueryCacheKey(['dashboard', 'fys', user?.role])

  const {
    data: dashboardData,
    error: fyError,
    isError: isFyError,
    isLoading: isFyLoading,
    isFetching: isFyFetching,
    refetch: refetchFYs,
  } = useQuery({
      queryKey: ['dashboard', 'fys', user?.role],
      queryFn: async () => {
        if (!user?.role) throw new Error('No role')
        return fetchZenithWithOfflineCache(fyCacheKey, async () => {
          if (user.role === UserRole.SALES) {
            const res = await axiosInstance.get('/api/dashboard/sales')
            return res.data as Record<string, unknown>
          }
          if (user.role === UserRole.OPERATIONS || user.role === UserRole.FINANCE) {
            const res = await axiosInstance.get('/api/dashboard/financial-years')
            return res.data as Record<string, unknown>
          }
          const res = await axiosInstance.get('/api/dashboard/management')
          return res.data as Record<string, unknown>
        })
      },
      enabled: !!user,
      staleTime: ZENITH_QUERY_STALE_MS,
    })

  const dashboardDataClean = useMemo(
    () => stripZenithOfflineSnapshotMeta(dashboardData as Record<string, unknown> | undefined),
    [dashboardData],
  )

  const availableFYs =
    (dashboardDataClean.projectValueProfitByFY as { fy: string }[] | undefined)
      ?.map((item) => item.fy)
      .filter(Boolean) ?? []

  const filtersEmpty =
    selectedFYs.length === 0 && selectedQuarters.length === 0 && selectedMonths.length === 0
  // Match Dashboard.tsx: only seed from FY fetch when payload exists (never `{}` from strip(undefined)).
  const initialDataWhenFiltersEmpty =
    filtersEmpty && dashboardData != null && Object.keys(dashboardDataClean).length > 0
      ? dashboardDataClean
      : undefined
  const awaitingFySeedForExec =
    filtersEmpty &&
    execZenithRole &&
    Object.keys(dashboardDataClean).length === 0 &&
    !!user &&
    (isFyLoading || isFyFetching)

  const {
    data: zenithData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useZenithMainQuery(
    user?.role,
    selectedFYs,
    selectedQuarters,
    selectedMonths,
    initialDataWhenFiltersEmpty,
  )

  const { data: explorerProjects = [] } = useZenithExplorerQuery(
    selectedFYs,
    selectedQuarters,
    selectedMonths,
    !!user,
  )

  // Stable close callbacks only — hook return objects (`quickAction`, etc.) are new every render.
  const closeQuickActionDrawer = quickAction.closeDrawer
  const closeFinanceQuickDrawer = financeQuickDrawer.close
  const closeOperationsQuickDrawer = operationsQuickDrawer.close

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return
      clearZenithDrawerBodyLock()
      closeQuickActionDrawer()
      closeFinanceQuickDrawer()
      closeOperationsQuickDrawer()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [closeQuickActionDrawer, closeFinanceQuickDrawer, closeOperationsQuickDrawer])

  useEffect(() => {
    clearZenithDrawerBodyLock()
    return () => {
      clearZenithDrawerBodyLock()
      closeQuickActionDrawer()
      closeFinanceQuickDrawer()
      closeOperationsQuickDrawer()
    }
  }, [closeQuickActionDrawer, closeFinanceQuickDrawer, closeOperationsQuickDrawer])

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ successCount: number }>).detail
      if (d?.successCount > 0) {
        void refetchFYs()
        void refetch()
      }
    }
    window.addEventListener(ZENITH_DATA_SYNCED, handler)
    return () => window.removeEventListener(ZENITH_DATA_SYNCED, handler)
  }, [refetch, refetchFYs])

  const zenithDataClean = useMemo(
    () => stripZenithOfflineSnapshotMeta((zenithData ?? {}) as Record<string, unknown>),
    [zenithData],
  )

  const isOfflineSnapshot = useMemo(
    () => isZenithOfflineSnapshotPayload((zenithData ?? {}) as Record<string, unknown>),
    [zenithData],
  )

  const offlineSnapshotAt = (zenithData as Record<string, unknown> | undefined)?.[
    '__zenithSnapshotAt'
  ] as string | undefined

  const hasZenithBodyData = Object.keys(zenithDataClean).length > 0
  const showZenithLoadError = !isFyError && isError && !hasZenithBodyData
  const showZenithBodyShell =
    !isFyError && !showZenithLoadError && (hasZenithBodyData || isLoading || awaitingFySeedForExec)
  const showZenithEmptyState =
    !isFyError &&
    !showZenithLoadError &&
    !hasZenithBodyData &&
    !isLoading &&
    !awaitingFySeedForExec &&
    !!user?.role

  const dateFilter = useMemo(
    () => ({ selectedFYs, selectedQuarters, selectedMonths }),
    [selectedFYs, selectedQuarters, selectedMonths],
  )

  const filterSummary = useMemo(
    () => formatZenithFilterSummary(selectedFYs, selectedQuarters, selectedMonths),
    [selectedFYs, selectedQuarters, selectedMonths],
  )

  const execForInsights =
    user?.role === UserRole.SALES ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.ADMIN

  const { data: salesPerfInsights } = useQuery({
    queryKey: ['zenith', 'salesPerf', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((m) => params.append('month', m))
      const res = await axiosInstance.get(`/api/sales-team-performance?${params.toString()}`)
      return res.data as { salesTeamData: { salespersonName: string; totalOrderValue: number }[] }
    },
    enabled: !!user && execForInsights,
    staleTime: ZENITH_QUERY_STALE_MS,
  })

  const insights = useMemo(() => {
    if (!user?.role) return []
    return buildZenithAiInsights(user.role, zenithDataClean, dateFilter, {
      salesTeamPipeline: salesPerfInsights?.salesTeamData,
    })
  }, [user?.role, zenithDataClean, dateFilter, salesPerfInsights?.salesTeamData])

  const tickerItems = useMemo(() => buildZenithTickerItems(insights), [insights])

  const handleResetFilters = useCallback(() => {
    setSelectedFYs([])
    setSelectedQuarters([])
    setSelectedMonths([])
  }, [])

  /** Sales & Finance: QuickAction drawer. Admin, Management, Operations: operations lifecycle drawer. */
  const openZenithProjectQuickDrawer = useCallback(
    (p: QuickActionProjectRef, focus: ZenithAutoFocusSection | null = null) => {
      if (!user?.role) return
      if (user.role === UserRole.SALES || user.role === UserRole.FINANCE) {
        quickAction.openDrawer(p, focus ?? undefined)
        return
      }
      if (
        user.role === UserRole.ADMIN ||
        user.role === UserRole.MANAGEMENT ||
        user.role === UserRole.OPERATIONS
      ) {
        operationsQuickDrawer.open(p.id)
      }
    },
    [user?.role, quickAction.openDrawer, operationsQuickDrawer.open],
  )

  const handOffListPickToOperationsDrawer = useCallback(
    (projectId: string) => {
      operationsQuickDrawer.open(projectId)
      quickAction.closeDrawer()
    },
    [operationsQuickDrawer.open, quickAction.closeDrawer],
  )

  const openDrawerListMode = quickAction.openDrawerListMode

  const mobileTabProp = narrow ? mobileTab : null

  const insightsBar =
    !isFyError && user?.role && (hasZenithBodyData || !isError) ? (
      <ZenithAiInsightsTicker
        items={tickerItems}
        isLoading={isLoading && !hasZenithBodyData}
      />
    ) : null

  const body = useMemo(() => {
    if (!user?.role) return null
    const data = zenithDataClean
    switch (user.role) {
      case UserRole.SALES:
      case UserRole.MANAGEMENT:
      case UserRole.ADMIN:
        return (
          <ZenithExecutiveBody
            role={user.role}
            data={data}
            isLoading={isLoading}
            dateFilter={dateFilter}
            onOpenDrawerListMode={openDrawerListMode}
            mobileTab={mobileTabProp}
            onOpenFinanceDrawer={
              user.role === UserRole.ADMIN || user.role === UserRole.MANAGEMENT
                ? financeQuickDrawer.open
                : undefined
            }
            onOpenOperationsDrawer={operationsQuickDrawer.open}
            onOpenProjectQuickDrawer={openZenithProjectQuickDrawer}
            onPriorityNavigate={handlePriorityNavigate}
          />
        )
      case UserRole.OPERATIONS:
        return (
          <ZenithOperationsBody
            data={data}
            isLoading={isLoading}
            dateFilter={dateFilter}
            onOpenDrawerListMode={openDrawerListMode}
            mobileTab={mobileTabProp}
            onOpenOperationsDrawer={operationsQuickDrawer.open}
            onOpenProjectQuickDrawer={openZenithProjectQuickDrawer}
            onPriorityNavigate={handlePriorityNavigate}
          />
        )
      case UserRole.FINANCE:
        return (
          <ZenithFinanceBody
            data={data}
            isLoading={isLoading}
            dateFilter={dateFilter}
            onOpenDrawerListMode={openDrawerListMode}
            mobileTab={mobileTabProp}
            onOpenFinanceDrawer={financeQuickDrawer.open}
            onPriorityNavigate={handlePriorityNavigate}
          />
        )
      default:
        return (
          <div className="px-6 py-20 text-center text-[color:var(--text-muted)]">
            No Zenith view is available for your role.
          </div>
        )
    }
  }, [
    user?.role,
    zenithDataClean,
    isLoading,
    dateFilter,
    openDrawerListMode,
    financeQuickDrawer.open,
    operationsQuickDrawer.open,
    openZenithProjectQuickDrawer,
    mobileTabProp,
    handlePriorityNavigate,
  ])

  return (
    <div className={`zenith-root zenith-animated-bg${narrow ? ' zenith-root--mobile-nav' : ''}`}>
      {/* No overflow-x-clip here: CSS pairs non-visible overflow-x with overflow-y:auto and Chrome/Android PWA
          clips Recharts SVG while document-scrolling. Width is contained via zenith-root + min-w-0 / max-w-full. */}
      <div className="min-w-0 max-w-full">
      <div className="zenith-command-offline-stack">
        <CommandBar
          stacked
          availableFYs={availableFYs}
          selectedFYs={selectedFYs}
          selectedQuarters={selectedQuarters}
          selectedMonths={selectedMonths}
          onFYChange={setSelectedFYs}
          onQuarterChange={setSelectedQuarters}
          onMonthChange={setSelectedMonths}
          onResetFilters={handleResetFilters}
          onShowBriefing={showBriefing}
          isOnline={isOnline}
          filterSummary={filterSummary}
          dataUpdatedAt={dataUpdatedAt}
          isRefreshing={isFetching && !isLoading}
        />

        <OfflineBanner
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingCount={pendingCount}
          syncError={syncError}
          onSyncNow={syncNow}
          showOnlineAck={showOnlineAck}
        />
      </div>

      {isOfflineSnapshot && hasZenithBodyData ? (
        <ZenithOfflineSnapshotBanner savedAt={offlineSnapshotAt} />
      ) : null}

      <div id="zenith-mobile-nav-sentinel" className="h-0 w-0 overflow-hidden" aria-hidden />

      {/* Solar news — above Ask; AI Insights stays under KPI tiles in role bodies */}
      {user?.role ? <SolarNewsTicker deferLoadMs={2000} /> : null}

      {/* Desktop: Ask in page flow. Mobile: dedicated Ask tab surface. */}
      {showAskSurface ? (
        <section
          id="zenith-ask-surface"
          className={`zenith-ask-page-block zenith-exec-main mx-auto px-3 sm:px-5 pt-3 pb-1${
            showAskSideSuggestions ? ' zenith-ask-page-block--with-suggestions' : ''
          }${narrow ? ' zenith-ask-page-block--mobile-surface' : ''}`}
          aria-label="Zenith Ask"
        >
          <div className="zenith-ask-page-block__row">
            <div className="zenith-ask-page-block__composer">
              <ZenithAskComposer
                value={askValue}
                onChange={setAskValue}
                onSubmit={(q, source) => {
                  void runZenithAsk(q, source ?? 'typed')
                }}
                loading={askLoading}
                isOnline={isOnline}
              />
            </div>
            {showAskSideSuggestions ? (
              <aside className="zenith-ask-suggestions" aria-label="Example questions">
                <div className="zenith-ask-suggestions__head">
                  <span className="zenith-ask-examples__label">Try asking</span>
                  <p className="zenith-ask-suggestions__sub">
                    Tap a prompt to run it with your current filters ({askFilterSummary})
                    {!isOnline
                      ? ' — reconnect to run Ask'
                      : ' · Press / or A to focus Ask'}
                  </p>
                </div>
                <div className="zenith-ask-examples zenith-ask-examples--panel">
                  {askExampleChips.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={!isOnline}
                      onClick={() => {
                        trackZenithAskEvent('ask_chip_click', { role: user?.role, source: 'chip' })
                        void runZenithAsk(q, 'chip')
                      }}
                      className="zenith-ask-examples__chip"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
          {!askPanelDismissed ? (
            <ZenithAskPanel
              result={askResult}
              error={askError}
              loading={askLoading}
              history={askHistory}
              filterSummary={askFilterSummary}
              role={user?.role}
              onClose={() => {
                setAskResult(null)
                setAskError(null)
                setAskPanelDismissed(true)
              }}
              onAskSuggestion={(q, source) => {
                void runZenithAsk(q, source === 'catalog' ? 'catalog' : 'follow_up')
              }}
              onReplayHistory={(item) => {
                void runZenithAsk(item.question, 'history')
              }}
            />
          ) : null}
          {showAskMoreChips ? (
            <div className="zenith-ask-more" aria-label="More example questions">
              <span className="zenith-ask-more__label">More questions</span>
              <div className="zenith-ask-examples">
                {askMoreChips.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={!isOnline}
                    onClick={() => {
                      trackZenithAskEvent('ask_chip_click', { role: user?.role, source: 'chip' })
                      void runZenithAsk(q, 'chip')
                    }}
                    className="zenith-ask-examples__chip"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* AI Insights — under Ask (or under Solar News when Ask is hidden for Ops/Finance) */}
      {insightsBar}

      {showQuickActionDrawer && quickAction.listMode && quickAction.isOpen ? (
        <div
          className="mx-3 sm:mx-5 mt-2 mb-0 flex items-center justify-between rounded-lg border px-4 py-1.5"
          style={{
            background: 'var(--accent-gold-muted)',
            borderColor: 'var(--accent-gold-border)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <span className="text-xs truncate pr-2 text-[color:var(--accent-gold)]">
            Viewing: {quickAction.filterLabel}
          </span>
          <button
            type="button"
            onClick={() => quickAction.closeDrawer()}
            className="shrink-0 text-xs cursor-pointer bg-transparent border-0 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
          >
            Clear ×
          </button>
        </div>
      ) : null}

      {isFyError && (
        <div className="max-w-xl mx-auto mt-6 px-4 rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-5 text-sm text-[color:var(--text-primary)]">
          <p className="font-semibold text-[color:var(--accent-red)]">Unable to load financial years</p>
          <p className="mt-2 text-[color:var(--text-secondary)]">{getFriendlyApiErrorMessage(fyError)}</p>
          <button
            type="button"
            onClick={() => refetchFYs()}
            className="mt-4 px-4 py-2 rounded-xl bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] font-bold text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {showZenithLoadError && (
        <div className="max-w-xl mx-auto mt-6 px-4 rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-5 text-sm text-[color:var(--text-primary)]">
          <p className="font-semibold text-[color:var(--accent-red)]">Unable to load Zenith data</p>
          <p className="mt-2 text-[color:var(--text-secondary)]">{getFriendlyApiErrorMessage(error)}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] font-bold text-sm touch-manipulation"
          >
            Try again
          </button>
        </div>
      )}

      {showZenithBodyShell ? body : null}

      {showZenithEmptyState ? (
        <div className="mx-3 sm:mx-5 mt-6 max-w-xl rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 text-center shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Zenith data is not available</p>
          <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
            The dashboard returned no metrics for your filters. Try again, or refresh the app if the screen stays blank.
          </p>
          <button
            type="button"
            onClick={() => {
              clearZenithDrawerBodyLock()
              void refetchFYs()
              void refetch()
            }}
            className="mt-4 min-h-[44px] rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)] touch-manipulation"
          >
            Reload Zenith
          </button>
        </div>
      ) : null}

      {showQuickActionDrawer ? (
        <QuickActionDrawer
          isOpen={quickAction.isOpen}
          projectId={quickAction.project?.id ?? null}
          onClose={quickAction.closeDrawer}
          listMode={quickAction.listMode}
          filterLabel={quickAction.filterLabel}
          filteredProjects={quickAction.filteredProjects}
          listAmountMode={quickAction.listAmountMode}
          autoFocusSection={quickAction.autoFocusSection}
          projectsPageHref={quickAction.projectsPageHref}
          onPatchListProject={quickAction.patchFilteredProject}
          onSelectProjectFromList={
            user?.role === UserRole.ADMIN ||
            user?.role === UserRole.MANAGEMENT ||
            user?.role === UserRole.OPERATIONS
              ? handOffListPickToOperationsDrawer
              : undefined
          }
        />
      ) : null}

      {showFinancePaymentDrawer ? (
        <FinanceQuickDrawer
          isOpen={financeQuickDrawer.isOpen}
          projectId={financeQuickDrawer.projectId}
          readOnly={user?.role === UserRole.MANAGEMENT}
          onClose={financeQuickDrawer.close}
        />
      ) : null}

      {showOperationsLifecycleDrawer ? (
        <OperationsQuickDrawer
          isOpen={operationsQuickDrawer.isOpen}
          projectId={operationsQuickDrawer.projectId}
          readOnly={user?.role === UserRole.MANAGEMENT}
          onClose={operationsQuickDrawer.close}
        />
      ) : null}

      {narrow && user?.role ? (
        <>
          <ZenithMobileStickyActions
            onShowBriefing={showBriefing}
            showAskLauncher={showZenithAsk && mobileTab !== 'ask'}
            onOpenAsk={focusAskInput}
          />
          <ZenithMobileBottomNav
            role={user.role}
            activeTab={mobileTab}
            onTabChange={handleMobileTabChange}
            showHitList={showExecHitList}
            showAsk={showZenithAsk}
            pendingSyncCount={pendingCount}
            isOnline={isOnline}
          />
        </>
      ) : null}

      <AnimatePresence>
        {isVisible && user?.role ? (
          <DailyBriefing
            isVisible={isVisible}
            onDismiss={dismiss}
            role={user.role}
            currentUserName={user.name}
            data={(zenithData ?? {}) as Record<string, unknown>}
            explorerProjects={explorerProjects}
            myDaySnapshot={myDaySnapQ.data ?? null}
            myDaySnapshotLoading={myDaySnapQ.isLoading}
            myDaySnapshotError={myDaySnapQ.isError}
          />
        ) : null}
      </AnimatePresence>
      </div>
    </div>
  )
}

export default Zenith
