import { useCallback, useMemo, useState } from 'react'
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
import { buildZenithAiInsights } from '../components/zenith/zenithAiInsights'
import { AnimatePresence } from 'framer-motion'
import { useDailyBriefing } from '../hooks/useDailyBriefing'
import { useQuickAction } from '../hooks/useQuickAction'
import QuickActionDrawer from '../components/zenith/QuickActionDrawer'

const Zenith = () => {
  const { user } = useAuth()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const { isVisible, dismiss, showBriefing } = useDailyBriefing()
  const quickAction = useQuickAction()

  const execZenithRole =
    user?.role === UserRole.SALES ||
    user?.role === UserRole.MANAGEMENT ||
    user?.role === UserRole.ADMIN

  const showQuickActionDrawer = execZenithRole || user?.role === UserRole.OPERATIONS

  const { data: dashboardData, error: fyError, isError: isFyError, refetch: refetchFYs } =
    useQuery({
      queryKey: ['dashboard', 'fys', user?.role],
      queryFn: async () => {
        if (user?.role === UserRole.SALES) {
          const res = await axiosInstance.get('/api/dashboard/sales')
          return res.data
        }
        if (user?.role === UserRole.OPERATIONS || user?.role === UserRole.FINANCE) {
          const res = await axiosInstance.get('/api/dashboard/financial-years')
          return res.data
        }
        const res = await axiosInstance.get('/api/dashboard/management')
        return res.data
      },
      enabled: !!user,
    })

  const availableFYs =
    (dashboardData as { projectValueProfitByFY?: { fy: string }[] })?.projectValueProfitByFY
      ?.map((item) => item.fy)
      .filter(Boolean) ?? []

  const filtersEmpty =
    selectedFYs.length === 0 && selectedQuarters.length === 0 && selectedMonths.length === 0
  const initialDataWhenFiltersEmpty = filtersEmpty ? dashboardData : undefined

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
    const d = (zenithData ?? {}) as Record<string, unknown>
    return buildZenithAiInsights(user.role, d, dateFilter, {
      salesTeamPipeline: salesPerfInsights?.salesTeamData,
    })
  }, [user?.role, zenithData, dateFilter, salesPerfInsights?.salesTeamData])

  const handleResetFilters = useCallback(() => {
    setSelectedFYs([])
    setSelectedQuarters([])
    setSelectedMonths([])
  }, [])

  const body = useMemo(() => {
    if (!user?.role) return null
    const data = (zenithData ?? {}) as Record<string, unknown>
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
          />
        )
      case UserRole.OPERATIONS:
        return (
          <ZenithOperationsBody
            data={data}
            isLoading={isLoading}
            dateFilter={dateFilter}
            quickAction={quickAction}
          />
        )
      case UserRole.FINANCE:
        return (
          <ZenithFinanceBody data={data} isLoading={isLoading} dateFilter={dateFilter} />
        )
      default:
        return (
          <div className="px-6 py-20 text-center text-white/60">
            No Zenith view is available for your role.
          </div>
        )
    }
  }, [user?.role, zenithData, isLoading, dateFilter, quickAction])

  return (
    <div className="zenith-root zenith-animated-bg">
      <CommandBar
        availableFYs={availableFYs}
        selectedFYs={selectedFYs}
        selectedQuarters={selectedQuarters}
        selectedMonths={selectedMonths}
        onFYChange={setSelectedFYs}
        onQuarterChange={setSelectedQuarters}
        onMonthChange={setSelectedMonths}
        onResetFilters={handleResetFilters}
        onShowBriefing={showBriefing}
      />

      {!isFyError && !isError && user?.role ? (
        <ZenithAiInsightsTicker insights={insights} isLoading={isLoading} />
      ) : null}

      {execZenithRole && quickAction.listMode && quickAction.isOpen ? (
        <div
          className="mx-3 sm:mx-5 mt-2 mb-0 flex items-center justify-between rounded-lg border px-4 py-1.5"
          style={{
            background: 'rgba(245,166,35,0.08)',
            borderColor: 'rgba(245,166,35,0.2)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <span className="text-xs truncate pr-2" style={{ color: '#F5A623' }}>
            Viewing: {quickAction.filterLabel}
          </span>
          <button
            type="button"
            onClick={() => quickAction.closeDrawer()}
            className="shrink-0 text-xs cursor-pointer bg-transparent border-0 text-white/40 hover:text-white/70"
          >
            Clear ×
          </button>
        </div>
      ) : null}

      {isFyError && (
        <div className="max-w-xl mx-auto mt-6 px-4 rounded-2xl border border-[#ff4757]/30 bg-[#ff4757]/10 p-5 text-sm text-white/90">
          <p className="font-semibold text-[#ff4757]">Unable to load financial years</p>
          <p className="mt-2 text-white/70">{getFriendlyApiErrorMessage(fyError)}</p>
          <button
            type="button"
            onClick={() => refetchFYs()}
            className="mt-4 px-4 py-2 rounded-xl bg-[#f5a623] text-[#0a0a0f] font-bold text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {!isFyError && isError && (
        <div className="max-w-xl mx-auto mt-6 px-4 rounded-2xl border border-[#ff4757]/30 bg-[#ff4757]/10 p-5 text-sm text-white/90">
          <p className="font-semibold text-[#ff4757]">Unable to load Zenith data</p>
          <p className="mt-2 text-white/70">{getFriendlyApiErrorMessage(error)}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 rounded-xl bg-[#f5a623] text-[#0a0a0f] font-bold text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {!isFyError && !isError ? body : null}

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
        />
      ) : null}

      <AnimatePresence>
        {isVisible && user?.role ? (
          <DailyBriefing
            isVisible={isVisible}
            onDismiss={dismiss}
            role={user.role}
            currentUserName={user.name}
            data={(zenithData ?? {}) as Record<string, unknown>}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default Zenith
