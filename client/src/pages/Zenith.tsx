import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import { useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useZenithMainQuery } from '../hooks/useZenithMainQuery'
import '../styles/zenith.css'
import CommandBar from '../components/zenith/CommandBar'
import ZenithExecutiveBody from '../components/zenith/ZenithExecutiveBody'
import ZenithOperationsBody from '../components/zenith/ZenithOperationsBody'
import ZenithFinanceBody from '../components/zenith/ZenithFinanceBody'

const Zenith = () => {
  const { user } = useAuth()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])

  const { data: dashboardData, error: fyError, isError: isFyError, refetch: refetchFYs, dataUpdatedAt: fyUpdatedAt } =
    useQuery({
      queryKey: ['dashboard', 'fys', user?.role],
      queryFn: async () => {
        if (user?.role === UserRole.SALES) {
          const res = await axiosInstance.get('/api/dashboard/sales')
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
    dataUpdatedAt: zenithUpdatedAt,
  } = useZenithMainQuery(
    user?.role,
    selectedFYs,
    selectedQuarters,
    selectedMonths,
    initialDataWhenFiltersEmpty,
  )

  const dateFilter = { selectedFYs, selectedQuarters, selectedMonths }
  const lastRefresh = Math.max(zenithUpdatedAt ?? 0, fyUpdatedAt ?? 0) || undefined

  const handleResetFilters = () => {
    setSelectedFYs([])
    setSelectedQuarters([])
    setSelectedMonths([])
  }

  const body = (() => {
    if (!user?.role) return null
    switch (user.role) {
      case UserRole.SALES:
      case UserRole.MANAGEMENT:
      case UserRole.ADMIN:
        return (
          <ZenithExecutiveBody
            role={user.role}
            data={(zenithData ?? {}) as Record<string, unknown>}
            isLoading={isLoading}
            dateFilter={dateFilter}
          />
        )
      case UserRole.OPERATIONS:
        return (
          <ZenithOperationsBody
            data={(zenithData ?? {}) as Record<string, unknown>}
            isLoading={isLoading}
            dateFilter={dateFilter}
          />
        )
      case UserRole.FINANCE:
        return (
          <ZenithFinanceBody
            data={(zenithData ?? {}) as Record<string, unknown>}
            isLoading={isLoading}
            dateFilter={dateFilter}
          />
        )
      default:
        return (
          <div className="px-6 py-20 text-center text-white/60">
            No Zenith view is available for your role.
          </div>
        )
    }
  })()

  return (
    <div className="zenith-root zenith-animated-bg min-h-screen">
      <CommandBar
        user={user}
        availableFYs={availableFYs}
        selectedFYs={selectedFYs}
        selectedQuarters={selectedQuarters}
        selectedMonths={selectedMonths}
        onFYChange={setSelectedFYs}
        onQuarterChange={setSelectedQuarters}
        onMonthChange={setSelectedMonths}
        onResetFilters={handleResetFilters}
        dataUpdatedAt={lastRefresh}
      />

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
    </div>
  )
}

export default Zenith
