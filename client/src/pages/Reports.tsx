import { Link } from 'react-router-dom'
import { Banknote, BarChart3, ChevronRight, ClipboardList, Wrench } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_ROLES } from '../constants/routeRoles'

export default function Reports() {
  const { hasRole } = useAuth()
  const canAccess = hasRole([...ROUTE_ROLES.reports])
  const canSalesReview = hasRole([...ROUTE_ROLES.salesReview])
  const canDelivery = hasRole([...ROUTE_ROLES.deliveryControl])
  const canCollections = hasRole([...ROUTE_ROLES.collectionsCash])

  return (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">
        <header className="mb-6 flex items-start gap-3 pt-2 sm:pt-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
            <ClipboardList className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
              Reports
            </h1>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
              Weekly-call packs and deeper views. More reports will land here.
            </p>
          </div>
        </header>

        {!canAccess ? (
          <div className="rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-6 text-sm text-[color:var(--text-primary)]">
            Reports are available to Admin, Management, Operations, Finance, and Sales.
          </div>
        ) : (
          <div className="space-y-3">
            {canSalesReview ? (
              <Link
                to="/reports/sales-review"
                className="group flex min-h-[44px] items-start justify-between gap-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] transition-colors hover:border-[color:var(--accent-gold-border)] sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)]">
                    <BarChart3 className="h-5 w-5 text-[color:var(--accent-teal)]" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)] sm:text-lg">
                      Sales Review
                    </h2>
                    <p className="mt-1 text-sm leading-snug text-[color:var(--text-secondary)]">
                      Achievement vs last two FYs, weighted forecast for the next four quarters, and the
                      open deal list — one screen for the weekly seller review.
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                      Admin · Management · Sales (own book)
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="mt-1 h-5 w-5 shrink-0 text-[color:var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--accent-gold)]"
                  aria-hidden
                />
              </Link>
            ) : null}

            {canDelivery ? (
              <Link
                to="/reports/delivery-control"
                className="group flex min-h-[44px] items-start justify-between gap-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] transition-colors hover:border-[color:var(--accent-gold-border)] sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)]">
                    <Wrench className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)] sm:text-lg">
                      Delivery Control
                    </h2>
                    <p className="mt-1 text-sm leading-snug text-[color:var(--text-secondary)]">
                      Confirmed jobs still in the factory — commissioning, ops load, KSEB / MNRE
                      blockers, and the subsidy clock until credit lands.
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                      Admin · Management · Operations · Sales (own book)
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="mt-1 h-5 w-5 shrink-0 text-[color:var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--accent-gold)]"
                  aria-hidden
                />
              </Link>
            ) : null}

            {canCollections ? (
              <Link
                to="/reports/collections-cash"
                className="group flex min-h-[44px] items-start justify-between gap-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] transition-colors hover:border-[color:var(--accent-gold-border)] sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)]">
                    <Banknote className="h-5 w-5 text-[color:var(--accent-teal)]" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)] sm:text-lg">
                      Collections & Cash
                    </h2>
                    <p className="mt-1 text-sm leading-snug text-[color:var(--text-secondary)]">
                      Confirmed orders only: staged collections, aging, loan-stuck, and subsidy in
                      flight — not pipeline.
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                      Admin · Management · Finance · Sales (own book)
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="mt-1 h-5 w-5 shrink-0 text-[color:var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--accent-gold)]"
                  aria-hidden
                />
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
