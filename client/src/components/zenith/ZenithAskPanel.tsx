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
import ChartPanel from './ChartPanel'
import { AskBarChart, AskPieChart, buildAskChartData } from './ZenithAskCharts'

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
                <span className="zenith-ask-catalog__title">{h.title}</span>
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

function AskViz({
  viz,
  onDrill,
}: {
  viz: ZenithNlViz
  onDrill?: (href: string) => void
}) {
  if (viz.kind === 'table') {
    const anyClickable = viz.rows.some((r) => typeof r.href === 'string' && r.href.length > 0)
    return (
      <ChartPanel title={viz.title} contentClassName="min-h-0">
        <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
          {anyClickable ? (
            <p className="mb-1.5 text-[10px] text-[color:var(--text-muted)] sm:text-xs">
              Click a row to open matching projects
            </p>
          ) : null}
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="sticky top-0 bg-[color:var(--bg-card)]">
              <tr className="border-b border-[color:var(--border-default)] text-[color:var(--text-muted)]">
                {viz.columns.map((c) => (
                  <th key={c.key} className="py-2 pr-3 font-semibold whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viz.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={viz.columns.length}
                    className="py-6 text-center text-[color:var(--text-muted)]"
                  >
                    No rows
                  </td>
                </tr>
              ) : (
                viz.rows.map((row, i) => {
                  const href = typeof row.href === 'string' ? row.href : ''
                  const clickable = Boolean(href)
                  return (
                    <tr
                      key={i}
                      className={
                        clickable
                          ? 'border-b border-[color:var(--border-default)] text-[color:var(--text-primary)] cursor-pointer hover:bg-[color:var(--bg-elevated,rgba(255,255,255,0.04))] transition-colors'
                          : 'border-b border-[color:var(--border-default)] text-[color:var(--text-primary)]'
                      }
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
                          className={
                            clickable && c.key === 'count'
                              ? 'py-2 pr-3 whitespace-nowrap font-semibold text-[color:var(--accent-gold)] underline-offset-2 hover:underline'
                              : 'py-2 pr-3 whitespace-nowrap'
                          }
                        >
                          {formatCell(row[c.key] ?? null)}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
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
                <p className="zenith-ask-result__question">Thinking with your CRM data…</p>
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
          </>
        ) : null}

        {result && result.ok && result.kind === 'metric' ? (
          <>
            <p className="zenith-ask-result__insight">{result.insight}</p>
            <AskViz
              viz={result.viz}
              onDrill={(href) => {
                trackZenithAskEvent('ask_open_projects', {
                  role,
                  metric: result.intent.metric,
                  chipMatch: result.chipMatch,
                })
                navigate(href)
              }}
            />
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
                  : 'Open in Projects →'}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
