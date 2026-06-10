import { Sun } from 'lucide-react'
import { useMyDayContext } from '../../contexts/MyDayContext'
import { useMyDaySnapshotQuery } from '../../hooks/useMyDaySnapshotQuery'
import { useMyDaySuggestionsQuery } from '../../hooks/useMyDaySuggestionsQuery'
import SuggestedTaskRow from '../my-day/components/SuggestedTaskRow'
import MyDayButton from '../my-day/MyDayButton'

interface Props {
  /** Side-by-side with lifecycle attention card on lg+. */
  paired?: boolean
  className?: string
}

export default function DashboardMyDayPlanCard({
  paired = false,
  className = '',
}: Props) {
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
      className={[
        'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-gold)]',
        className,
      ].join(' ')}
      aria-labelledby="dashboard-myday-plan-heading"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[color:var(--border-default)] px-3 py-2.5 sm:px-3.5 sm:py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
            <h2
              id="dashboard-myday-plan-heading"
              className="text-sm font-bold leading-tight text-[color:var(--text-primary)]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Today&apos;s plan
            </h2>
          </div>
          {!paired ? (
            <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--text-secondary)]">
              My Day tasks & CRM follow-ups
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => openTab('tasks')}
            className="min-h-[32px] rounded-lg border border-[color:var(--border-default)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--accent-gold-border)] hover:text-[color:var(--text-primary)]"
          >
            Tasks
          </button>
          <MyDayButton variant="briefing" />
        </div>
      </div>

      <div
        className={[
          'min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5 sm:px-3.5 sm:py-3',
          paired ? 'max-h-[220px] lg:max-h-[280px]' : 'max-h-[320px]',
        ].join(' ')}
        tabIndex={0}
        aria-label="Today's plan — scroll for more"
      >
        {loading ? (
          <div className="space-y-1.5" aria-busy="true">
            <div className="h-2.5 w-4/5 animate-pulse rounded bg-[color:var(--bg-badge)]" />
            <div className="h-2.5 w-3/5 animate-pulse rounded bg-[color:var(--bg-badge)]" />
          </div>
        ) : null}

        {!loading && snapQ.isError ? (
          <p className="text-[11px] leading-snug text-[color:var(--text-secondary)]">
            Could not load My Day. Tap ☀ in the top bar.
          </p>
        ) : null}

        {!loading && snap && snap.summaryFragments.length > 0 ? (
          <p className="text-[12px] font-semibold leading-snug text-[color:var(--text-primary)]">
            {snap.summaryFragments.join(' · ')}
          </p>
        ) : null}

        {showEmptyCta ? (
          <p className="mt-1 text-[11px] leading-snug text-[color:var(--text-secondary)]">
            Pin from Zenith <strong className="text-[color:var(--text-primary)]">Hit List</strong> with{' '}
            <strong className="text-[color:var(--text-primary)]">+ My Day</strong>.
          </p>
        ) : null}

        {!loading && snap && snap.isQuietPersonal && snap.summaryFragments.length === 0 && !showEmptyCta ? (
          <p className="mt-1 text-[11px] text-[color:var(--text-secondary)]">Caught up — add from Hit List.</p>
        ) : null}

        {!loading && snap && snap.teaserLines.length > 0 ? (
          <ul className="mt-1.5 space-y-0.5">
            {snap.teaserLines.map((line, i) => (
              <li
                key={`${i}-${line.slice(0, 20)}`}
                className="border-l-2 border-[color:var(--accent-gold-muted)] pl-2 text-[11px] leading-snug text-[color:var(--text-primary)]"
              >
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && showSuggestions ? (
          <div className="mt-2 border-t border-[color:var(--border-default)] pt-2">
            <p className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-[color:var(--text-muted)]">
              Suggested from CRM
            </p>
            {suggestions.map((s) => (
              <SuggestedTaskRow key={s.id} suggestion={s} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
