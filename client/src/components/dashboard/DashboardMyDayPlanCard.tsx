import { Sun } from 'lucide-react'
import { useMyDayContext } from '../../contexts/MyDayContext'
import { useMyDaySnapshotQuery } from '../../hooks/useMyDaySnapshotQuery'
import { useMyDaySuggestionsQuery } from '../../hooks/useMyDaySuggestionsQuery'
import SuggestedTaskRow from '../my-day/components/SuggestedTaskRow'
import MyDayButton from '../my-day/MyDayButton'

/**
 * Classic Dashboard — compact "Today's plan" surfacing My Day + CRM suggestions.
 * Additive only; does not alter role dashboard queries.
 */
export default function DashboardMyDayPlanCard() {
  const { openTab } = useMyDayContext()
  const snapQ = useMyDaySnapshotQuery(true)
  const suggestionsQ = useMyDaySuggestionsQuery(true)

  const snap = snapQ.data
  const suggestions = suggestionsQ.data ?? []
  const loading = snapQ.isLoading || suggestionsQ.isLoading

  const hasPersonal =
    snap &&
    (snap.summaryFragments.length > 0 ||
      snap.teaserLines.length > 0 ||
      !snap.isQuietPersonal ||
      snap.journalStarted)

  const showSuggestions = suggestions.length > 0
  const showEmptyCta = !loading && !hasPersonal && !showSuggestions && !snapQ.isError

  return (
    <section
      className="mb-5 min-w-0 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-5"
      aria-labelledby="dashboard-myday-plan-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
            <h2
              id="dashboard-myday-plan-heading"
              className="text-base font-bold text-[color:var(--text-primary)]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Today&apos;s plan
            </h2>
          </div>
          <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
            Personal tasks and CRM follow-ups — synced across devices.
          </p>

          {loading ? (
            <div className="mt-3 space-y-2" aria-busy="true">
              <div className="h-3 w-2/3 max-w-md animate-pulse rounded bg-[color:var(--bg-badge)]" />
              <div className="h-3 w-1/2 max-w-sm animate-pulse rounded bg-[color:var(--bg-badge)]" />
            </div>
          ) : null}

          {!loading && snapQ.isError ? (
            <p className="mt-3 text-[13px] text-[color:var(--text-secondary)]">
              Could not load My Day. Use the ☀ button in the top bar to open your drawer.
            </p>
          ) : null}

          {!loading && snap && snap.summaryFragments.length > 0 ? (
            <p className="mt-3 text-[13px] font-semibold text-[color:var(--text-primary)]">
              {snap.summaryFragments.join(' · ')}
            </p>
          ) : null}

          {showEmptyCta ? (
            <p className="mt-3 text-[13px] text-[color:var(--text-secondary)]">
              Pin follow-ups from Zenith <strong className="font-semibold text-[color:var(--text-primary)]">Hit List</strong>{' '}
              with <strong className="font-semibold text-[color:var(--text-primary)]">+ My Day</strong>, or add tasks below.
            </p>
          ) : null}

          {!loading && snap && snap.isQuietPersonal && snap.summaryFragments.length === 0 && !showEmptyCta ? (
            <p className="mt-3 text-[13px] text-[color:var(--text-secondary)]">
              You&apos;re caught up on tasks and reminders. Add follow-ups from Zenith Hit List or below.
            </p>
          ) : null}

          {!loading && snap && snap.teaserLines.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {snap.teaserLines.slice(0, 3).map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 20)}`}
                  className="border-l-2 border-[color:var(--accent-gold-muted)] pl-3 text-[13px] leading-snug text-[color:var(--text-primary)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : null}

          {!loading && showSuggestions ? (
            <div className="mt-4 border-t border-[color:var(--border-default)] pt-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-muted)]">
                Suggested from CRM
              </p>
              {suggestions.slice(0, 3).map((s) => (
                <SuggestedTaskRow key={s.id} suggestion={s} />
              ))}
              {suggestions.length > 3 ? (
                <p className="mt-2 text-[12px] text-[color:var(--text-muted)]">
                  +{suggestions.length - 3} more in My Day
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openTab('tasks')}
            className="min-h-[44px] rounded-xl border border-[color:var(--border-default)] px-4 py-2 text-sm font-bold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--accent-gold-border)] hover:text-[color:var(--text-primary)]"
          >
            Open tasks
          </button>
          <MyDayButton variant="briefing" />
        </div>
      </div>
    </section>
  )
}
