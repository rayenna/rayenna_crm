import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Sparkles, X } from 'lucide-react'
import type {
  ZenithAskHistoryItem,
  ZenithNlQueryResult,
  ZenithNlViz,
} from '../../types/zenithNlQuery'
import ChartPanel from './ChartPanel'

const PIE_COLORS = [
  'var(--accent-gold)',
  'var(--accent-teal, #2dd4bf)',
  'var(--accent-blue, #60a5fa)',
  'var(--accent-red)',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
]

function formatCell(v: string | number | null): string {
  if (v == null) return '—'
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? v.toLocaleString('en-IN')
      : v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }
  return String(v)
}

function AskViz({ viz }: { viz: ZenithNlViz }) {
  if (viz.kind === 'table') {
    return (
      <ChartPanel title={viz.title} contentClassName="min-h-0">
        <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
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
                viz.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[color:var(--border-default)] text-[color:var(--text-primary)]"
                  >
                    {viz.columns.map((c) => (
                      <td key={c.key} className="py-2 pr-3 whitespace-nowrap">
                        {formatCell(row[c.key] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ChartPanel>
    )
  }

  const data = viz.series.map((s) => ({ name: s.label, value: s.value, count: s.count }))

  if (viz.chartType === 'pie') {
    return (
      <ChartPanel title={viz.title} contentClassName="min-h-[240px]">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name }) => String(name)}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                value.toLocaleString('en-IN'),
                viz.valueLabel || 'Value',
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>
    )
  }

  return (
    <ChartPanel title={viz.title} contentClassName="min-h-[240px]">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 48 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={(v) =>
              typeof v === 'number' && v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <Tooltip
            formatter={(value: number) => [
              value.toLocaleString('en-IN'),
              viz.valueLabel || 'Value',
            ]}
          />
          <Bar dataKey="value" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  )
}

type Props = {
  result: ZenithNlQueryResult | null
  error: string | null
  loading: boolean
  history: ZenithAskHistoryItem[]
  onClose: () => void
  onAskSuggestion: (q: string) => void
  onReplayHistory: (item: ZenithAskHistoryItem) => void
}

export default function ZenithAskPanel({
  result,
  error,
  loading,
  history,
  onClose,
  onAskSuggestion,
  onReplayHistory,
}: Props) {
  if (!result && !error && !loading && history.length === 0) return null

  return (
    <section id="zenith-ask-result" className="zenith-ask-result" aria-live="polite">
      <div className="zenith-ask-result__header">
        <div className="min-w-0">
          <p className="zenith-ask-result__eyebrow">
            <Sparkles className="inline w-3 h-3 mr-1 -mt-0.5" aria-hidden />
            Zenith Ask
          </p>
          {result?.question ? (
            <p className="zenith-ask-result__question">{result.question}</p>
          ) : loading ? (
            <p className="zenith-ask-result__question">Thinking with your CRM data…</p>
          ) : history.length > 0 ? (
            <p className="zenith-ask-result__question">Recent asks this session</p>
          ) : (
            <p className="zenith-ask-result__question">Answer</p>
          )}
        </div>
        <button type="button" onClick={onClose} className="zenith-ask-result__close" aria-label="Close">
          <X className="w-4 h-4 mx-auto" aria-hidden />
        </button>
      </div>

      <div className="zenith-ask-result__body">
        {history.length > 0 ? (
          <div className="zenith-ask-history" aria-label="Ask history this session">
            <p className="zenith-ask-history__label">This session</p>
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
          </>
        ) : null}

        {result && result.ok ? (
          <>
            <p className="zenith-ask-result__insight">{result.insight}</p>
            <AskViz viz={result.viz} />
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
              <Link to={result.projectsHref} className="zenith-ask-result__cta">
                Open in Projects →
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
