import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardList, SlidersHorizontal } from 'lucide-react'
import { ProjectStatus, UserRole } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import {
  countDataSenseHitsByRule,
  DATA_SENSE_RULE_SHORT_LABEL,
  DATA_SENSE_ZENITH_RULE_IDS,
  dataSenseRollupBySalesperson,
  type DataSenseExplorerHit,
  type DataSenseRuleId,
} from '../../utils/dataSense'
import {
  markZenithAttentionIntroPlayed,
  shouldPlayZenithAttentionIntro,
} from '../../utils/zenithAttentionHighlight'
import { zenithExplorerProjectsMissingLifecycleBrands } from '../../utils/zenithBriefingMissingBrands'
import LifecycleBrandAttentionRow from './LifecycleBrandAttentionRow'
import DataSenseAttentionRow from './DataSenseAttentionRow'

type TileParams = { selectedFYs: string[]; selectedQuarters: string[]; selectedMonths: string[] }

interface Props {
  projects: ZenithExplorerProject[] | null | undefined
  tileParams: TileParams
  compact?: boolean
  paired?: boolean
  className?: string
  dataSenseHits?: DataSenseExplorerHit[]
  showBrandGaps?: boolean
  /**
   * When there are no attention items, show an “All clear” card instead of hiding
   * (keeps 50/50 layout beside Weighted open pipeline).
   */
  showEmptyAllClear?: boolean
  /** Fill parent height (e.g. `.zenith-overview-panel`). */
  fillHeight?: boolean
}

