import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { ZenithAskIcon } from './zenithAskIcon'
import type {
  ZenithAskHistoryItem,
  ZenithNlCatalogHint,
  ZenithNlQueryResult,
  ZenithNlViz,
} from '../../types/zenithNlQuery'
import { trackZenithAskEvent } from '../../utils/zenithAskAnalytics'
import {
  pickAskTableEmphasisColumn,
  pickAskTableTitleColumn,
} from '../../utils/zenithAskTableLayout'
import ChartPanel from './ChartPanel'
import { AskBarChart, AskPieChart, buildAskChartData } from './ZenithAskCharts'
import AskRowActions, { askRowProjectId, askRowTicketId } from './AskRowActions'
import AskCohortActions, { askMetricSupportsCohortCta } from './AskCohortActions'
import { isPeAskHref } from '../../lib/openProposalEngine'
import { openProposalEngineForProject, peProjectIdFromHref } from '../../lib/openProposalEngine'
import { formatZenithFilterSummary } from '../../utils/zenithFilterSummary'
import type { ZenithNlTableRow } from '../../types/zenithNlQuery'

function AskClarifyCatalog({
  hints,
  role,
  onPick,
}: {
  hints: ZenithNlCatalogHint[]
  role?: string
  onPick: (ask: string) => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return hints
    return hints.filter((h) => {
      const hay = `${h.title} ${h.description} ${h.metric} ${h.ask}`.toLowerCase()
      return needle.split(/\s+/).every((part) => hay.includes(part))
    })
  }, [hints, q])

  return (
    <div className="zenith-ask-catalog" aria-label="What you can ask">
      <p className="zenith-ask-catalog__label">What you can ask</p>
      <div className="zenith-ask-catalog__search">
        <Search className="zenith-ask-catalog__search-icon" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search metrics for your role…"
          className="zenith-ask-catalog__input"
          aria-label="Search Ask catalog"
        />
      </div>
      <ul className="zenith-ask-catalog__list">
        {filtered.length === 0 ? (
          <li className="zenith-ask-catalog__empty">No metrics match “{q.trim()}”</li>
        ) : (
          filtered.map((h) => (
            <li key={h.metric}>
              <button
                type="button"
                className="zenith-ask-catalog__row"
                onClick={() => {
                  trackZenithAskEvent('ask_catalog_pick', {
                    role,
                    metric: h.metric,
                    source: 'catalog',
                  })
                  onPick(h.ask)
                }}
              >
                <span className="zenith-ask-catalog__title">{h.ask}</span>
                <span className="zenith-ask-catalog__desc">{h.description}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function formatCell(v: string | number | null | undefined | string[]): string {
  if (v == null) return '—'
  if (Array.isArray(v)) return '—'
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? v.toLocaleString('en-IN')
      : v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }
  return String(v)
}

/**
 * Truncated in CSS. Long strings get a portal tip on hover/focus.
 * Native `title` is unreliable in the Ask dock (delay + drag chrome).
 */
function AskTableCell({ value }: { value: string | number | null | undefined | string[] }) {
  const text = formatCell(value)
  const full = typeof value === 'string' ? value.trim() : ''
  const tipWorthy = full.length > 40
  const cellRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(
    null,
  )

  useLayoutEffect(() => {
    if (!open || !cellRef.current) {
      setCoords(null)
      return
    }
    const rect = cellRef.current.getBoundingClientRect()
    const placeAbove = rect.bottom > window.innerHeight - 140
    setCoords({
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 320),
      placeAbove,
    })
  }, [open, full])

  if (!tipWorthy) {
    return <span className="zenith-ask-table__cell">{text}</span>
  }

  return (
    <span
      ref={cellRef}
      className={`zenith-ask-table__cell zenith-ask-table__cell--tip${open ? ' is-open' : ''}`}
      tabIndex={0}
      aria-label={full}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {text}
      {open && coords
        ? createPortal(
            <span
              className={`zenith-ask-table__tip zenith-ask-table__tip--portal${
                coords.placeAbove ? ' is-above' : ''
              }`}
              role="tooltip"
              style={{ top: coords.top, left: Math.max(8, coords.left) }}
            >
              {full}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}

function AskTableCards({
  columns,
  rows,
  onDrill,
  metric,
}: {
  columns: { key: string; label: string }[]
  rows: ZenithNlTableRow[]
  onDrill?: (href: string) => void
  metric?: string
}) {
  const titleCol = pickAskTableTitleColumn(columns)
  const emphasisCol = pickAskTableEmphasisColumn(columns, titleCol?.key ?? null)
  const detailCols = columns.filter(
    (c) => c.key !== titleCol?.key && c.key !== emphasisCol?.key,
  )

  if (rows.length === 0) {
    return (
      <p className="zenith-ask-table-cards__empty">
        {metric === 'support_tickets_summary' ? 'No open tickets in your book' : 'No rows'}
      </p>
    )
  }

  return (
    <ul className="zenith-ask-table-cards" aria-label="Ask results as cards">
      {rows.map((row, i) => {
        const href = typeof row.href === 'string' ? row.href : ''
        const clickable = Boolean(href)
        const titleText = titleCol ? formatCell(row[titleCol.key] ?? null) : `Row ${i + 1}`
        const emphasisText = emphasisCol ? formatCell(row[emphasisCol.key] ?? null) : null
        const body = (
          <>
            <div className="zenith-ask-table-cards__top">
              <p className="zenith-ask-table-cards__title">{titleText}</p>
              {emphasisText != null ? (
                <p className="zenith-ask-table-cards__emphasis">{emphasisText}</p>
              ) : null}
            </div>
            {detailCols.length > 0 ? (
              <dl className="zenith-ask-table-cards__grid">
                {detailCols.map((c) => (
                  <div key={c.key} className="zenith-ask-table-cards__field">
                    <dt>{c.label}</dt>
                    <dd>
                      <AskTableCell value={row[c.key] ?? null} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {clickable ? (
              <span className="zenith-ask-table-cards__cta">
                {href.startsWith('/help') ? 'Open in Help →' : 'Open record →'}
              </span>
            ) : null}
          </>
        )
        const canAct = Boolean(askRowProjectId(row) || askRowTicketId(row))
        return (
          <li key={i} className="zenith-ask-table-cards__item">
            {clickable ? (
              <button
                type="button"
                className="zenith-ask-table-cards__card is-clickable"
                onClick={() => onDrill?.(href)}
                aria-label={`Open ${titleText}`}
              >
                {body}
              </button>
            ) : (
              <div className="zenith-ask-table-cards__card">{body}</div>
            )}
            {canAct ? <AskRowActions row={row} metric={metric} /> : null}
          </li>
        )
      })}
    </ul>
  )
}

function AskViz({
  viz,
  onDrill,
  metric,
}: {
  viz: ZenithNlViz
  onDrill?: (href: string) => void
  metric?: string
}) {
  if (viz.kind === 'table') {
    const anyClickable = viz.rows.some((r) => typeof r.href === 'string' && r.href.length > 0)
    const anyAct = viz.rows.some((r) => Boolean(askRowProjectId(r) || askRowTicketId(r)))
    const colCount = viz.columns.length + (anyAct ? 1 : 0)
    // Wide min-width so equal % columns stay readable; shared overflow-x scrolls head+body together.
    const tableMinWidthRem = Math.max(36, viz.columns.length * 7 + (anyAct ? 9 : 0))
    const colPct = viz.columns.length > 0 ? `${(100 / viz.columns.length).toFixed(4)}%` : undefined
    return (
      <ChartPanel title={viz.title} contentClassName="min-h-0">
        {anyClickable ? (
          <p className="mb-1.5 text-[11px] text-[color:var(--text-muted)] sm:text-xs">
            <span className="md:hidden">Tap a card to open matching projects</span>
            <span className="hidden md:inline">Click a row to open matching projects</span>
          </p>
        ) : null}

        {/* Mobile-first: stacked cards — never squash 8 columns into a phone width. */}
        <div className="md:hidden">
          <AskTableCards columns={viz.columns} rows={viz.rows} onDrill={onDrill} metric={metric} />
        </div>

        {/*
          md+: frozen header outside vertical scroll body; both share one horizontal scroller
          so columns keep readable min widths instead of ellipsis soup.
        */}
        <div className="zenith-ask-table hidden md:block">
          <div className="zenith-ask-table__xscroll">
            <div
              className="zenith-ask-table__inner"
              style={{ minWidth: `${tableMinWidthRem}rem` }}
            >
              <div className="zenith-ask-table__head">
                <table className="zenith-ask-table__grid">
                  <colgroup>
                    {viz.columns.map((c) => (
                      <col key={c.key} style={colPct ? { width: colPct } : undefined} />
                    ))}
                    {anyAct ? <col style={{ width: '9rem' }} /> : null}
                  </colgroup>
                  <thead>
                    <tr>
                      {viz.columns.map((c) => (
                        <th key={c.key}>{c.label}</th>
                      ))}
                      {anyAct ? <th>Act</th> : null}
                    </tr>
                  </thead>
                </table>
              </div>
              <div className="zenith-ask-table__body">
                <table className="zenith-ask-table__grid">
                  <colgroup>
                    {viz.columns.map((c) => (
                      <col key={c.key} style={colPct ? { width: colPct } : undefined} />
                    ))}
                    {anyAct ? <col style={{ width: '9rem' }} /> : null}
                  </colgroup>
                  <tbody>
                    {viz.rows.length === 0 ? (
                      <tr>
                        <td colSpan={colCount} className="zenith-ask-table__empty">
                          {metric === 'support_tickets_summary'
                            ? 'No open tickets in your book'
                            : 'No rows'}
                        </td>
                      </tr>
                    ) : (
                      viz.rows.map((row, i) => {
                        const href = typeof row.href === 'string' ? row.href : ''
                        const clickable = Boolean(href)
                        const canAct = Boolean(askRowProjectId(row))
                        return (
                          <tr
                            key={i}
                            className={clickable ? 'is-clickable' : undefined}
                            onClick={
                              clickable
                                ? () => {
                                    onDrill?.(href)
                                  }
                                : undefined
                            }
                            onKeyDown={
                              clickable
                                ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      onDrill?.(href)
                                    }
                                  }
                                : undefined
                            }
                            tabIndex={clickable ? 0 : undefined}
                            role={clickable ? 'link' : undefined}
                          >
                            {viz.columns.map((c) => (
                              <td
                                key={c.key}
                                className={clickable && c.key === 'count' ? 'is-drill' : undefined}
                              >
                                <AskTableCell value={row[c.key] ?? null} />
                              </td>
                            ))}
                            {anyAct ? (
                              <td onClick={(e) => e.stopPropagation()}>
                                {canAct ? <AskRowActions row={row} metric={metric} /> : null}
                              </td>
                            ) : null}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </ChartPanel>
    )
  }

  const data = buildAskChartData(viz.series)
  const anyChartClickable = data.some((d) => Boolean(d.href))
  const drillHint = anyChartClickable
    ? viz.chartType === 'pie'
      ? 'Click a slice or legend row to open matching projects'
      : 'Click a bar to open matching projects'
    : undefined

  if (viz.chartType === 'pie') {
    return (
      <ChartPanel
        title={viz.title}
        subtitle={drillHint}
        contentClassName="min-h-0"
        showExploreHint={anyChartClickable}
      >
        <AskPieChart
          data={data}
          valueLabel={viz.valueLabel}
          clickable={anyChartClickable}
          onDrill={onDrill}
        />
      </ChartPanel>
    )
  }

  return (
    <ChartPanel
      title={viz.title}
      subtitle={drillHint}
      contentClassName="min-h-0"
      showExploreHint={anyChartClickable}
    >
      <AskBarChart
        data={data}
        valueLabel={viz.valueLabel}
        clickable={anyChartClickable}
        onDrill={onDrill}
      />
    </ChartPanel>
  )
}

type Props = {
  result: ZenithNlQueryResult | null
  error: string | null
  loading: boolean
  history: ZenithAskHistoryItem[]
  /** Active filters for this answer (command bar or relative phrase from the question). */
  filterSummary?: string
  role?: string
  mappedLabel?: string | null
  onClose: () => void
  /** Floating Ask dock: close when leaving for Projects / Help / etc. */
  onNavigateAway?: () => void
  onAskSuggestion: (q: string, source?: 'follow_up' | 'catalog') => void
  onReplayHistory: (item: ZenithAskHistoryItem) => void
}

export default function ZenithAskPanel({
  result,
  error,
  loading,
  history,
  filterSummary,
  role,
  mappedLabel = null,
  onClose,
  onNavigateAway,
  onAskSuggestion,
  onReplayHistory,
}: Props) {
  const navigate = useNavigate()
  const leaveTo = (href: string) => {
    onNavigateAway?.()
    navigate(href)
  }
  if (!result && !error && !loading && history.length === 0) return null

  const ed = result?.effectiveDateFilter
  const datePhrase = ed
    ? ed.phrase ||
      formatZenithFilterSummary(ed.selectedFYs, ed.selectedQuarters, ed.selectedMonths)
    : filterSummary
  const dateEyebrow =
    ed?.source === 'default' && ed.phrase
      ? `${ed.phrase} · default`
      : datePhrase

  const historyOnly = !result && !error && !loading && history.length > 0

  return (
    <section
      id="zenith-ask-result"
      className={`zenith-ask-result${historyOnly ? ' zenith-ask-result--history-only' : ''}`}
      aria-live="polite"
    >
      <div className="zenith-ask-result__header">
        <div className="min-w-0">
          {historyOnly ? (
            <p className="zenith-ask-result__eyebrow">Recent asks</p>
          ) : (
            <>
              <p className="zenith-ask-result__eyebrow">
                <ZenithAskIcon className="inline w-3 h-3 mr-1 -mt-0.5" aria-hidden />
                Zenith Ask
                {dateEyebrow ? (
                  <span className="zenith-ask-result__filters"> · Using {dateEyebrow}</span>
                ) : null}
              </p>
              {result?.question ? (
                <p className="zenith-ask-result__question">{result.question}</p>
              ) : loading ? (
                <p className="zenith-ask-result__question">
                  {mappedLabel
                    ? `Mapped to ${mappedLabel} — computing numbers…`
                    : 'Thinking with your CRM data…'}
                </p>
              ) : (
                <p className="zenith-ask-result__question">Answer</p>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          className="zenith-ask-result__close"
          aria-label="Close"
        >
          <X className="w-4 h-4 mx-auto" aria-hidden />
        </button>
      </div>

      <div className="zenith-ask-result__body">
        {history.length > 0 ? (
          <div className="zenith-ask-history" aria-label="Ask history this session">
            {!historyOnly ? <p className="zenith-ask-history__label">This session</p> : null}
            <div className="zenith-ask-history__list">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="zenith-ask-history__item"
                  onClick={() => onReplayHistory(item)}
                  title={item.insight}
                >
                  <span className="zenith-ask-history__q">{item.question}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="zenith-ask-result__insight">
            Mapping your question to Zenith metrics and computing trusted numbers…
          </p>
        ) : null}

        {error ? (
          <p className="zenith-ask-result__insight" style={{ color: 'var(--accent-red)' }}>
            {error}
          </p>
        ) : null}

        {result && !result.ok ? (
          <>
            <p className="zenith-ask-result__insight">{result.message}</p>
            {result.suggestedQuestions?.length ? (
              <div className="zenith-ask-examples" style={{ margin: 0, padding: 0 }}>
                {result.suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onAskSuggestion(q)}
                    className="zenith-ask-examples__chip"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
            {result.catalogHints && result.catalogHints.length > 0 ? (
              <AskClarifyCatalog
                hints={result.catalogHints}
                role={role}
                onPick={(ask) => onAskSuggestion(ask, 'catalog')}
              />
            ) : null}
          </>
        ) : null}

        {result && result.ok && result.kind === 'action' ? (
          <>
            <p className="zenith-ask-result__insight">{result.message}</p>
            {isPeAskHref(result.href) ? (
              <button
                type="button"
                className="zenith-ask-result__cta"
                onClick={() => {
                  trackZenithAskEvent('ask_action', {
                    role,
                    action: result.action,
                    href: result.href,
                    chipMatch: result.chipMatch,
                  })
                  void openProposalEngineForProject(peProjectIdFromHref(result.href))
                }}
              >
                {result.label} →
              </button>
            ) : (
              <Link
                to={result.href}
                className="zenith-ask-result__cta"
                onClick={() => {
                  trackZenithAskEvent('ask_action', {
                    role,
                    action: result.action,
                    href: result.href,
                    chipMatch: result.chipMatch,
                  })
                  onNavigateAway?.()
                }}
              >
                {result.label} →
              </Link>
            )}
          </>
        ) : null}

        {result && result.ok && result.kind === 'metric' ? (
          <>
            <p className="zenith-ask-result__insight">{result.insight}</p>
            {result.sections && result.sections.length > 0 ? (
              result.sections.map((section, si) => (
                <div key={`${section.metric}-${si}`} className="zenith-ask-section">
                  <p className="zenith-ask-section__title">{section.title}</p>
                  <p className="zenith-ask-section__insight">{section.insight}</p>
                  {section.viz.kind === 'table' ? (
                    <AskCohortActions
                      metric={section.metric}
                      rows={section.viz.rows}
                      projectsHref={section.projectsHref ?? null}
                      onNavigateAway={onNavigateAway}
                    />
                  ) : null}
                  <AskViz
                    viz={section.viz}
                    metric={section.metric}
                    onDrill={(href) => {
                      trackZenithAskEvent('ask_open_projects', {
                        role,
                        metric: section.metric,
                        chipMatch: result.chipMatch,
                      })
                      leaveTo(href)
                    }}
                  />
                </div>
              ))
            ) : (
              <>
                {result.viz.kind === 'table' ? (
                  <AskCohortActions
                    metric={result.intent.metric}
                    rows={result.viz.rows}
                    projectsHref={result.projectsHref}
                    onNavigateAway={onNavigateAway}
                  />
                ) : null}
                <AskViz
                  viz={result.viz}
                  metric={result.intent.metric}
                  onDrill={(href) => {
                    trackZenithAskEvent('ask_open_projects', {
                      role,
                      metric: result.intent.metric,
                      chipMatch: result.chipMatch,
                    })
                    leaveTo(href)
                  }}
                />
              </>
            )}
            {result.intent.metric === 'support_tickets_summary' &&
            result.viz.kind === 'table' &&
            result.viz.rows.length === 0 ? (
              <Link
                to="/support-tickets?new=1"
                className="zenith-ask-result__cta"
                onClick={() => onNavigateAway?.()}
              >
                Create a support ticket →
              </Link>
            ) : null}
            {result.followUps && result.followUps.length > 0 ? (
              <div className="zenith-ask-followups">
                <p className="zenith-ask-followups__label">Follow up</p>
                <div className="zenith-ask-examples zenith-ask-examples--panel" style={{ padding: 0 }}>
                  {result.followUps.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onAskSuggestion(q)}
                      className="zenith-ask-examples__chip"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {!result.sections?.length &&
            result.projectsHref &&
            !(
              result.viz.kind === 'table' &&
              askMetricSupportsCohortCta(result.intent.metric) &&
              result.projectsHref.startsWith('/projects')
            ) ? (
              <Link
                to={result.projectsHref}
                className="zenith-ask-result__cta"
                onClick={() => {
                  trackZenithAskEvent('ask_open_projects', {
                    role,
                    metric: result.intent.metric,
                    chipMatch: result.chipMatch,
                  })
                  onNavigateAway?.()
                }}
              >
                {result.projectsHref.startsWith('/support-tickets')
                  ? 'Open Support Tickets →'
                  : result.projectsHref.startsWith('/customers')
                    ? 'Open Customer Master →'
                    : result.projectsHref.startsWith('/help')
                      ? 'Open in Help →'
                      : result.projectsHref.startsWith('/reports')
                        ? 'Open in Reports →'
                        : 'Open in Projects →'}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
