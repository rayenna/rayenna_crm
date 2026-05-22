import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import { useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useZenithMainQuery } from '../hooks/useZenithMainQuery'
import '../styles/zenith.css'
import CommandBar from '../components/zenith/CommandBar'
import DailyBriefing from '../components/zenith/DailyBriefing'
import ZenithExecutiveBody from '../components/zenith/ZenithExecutiveBody'
import ZenithOperationsBody from '../components/zenith/ZenithOperationsBody'
import ZenithFinanceBody from '../components/zenith/ZenithFinanceBody'
import ZenithAiInsightsTicker from '../components/zenith/ZenithAiInsightsTicker'
import SolarNewsTicker from '../components/zenith/SolarNewsTicker'
import { buildZenithAiInsights } from '../components/zenith/zenithAiInsights'
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
import ZenithOfflineSnapshotBanner from '../components/zenith/ZenithOfflineSnapshotBanner'
import { fetchZenithWithOfflineCache } from '../utils/zenithOfflineFetch'
import {
  isZenithOfflineSnapshotPayload,
  stripZenithOfflineSnapshotMeta,
  zenithQueryCacheKey,
} from '../utils/zenithOfflineCache'
import { clearZenithDrawerBodyLock } from '../utils/zenithDrawerLifecycle'

const Zenith = () => {
  const { user } = useAuth()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const { isVisible, dismiss, showBriefing } = useDailyBriefing()
  const quickAction = useQuickAction()
  const financeQuickDrawer = useFinanceQuickDrawer()
  const operationsQuickDrawer = useOperationsQuickDrawer()
  const { isOnline, isSyncing, pendingCount, syncError, syncNow } = useOfflineSync()

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

  const execZenithRole =
    user?.role === UserRole.SALES ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.ADMIN

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
  const narrow = useZenithNarrowLayout()
  const [mobileTab, setMobileTab] = useState<ZenithMobileTab>('overview')

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
    isError,
    error,
    refetch,
  } = useZenithMainQuery(
    user?.role,
    selectedFYs,
    selectedQuarters,
    selectedMonths,
    initialDataWhenFiltersEmpty,
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
  })

  const insights = useMemo(() => {
    if (!user?.role) return []
    return buildZenithAiInsights(user.role, zenithDataClean, dateFilter, {
      salesTeamPipeline: salesPerfInsights?.salesTeamData,
    })
  }, [user?.role, zenithDataClean, dateFilter, salesPerfInsights?.salesTeamData])

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
    [user?.role, quickAction, operationsQuickDrawer],
  )

  const handOffListPickToOperationsDrawer = useCallback(
    (projectId: string) => {
      operationsQuickDrawer.open(projectId)
      quickAction.closeDrawer()
    },
    [operationsQuickDrawer, quickAction],
  )

  const mobileTabProp = narrow ? mobileTab : null

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
            quickAction={quickAction}
            mobileTab={mobileTabProp}
            onOpenFinanceDrawer={
              user.role === UserRole.ADMIN || user.role === UserRole.MANAGEMENT
                ? financeQuickDrawer.open
                : undefined
            }
            onOpenOperationsDrawer={operationsQuickDrawer.open}
            onOpenProjectQuickDrawer={openZenithProjectQuickDrawer}
          />
        )
      case UserRole.OPERATIONS:
        return (
          <ZenithOperationsBody
            data={data}
            isLoading={isLoading}
            dateFilter={dateFilter}
            quickAction={quickAction}
            mobileTab={mobileTabProp}
            onOpenOperationsDrawer={operationsQuickDrawer.open}
            onOpenProjectQuickDrawer={openZenithProjectQuickDrawer}
          />
        )
      case UserRole.FINANCE:
        return (
          <ZenithFinanceBody
            data={data}
            isLoading={isLoading}
            dateFilter={dateFilter}
            quickAction={quickAction}
            mobileTab={mobileTabProp}
            onOpenFinanceDrawer={financeQuickDrawer.open}
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
    quickAction,
    financeQuickDrawer.open,
    operationsQuickDrawer.open,
    openZenithProjectQuickDrawer,
    mobileTabProp,
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

      {/* Solar news — place above AI insights bar */}
      {user?.role ? <SolarNewsTicker /> : null}

      {!isFyError && user?.role && (hasZenithBodyData || !isError) ? (
        <ZenithAiInsightsTicker insights={insights} isLoading={isLoading && !hasZenithBodyData} />
      ) : null}

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
          <ZenithMobileStickyActions onShowBriefing={showBriefing} />
          <ZenithMobileBottomNav
            role={user.role}
            activeTab={mobileTab}
            onTabChange={setMobileTab}
            showHitList={showExecHitList}
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