const MAX_VISIBLE = 5
const MAX_VISIBLE_COMPACT = 3
const INTRO_PULSE_MS = 8000
const MAX_ROLLUP_ROWS = 8

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function DashboardLifecycleBrandReminder({
  projects,
  tileParams,
  compact = false,
  paired = false,
  className = '',
  dataSenseHits = [],
  showBrandGaps = true,
  showEmptyAllClear = false,
  fillHeight = false,
}: Props) {
  const { user } = useAuth()
  const cardRef = useRef<HTMLElement>(null)
  const [senseRuleFilter, setSenseRuleFilter] = useState<DataSenseRuleId | null>(null)
  const [introPulse, setIntroPulse] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const list = Array.isArray(projects) ? projects : []
  const missing = showBrandGaps ? zenithExplorerProjectsMissingLifecycleBrands(list) : []
  const senseHits = dataSenseHits
  const counts = useMemo(() => countDataSenseHitsByRule(senseHits), [senseHits])
  const rollup = useMemo(() => dataSenseRollupBySalesperson(senseHits), [senseHits])
  const showSalespersonRollup =
    (user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT) && rollup.length > 0
  const showFilterControls = showSalespersonRollup || senseHits.length > 0
  const hasItems = missing.length > 0 || senseHits.length > 0
  const hasCritical = senseHits.some(
    (h) => h.primary.severity === 'critical' || h.findings.some((f) => f.id === 'A1'),
  )

  useEffect(() => {
    if (!hasItems || !user?.id) return
    if (!shouldPlayZenithAttentionIntro(user.id)) return
    markZenithAttentionIntroPlayed(user.id)
    setIntroPulse(true)

    const reduceMotion = prefersReducedMotion()
    const scrollTimer = window.setTimeout(() => {
      const el = cardRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const margin = 72
      const inView = rect.top >= margin && rect.bottom <= window.innerHeight - 24
      if (!inView) {
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
      }
    }, 120)

    const pulseTimer = window.setTimeout(() => setIntroPulse(false), INTRO_PULSE_MS)
    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(pulseTimer)
    }
  }, [hasItems, user?.id])

  if (!hasItems) {
    if (!showEmptyAllClear) return null
    return (
      <section
        ref={cardRef}
        id="zenith-things-needing-attention"
        className={[
          'zenith-attention-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border shadow-[var(--shadow-card)] scroll-mt-28',
          fillHeight ? 'h-full' : '',
          className,
        ].join(' ')}
        role="region"
        aria-labelledby="dashboard-notice-board-heading"
      >
        <div className="flex shrink-0 items-start gap-2 border-b border-[color:var(--border-default)] px-3 py-2.5 sm:px-3.5 sm:py-3">
          <ClipboardList
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-teal)]"
            aria-hidden
          />
          <div className="min-w-0">
            <h2
              id="dashboard-notice-board-heading"
              className="text-sm font-bold leading-tight text-[color:var(--text-primary)]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Things needing attention
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--text-secondary)]">
              Data Sense & lifecycle gaps
            </p>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-[color:var(--accent-teal)]" aria-hidden />
          <p className="text-sm font-semibold text-[color:var(--accent-teal)]">All clear</p>
          <p className="max-w-[16rem] text-[11px] leading-snug text-[color:var(--text-muted)]">
            No date, payment, or lifecycle brand issues in the current filter.
          </p>
        </div>
      </section>
    )
  }

  const activeRule =
    senseRuleFilter && counts[senseRuleFilter] > 0 ? senseRuleFilter : null

  const filteredSenseHits = activeRule
    ? senseHits.filter((h) => h.findings.some((f) => f.id === activeRule))
    : senseHits
  /** Brand gaps stay visible only when no Data Sense chip is active. */
  const filteredMissing = activeRule ? [] : missing

  const byId = new Map(list.map((p) => [p.id, p]))
  const maxRows = compact || paired ? MAX_VISIBLE_COMPACT : MAX_VISIBLE
  const senseVisible = filteredSenseHits.slice(0, maxRows)
  const brandSlots = Math.max(0, maxRows - senseVisible.length)
  const brandVisible = filteredMissing.slice(0, brandSlots)
  const hiddenCount =
    filteredSenseHits.length + filteredMissing.length - senseVisible.length - brandVisible.length

  const brandsHref = buildProjectsUrl(
    {
      status: [
        ProjectStatus.UNDER_INSTALLATION,
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ],
      lifecycleSpecsIncomplete: true,
    },
    tileParams,
  )
  const reviewHref = buildProjectsUrl({ dataSenseNeedsReview: true }, tileParams)
  const ruleHref = (rule: DataSenseRuleId) =>
    buildProjectsUrl({ dataSenseNeedsReview: true, dataSenseRule: rule }, tileParams)

  /** Projects → / view all: honor the in-card chip when one is selected. */
  const projectsHref =
    senseHits.length === 0
      ? brandsHref
      : activeRule
        ? ruleHref(activeRule)
        : reviewHref

  const subtitleParts: string[] = []
  if (senseHits.length > 0) {
    if (activeRule) {
      subtitleParts.push(
        `Showing ${filteredSenseHits.length} of ${senseHits.length} · ${DATA_SENSE_RULE_SHORT_LABEL[activeRule]}`,
      )
    } else {
      subtitleParts.push(
        `${senseHits.length} ${senseHits.length === 1 ? 'project' : 'projects'} need date or payment review`,
      )
    }
  }
  if (filteredMissing.length > 0) {
    subtitleParts.push(
      `${filteredMissing.length} ${filteredMissing.length === 1 ? 'project' : 'projects'} missing lifecycle brand data`,
    )
  }

  const toggleRule = (rule: DataSenseRuleId) => {
    setSenseRuleFilter((prev) => (prev === rule ? null : rule))
  }

  return (
    <section
      ref={cardRef}
      id="zenith-things-needing-attention"
      className={[
        'zenith-attention-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border shadow-[var(--shadow-card)] scroll-mt-28',
        fillHeight ? 'h-full' : '',
        hasCritical ? 'zenith-attention-card--critical' : '',
        introPulse ? 'zenith-attention-card--intro' : '',
        className,
      ].join(' ')}
      role="region"
      aria-labelledby="dashboard-notice-board-heading"
      aria-live={introPulse ? 'polite' : undefined}
    >
      <div
        className={[
          'zenith-attention-card__rail flex min-h-0 flex-1 flex-col border-l-[6px]',
          hasCritical ? 'zenith-attention-card__rail--critical' : 'zenith-attention-card__rail--warn',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[color:var(--border-default)] px-3 py-2.5 sm:px-3.5 sm:py-3">
          <div className="flex min-w-0 gap-2">
            <ClipboardList
              className={[
                'mt-0.5 h-4 w-4 shrink-0',
                hasCritical ? 'text-[color:var(--accent-red)]' : 'text-[color:var(--accent-gold)]',
              ].join(' ')}
              strokeWidth={2}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2
                  id="dashboard-notice-board-heading"
                  className="text-sm font-bold leading-tight text-[color:var(--text-primary)]"
                >
                  Things Needing Attention
                </h2>
                <span
                  className={[
                    'rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide',
                    hasCritical
                      ? 'border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]'
                      : 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]',
                  ].join(' ')}
                >
                  Needs a look
                </span>
              </div>
              {!paired ? (
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  {senseHits.length > 0 && missing.length > 0
                    ? 'Needs review · Panel & inverter brands'
                    : senseHits.length > 0
                      ? 'Needs review'
                      : 'Panel & inverter brands'}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] leading-snug text-[color:var(--text-secondary)]">
                {subtitleParts.join(' · ')}
              </p>
              {showFilterControls ? (
                <button
                  type="button"
                  onClick={() => setFiltersExpanded((v) => !v)}
                  className="zenith-attention-filters-toggle mt-1.5 inline-flex min-h-[32px] items-center gap-1 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--text-secondary)] transition hover:border-[color:var(--accent-teal-border)] hover:text-[color:var(--accent-teal)] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent-teal)]"
                  aria-expanded={filtersExpanded}
                  aria-controls="zenith-attention-filters-panel"
                >
                  <SlidersHorizontal className="h-3 w-3 shrink-0" aria-hidden />
                  Filters
                  {activeRule ? (
                    <span className="rounded bg-[color:var(--accent-teal-muted)] px-1 text-[9px] text-[color:var(--accent-teal)]">
                      1
                    </span>
                  ) : null}
                </button>
              ) : null}
              {filtersExpanded && showSalespersonRollup ? (
                <div id="zenith-attention-filters-panel" className="mt-1.5" aria-label="Needs review by salesperson">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                    By salesperson
                  </p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {rollup.slice(0, MAX_ROLLUP_ROWS).map((row) => {
                      const href = buildProjectsUrl(
                        row.salespersonId
                          ? { dataSenseNeedsReview: true, salespersonId: [row.salespersonId] }
                          : { dataSenseNeedsReview: true, salespersonUnassigned: true },
                        tileParams,
                      )
                      return (
                        <li key={row.salespersonId ?? 'unassigned'} className="min-w-0">
                          <Link
                            to={href}
                            className="zenith-attention-rollup-link inline-flex max-w-full items-baseline gap-1.5 rounded-sm text-[11px] text-[color:var(--text-secondary)] hover:text-[color:var(--accent-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent-teal)]"
                          >
                            <span className="truncate font-semibold">{row.salespersonName}</span>
                            <span className="shrink-0 tabular-nums text-[color:var(--text-muted)]">
                              {row.projectCount}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                  {rollup.length > MAX_ROLLUP_ROWS ? (
                    <p className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">
                      +{rollup.length - MAX_ROLLUP_ROWS} more in Projects
                    </p>
                  ) : null}
                </div>
              ) : null}
              {filtersExpanded && senseHits.length > 0 ? (
                <div
                  className="mt-1.5 flex flex-wrap gap-1"
                  role="group"
                  aria-label="Filter needs review by rule"
                >
                  {DATA_SENSE_ZENITH_RULE_IDS.map((rule) =>
                    counts[rule] > 0 ? (
                      <button
                        key={rule}
                        type="button"
                        aria-pressed={activeRule === rule}
                        onClick={() => toggleRule(rule)}
                        className={[
                          'min-h-[32px] rounded-md border px-2 py-0.5 text-[10px] font-semibold transition touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent-teal)]',
                          activeRule === rule
                            ? 'border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                            : 'border-[color:var(--border-default)] bg-[color:var(--bg-badge)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent-teal-border)] hover:text-[color:var(--accent-teal)]',
                        ].join(' ')}
                      >
                        {DATA_SENSE_RULE_SHORT_LABEL[rule]} {counts[rule]}
                      </button>
                    ) : null,
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <Link
            to={projectsHref}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center self-start rounded-lg border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-2.5 text-[11px] font-bold text-[color:var(--accent-teal)] transition hover:brightness-105 touch-manipulation"
          >
            Projects →
          </Link>
        </div>

        <ul
          className={[
            'min-h-0 flex-1 divide-y divide-[color:var(--border-default)] overflow-y-auto bg-[color:color-mix(in_srgb,var(--bg-card)_92%,var(--zenith-table-header-bg))]',
            fillHeight ? '' : paired ? 'max-h-[220px] lg:max-h-[240px]' : 'max-h-[280px]',
          ].join(' ')}
        >
          {senseVisible.map((hit) => {
            const project = byId.get(hit.projectId)
            if (!project) return null
            return (
              <DataSenseAttentionRow
                key={`sense-${hit.projectId}`}
                hit={hit}
                project={project}
                compact={compact || paired}
              />
            )
          })}
          {brandVisible.map((project) => (
            <LifecycleBrandAttentionRow key={`brand-${project.id}`} project={project} compact={compact || paired} />
          ))}
        </ul>

        {hiddenCount > 0 ? (
          <p className="shrink-0 border-t border-[color:var(--border-default)] px-3 py-2 text-[10px] text-[color:var(--text-muted)] sm:px-3.5">
            +{hiddenCount} more —{' '}
            <Link
              to={projectsHref}
              className="font-semibold text-[color:var(--accent-teal)] underline underline-offset-2"
            >
              view all
            </Link>
          </p>
        ) : activeRule && filteredSenseHits.length > 0 ? (
          <p className="shrink-0 border-t border-[color:var(--border-default)] px-3 py-2 text-[10px] text-[color:var(--text-muted)] sm:px-3.5">
            <button
              type="button"
              onClick={() => setSenseRuleFilter(null)}
              className="font-semibold text-[color:var(--accent-teal)] underline underline-offset-2"
            >
              Clear filter
            </button>
            {' · '}
            <Link
              to={projectsHref}
              className="font-semibold text-[color:var(--accent-teal)] underline underline-offset-2"
            >
              view all in Projects
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}
