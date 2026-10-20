import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Sparkles, X } from 'lucide-react'
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
import AskRowActions, { askRowProjectId } from './AskRowActions'
import { isPeAskHref } from '../../lib/openProposalEngine'
import { openProposalEngineForProject, peProjectIdFromHref } from '../../lib/openProposalEngine'
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

function formatCell(v: string | number | null): string {
  if (v == null) return '—'
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? v.toLocaleString('en-IN')
      : v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }
  return String(v)
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
                    <dd>{formatCell(row[c.key] ?? null)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {clickable ? <span className="zenith-ask-table-cards__cta">Open record →</span> : null}
          </>
        )
        const canAct = Boolean(askRowProjectId(row))
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
    const anyAct = viz.rows.some((r) => Boolean(askRowProjectId(r)))
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
                                {formatCell(row[c.key] ?? null)}
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
  onAskSuggestion,
  onReplayHistory,
}: Props) {
  const navigate = useNavigate()
  if (!result && !error && !loading && history.length === 0) return null

  const datePhrase =
    result?.effectiveDateFilter?.source === 'question' && result.effectiveDateFilter.phrase
      ? result.effectiveDateFilter.phrase
      : filterSummary

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
                <Sparkles className="inline w-3 h-3 mr-1 -mt-0.5" aria-hidden />
                Zenith Ask
                {datePhrase ? (
                  <span className="zenith-ask-result__filters"> · Using {datePhrase}</span>
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
                onClick={() =>
                  trackZenithAskEvent('ask_action', {
                    role,
                    action: result.action,
                    href: result.href,
                    chipMatch: result.chipMatch,
                  })
                }
              >
                {result.label} →
              </Link>
            )}
          </>
        ) : null}

        {result && result.ok && result.kind === 'metric' ? (
          <>
            <p className="zenith-ask-result__insight">{result.insight}</p>
            <AskViz
              viz={result.viz}
              metric={result.intent.metric}
              onDrill={(href) => {
                trackZenithAskEvent('ask_open_projects', {
                  role,
                  metric: result.intent.metric,
                  chipMatch: result.chipMatch,
                })
                navigate(href)
              }}
            />
            {result.intent.metric === 'support_tickets_summary' &&
            result.viz.kind === 'table' &&
            result.viz.rows.length === 0 ? (
              <Link to="/support-tickets?new=1" className="zenith-ask-result__cta">
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
            {result.projectsHref ? (
              <Link
                to={result.projectsHref}
                className="zenith-ask-result__cta"
                onClick={() =>
                  trackZenithAskEvent('ask_open_projects', {
                    role,
                    metric: result.intent.metric,
                    chipMatch: result.chipMatch,
                  })
                }
              >
                {result.projectsHref.startsWith('/support-tickets')
                  ? 'Open Support Tickets →'
                  : result.projectsHref.startsWith('/customers')
                    ? 'Open Customer Master →'
                    : 'Open in Projects →'}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
