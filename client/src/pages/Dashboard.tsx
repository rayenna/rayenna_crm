import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import SalesDashboard from '../components/dashboard/SalesDashboard'
import OperationsDashboard from '../components/dashboard/OperationsDashboard'
import FinanceDashboard from '../components/dashboard/FinanceDashboard'
import ManagementDashboard from '../components/dashboard/ManagementDashboard'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import { useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import PageCard from '../components/PageCard'
import { FaChartLine } from 'react-icons/fa'

const Dashboard = () => {
  const { user } = useAuth()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])

  // Fetch available FYs from dashboard data based on user role
  const { data: dashboardData, error: fyError, isError: isFyError, refetch: refetchFYs } = useQuery({
    queryKey: ['dashboard', 'fys', user?.role],
    queryFn: async () => {
      // Sales: full dashboard payload (also used as initialData when filters empty)
      if (user?.role === UserRole.SALES) {
        const res = await axiosInstance.get('/api/dashboard/sales')
        return res.data
      }
      // Operations / Finance: FY list only — avoids loading full /management just for the filter bar
      if (user?.role === UserRole.OPERATIONS || user?.role === UserRole.FINANCE) {
        const res = await axiosInstance.get('/api/dashboard/financial-years')
        return res.data
      }
      // Management / Admin: full management payload for FYs + initialData when filters empty
      const res = await axiosInstance.get('/api/dashboard/management')
      return res.data
    },
    enabled: !!user, // Fetch to get available FYs
  })

  const availableFYs =
    dashboardData?.projectValueProfitByFY?.map((item: any) => item.fy).filter(Boolean) || []

  // Reuse first fetch when filters are empty to avoid double request (Management/Admin and Sales)
  const filtersEmpty = selectedFYs.length === 0 && selectedQuarters.length === 0 && selectedMonths.length === 0
  const initialDataWhenFiltersEmpty = filtersEmpty ? dashboardData : undefined

  const getDashboardComponent = () => {
    switch (user?.role) {
      case UserRole.SALES:
        return (
          <SalesDashboard
            selectedFYs={selectedFYs}
            selectedQuarters={selectedQuarters}
            selectedMonths={selectedMonths}
            initialDataWhenFiltersEmpty={initialDataWhenFiltersEmpty}
          />
        )
      case UserRole.OPERATIONS:
        return <OperationsDashboard selectedFYs={selectedFYs} selectedQuarters={selectedQuarters} selectedMonths={selectedMonths} />
      case UserRole.FINANCE:
        return <FinanceDashboard selectedFYs={selectedFYs} selectedQuarters={selectedQuarters} selectedMonths={selectedMonths} />
      case UserRole.MANAGEMENT:
        return (
          <ManagementDashboard
            selectedFYs={selectedFYs}
            selectedQuarters={selectedQuarters}
            selectedMonths={selectedMonths}
            initialDataWhenFiltersEmpty={initialDataWhenFiltersEmpty}
          />
        )
      case UserRole.ADMIN:
        return (
          <ManagementDashboard
            selectedFYs={selectedFYs}
            selectedQuarters={selectedQuarters}
            selectedMonths={selectedMonths}
            initialDataWhenFiltersEmpty={initialDataWhenFiltersEmpty}
            showLifecycleBrandReminder
          />
        )
      default:
        return <div>No dashboard available</div>
    }
  }

  const announcementProposal =
    'New: Rayenna Proposal Engine is now live — create full solar proposals in one click from any eligible project in the CRM.'
  const announcementZenith =
    'Zenith is live — your solar CRM, now reimagined as a command center. Try it under Dashboard.'

  const renderMarqueeUnit = () => (
    <>
      <span className="inline-flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-300 text-primary-900 shadow-sm shrink-0">
          New
        </span>
        <span>{announcementProposal}</span>
      </span>
      <span className="mx-6 sm:mx-8 text-amber-100/90" aria-hidden>
        •
      </span>
      <span>{announcementZenith}</span>
      <span className="mx-6 sm:mx-8 text-amber-100/90" aria-hidden>
        •
      </span>
    </>
  )

  return (
    <div className="px-0 -mt-6 pt-0 pb-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden dashboard-mobile-no-clip">
      {/* Proposal Engine launch banner – tight under header */}
      <style>
        {`@keyframes ray-proposal-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }`}
      </style>
      <div className="mb-2 px-3 sm:px-0">
        <div className="relative overflow-hidden rounded-xl border border-primary-800/70 bg-gradient-to-r from-primary-700 via-primary-600 to-amber-400 text-white shadow-md">
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-amber-300/60 to-transparent pointer-events-none" />
          <div className="flex items-center px-4 py-2">
            <div className="flex-1 overflow-hidden">
              <div
                className="inline-block whitespace-nowrap text-[11px] sm:text-sm font-semibold"
                style={{
                  animation: 'ray-proposal-marquee 32s linear infinite',
                }}
              >
                {renderMarqueeUnit()}
                {renderMarqueeUnit()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageCard
        title="Dashboard"
        subtitle="Monitor your business performance at a glance"
        icon={<FaChartLine className="w-5 h-5 text-white" />}
        className="max-w-full page-card-no-clip-mobile"
      >
      <DashboardFilters
        availableFYs={availableFYs}
        selectedFYs={selectedFYs}
        selectedQuarters={selectedQuarters}
        selectedMonths={selectedMonths}
        onFYChange={setSelectedFYs}
        onQuarterChange={setSelectedQuarters}
        onMonthChange={setSelectedMonths}
      />
      {isFyError && (
        <div className="w-full min-w-0 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5 md:p-6 text-amber-800 text-sm sm:text-base break-words">
          <p className="font-medium">Unable to load dashboard filters.</p>
          <p className="mt-2 text-amber-700 leading-snug">{getFriendlyApiErrorMessage(fyError)}</p>
          <button
            type="button"
            onClick={() => refetchFYs()}
            className="mt-4 min-h-[44px] px-4 py-3 sm:py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 active:opacity-90 touch-manipulation"
          >
            Try again
          </button>
        </div>
      )}
      {!isFyError && getDashboardComponent()}

      {/* Footnote for Operations and Finance views (both include Pending Installation quick tile) */}
      {(user?.role === UserRole.OPERATIONS || user?.role === UserRole.FINANCE) && (
        <footer className="mt-8 pt-6 border-t border-primary-100 min-w-0 max-w-full bg-gradient-to-br from-primary-50/30 to-transparent rounded-xl p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed break-words">
            <span className="font-semibold text-gray-600">Note:</span>
            <br />
            1. Pending Installation Quick Access Tile displays those projects, which are in Stages "Confirmed" and "Under Installation"
          </p>
        </footer>
      )}

      {/* Footnote for Admin, Sales and Management views */}
      {(user?.role === UserRole.ADMIN || user?.role === UserRole.SALES || user?.role === UserRole.MANAGEMENT) && (
        <footer className="mt-8 pt-6 border-t border-primary-100 min-w-0 max-w-full bg-gradient-to-br from-primary-50/30 to-transparent rounded-xl p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed break-words">
            <span className="font-semibold text-gray-600">Note:</span>
            <br />
            1. Revenue = Sum of Order Value of Projects in the Project Stages – a. Confirmed Order, b. Installation, c. Completed and; d. Completed – Subsidy Credited
            <br />
            2. Pipeline = Sum of Order Value of Projects in all Project Stages EXCEPT Lost
            <br />
            3. Pipeline Conversion (%) = (Total Revenue / Total Pipeline) × 100
            <br />
            4. Open Deals includes those that are in Lead, Site Survey and Proposal stages.
            <br />
            5. Rest (Proposal Engine quick tile): projects in Proposal or Confirmed stage that are not yet started in Proposal Engine (not selected in PE). Each row in the Proposal Engine tile opens Projects with the matching pre-filtered view.
          </p>
        </footer>
      )}
      </PageCard>
    </div>
  )
}

export default Dashboard
