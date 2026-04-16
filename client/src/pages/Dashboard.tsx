import { useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import SalesDashboard from '../components/dashboard/SalesDashboard'
import OperationsDashboard from '../components/dashboard/OperationsDashboard'
import FinanceDashboard from '../components/dashboard/FinanceDashboard'
import ManagementDashboard from '../components/dashboard/ManagementDashboard'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import { useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { LayoutDashboard } from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])

  const shell = (children: ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

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
    'Zenith is LIVE = Your Solar CRM, now reimagined as a Command Centre. Go to Dashboard Menu and Click on Zenith to Open and Try it.'

  const renderMarqueeUnit = () => (
    <>
      <span className="inline-flex items-center gap-2">
        <span className="shrink-0 rounded-full bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--accent-gold)] shadow-sm ring-1 ring-[color:var(--accent-gold-border)]">
          New
        </span>
        <span className="text-[color:var(--text-primary)]">{announcementProposal}</span>
      </span>
      <span className="mx-6 text-[color:var(--text-muted)] sm:mx-8" aria-hidden>
        •
      </span>
      <span className="text-[color:var(--text-primary)]">{announcementZenith}</span>
      <span className="mx-6 text-[color:var(--text-muted)] sm:mx-8" aria-hidden>
        •
      </span>
    </>
  )

  return (
    shell(
    <div className="max-w-full min-w-0 overflow-x-hidden dashboard-mobile-no-clip">
      {/* Proposal Engine launch banner – tight under header */}
      <style>
        {`@keyframes ray-proposal-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }`}
      </style>
      <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
              <LayoutDashboard className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">Dashboard</h1>
              <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">Monitor your business performance at a glance</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-4">
        <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[color:var(--accent-gold-muted)] via-transparent to-[color:var(--accent-teal-muted)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[color:var(--accent-gold-muted)] to-transparent" />
          <div className="relative flex items-center px-4 py-2.5">
            <div className="flex-1 overflow-hidden">
              <div
                className="inline-block whitespace-nowrap text-[11px] font-semibold text-[color:var(--text-primary)] sm:text-sm"
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

      <div className="mb-5 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-5">
      <DashboardFilters
        availableFYs={availableFYs}
        selectedFYs={selectedFYs}
        selectedQuarters={selectedQuarters}
        selectedMonths={selectedMonths}
        onFYChange={setSelectedFYs}
        onQuarterChange={setSelectedQuarters}
        onMonthChange={setSelectedMonths}
        variant="zenith"
      />
      </div>
      {isFyError && (
        <div className="w-full min-w-0 max-w-xl rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-4 text-sm break-words text-[color:var(--text-primary)] sm:p-5 sm:text-base md:p-6">
          <p className="font-medium">Unable to load dashboard filters.</p>
          <p className="mt-2 leading-snug text-[color:var(--text-secondary)]">{getFriendlyApiErrorMessage(fyError)}</p>
          <button
            type="button"
            onClick={() => refetchFYs()}
            className="mt-4 min-h-[44px] touch-manipulation rounded-xl bg-[color:var(--accent-gold)] px-4 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] transition-opacity hover:opacity-95 active:opacity-90 sm:py-2.5"
          >
            Try again
          </button>
        </div>
      )}
      {!isFyError && getDashboardComponent()}

      {/* Footnote for Operations and Finance views (both include Pending Installation quick tile) */}
      {(user?.role === UserRole.OPERATIONS || user?.role === UserRole.FINANCE) && (
        <footer className="mt-8 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
          <p className="break-words text-[11px] leading-relaxed text-[color:var(--text-secondary)] sm:text-xs">
            <span className="font-semibold text-[color:var(--text-primary)]">Note:</span>
            <br />
            1. Pending Installation Quick Access Tile displays those projects, which are in Stages "Confirmed" and "Under Installation"
          </p>
        </footer>
      )}

      {/* Footnote for Admin, Sales and Management views */}
      {(user?.role === UserRole.ADMIN || user?.role === UserRole.SALES || user?.role === UserRole.MANAGEMENT) && (
        <footer className="mt-8 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
          <p className="break-words text-[11px] leading-relaxed text-[color:var(--text-secondary)] sm:text-xs">
            <span className="font-semibold text-[color:var(--text-primary)]">Note:</span>
            <br />
            1. Revenue = Sum of Order Value of Projects in the Project Stages – a. Confirmed Order, b. Installation, c. Completed and; d. Completed – Subsidy Credited
            <br />
            2. Pipeline = Sum of Order Value of Projects in all Project Stages EXCEPT Lost
            <br />
            3. Pipeline Conversion (%) = (Total Revenue / Total Pipeline) × 100
            <br />
            4. Open Deals includes those that are in Lead, Site Survey and Proposal stages.
            <br />
            5. Proposal Engine Quick tile: projects in Proposal or Confirmed stage that are not yet started in Proposal Engine (not selected in PE). Each row in the Proposal Engine tile opens Projects with the matching pre-filtered view.
          </p>
        </footer>
      )}
    </div>
    )
  )
}

export default Dashboard
