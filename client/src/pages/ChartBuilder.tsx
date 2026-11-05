import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ChevronLeft,
  Copy,
  LineChart,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_ROLES } from '../constants/routeRoles'
import ChartPanel from '../components/zenith/ChartPanel'
import ChartBuilderPreview from '../components/chartBuilder/ChartBuilderPreview'
import MultiSelect from '../components/MultiSelect'
import type {
  ChartBuilderChartType,
  ChartBuilderCohort,
  ChartBuilderDimensionId,
  ChartBuilderMeasureId,
  ChartBuilderMeta,
  ChartBuilderQueryResult,
  ChartBuilderSavedChart,
  ChartBuilderSpec,
} from '../types/chartBuilder'
import { DEFAULT_CHART_SPEC } from '../types/chartBuilder'

const selectCls =
  'w-full rounded-lg border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:border-[color:var(--accent-gold)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-gold-muted)]'
const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]'

export default function ChartBuilder() {
  const { hasRole } = useAuth()
  const canAccess = hasRole([...ROUTE_ROLES.chartBuilder])
  const queryClient = useQueryClient()

  const [spec, setSpec] = useState<ChartBuilderSpec>(DEFAULT_CHART_SPEC)
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [activeChartId, setActiveChartId] = useState<string | null>(null)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['chart-builder', 'meta'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/reports/chart-builder/meta')
      return res.data as ChartBuilderMeta
    },
    enabled: canAccess,
    staleTime: 10 * 60_000,
  })

  const { data: fyPayload } = useQuery({
    queryKey: ['dashboard', 'financial-years'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/dashboard/financial-years')
      return res.data as { projectValueProfitByFY?: { fy: string }[] }
    },
    staleTime: 5 * 60_000,
    enabled: canAccess,
  })
  const availableFYs =
    fyPayload?.projectValueProfitByFY?.map((r) => r.fy).filter(Boolean) ?? []

  const {
    data: library,
    isLoading: libraryLoading,
    refetch: refetchLibrary,
  } = useQuery({
    queryKey: ['chart-builder', 'charts'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/reports/chart-builder/charts')
      return (res.data?.charts ?? []) as ChartBuilderSavedChart[]
    },
    enabled: canAccess,
  })

  const dateBody = useMemo(
    () => ({
      fy: selectedFYs,
      quarter: selectedQuarters,
    }),
    [selectedFYs, selectedQuarters],
  )

  const {
    data: queryResult,
    isFetching: queryFetching,
    isError: queryError,
    error: queryErr,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: ['chart-builder', 'query', spec, dateBody],
    queryFn: async () => {
      const res = await axiosInstance.post('/api/reports/chart-builder/query', {
        spec,
        ...dateBody,
      })
      return res.data as ChartBuilderQueryResult
    },
    enabled: canAccess && !!meta,
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (queryError) toast.error(getFriendlyApiErrorMessage(queryErr))
  }, [queryError, queryErr])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = saveName.trim() || queryResult?.title || 'Untitled chart'
      if (activeChartId) {
        const res = await axiosInstance.patch(`/api/reports/chart-builder/charts/${activeChartId}`, {
          name,
          description: saveDescription.trim() || null,
          spec,
        })
        return res.data as ChartBuilderSavedChart
      }
      const res = await axiosInstance.post('/api/reports/chart-builder/charts', {
        name,
        description: saveDescription.trim() || null,
        spec,
      })
      return res.data as ChartBuilderSavedChart
    },
    onSuccess: (saved) => {
      toast.success(activeChartId ? 'Chart updated' : 'Chart saved to library')
      setActiveChartId(saved.id)
      setSaveName(saved.name)
      setSaveDescription(saved.description || '')
      void queryClient.invalidateQueries({ queryKey: ['chart-builder', 'charts'] })
    },
    onError: (e) => toast.error(getFriendlyApiErrorMessage(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/api/reports/chart-builder/charts/${id}`)
    },
    onSuccess: (_d, id) => {
      toast.success('Chart deleted')
      if (activeChartId === id) {
        setActiveChartId(null)
        setSaveName('')
        setSaveDescription('')
      }
      void refetchLibrary()
    },
    onError: (e) => toast.error(getFriendlyApiErrorMessage(e)),
  })

  const patchSpec = useCallback((partial: Partial<ChartBuilderSpec>) => {
    setSpec((prev) => ({ ...prev, ...partial }))
  }, [])

  const applyTemplate = useCallback((templateSpec: ChartBuilderSpec, name: string) => {
    setSpec({ ...templateSpec })
    setActiveChartId(null)
    setSaveName(name)
    setSaveDescription('')
  }, [])

  const openSaved = useCallback((chart: ChartBuilderSavedChart) => {
    setSpec({ ...chart.spec })
    setActiveChartId(chart.id)
    setSaveName(chart.name)
    setSaveDescription(chart.description || '')
  }, [])

  const duplicateSaved = useCallback((chart: ChartBuilderSavedChart) => {
    setSpec({ ...chart.spec })
    setActiveChartId(null)
    setSaveName(`${chart.name} (copy)`)
    setSaveDescription(chart.description || '')
  }, [])

  const preferLeadSourceColors = spec.dimension === 'leadSource'
  const series = queryResult?.series ?? []
  const donutWarn = spec.chartType === 'donut' && series.length > 12

  if (!canAccess) {
    return (
      <div className="zenith-root zenith-animated-bg min-h-[calc(100dvh-5rem)] px-3 py-8 sm:px-5">
        <div className="mx-auto max-w-lg rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-6 text-sm text-[color:var(--text-primary)]">
          Chart Builder is available to Admin and Management only.
          <div className="mt-4">
            <Link to="/reports" className="font-semibold text-[color:var(--accent-gold)] underline">
              Back to Reports
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10 pt-2 sm:pt-3">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            to="/reports"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--accent-gold)]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Reports
          </Link>
        </div>

        <header className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)]">
            <LineChart className="h-5 w-5 text-[color:var(--accent-teal)]" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
              Chart Builder
            </h1>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
              Pick fields, choose a chart type, and save to the shared Admin / Management library.
            </p>
          </div>
        </header>

        {/* Templates */}
        <section className="mb-4" aria-label="Starter templates">
          <h2 className={`${labelCls} mb-2`}>Starter templates</h2>
          <div className="flex flex-wrap gap-2">
            {(meta?.templates ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.description}
                onClick={() => applyTemplate(t.spec, t.name)}
                className="min-h-[40px] rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--accent-gold-border)] hover:text-[color:var(--accent-gold)]"
              >
                {t.name}
              </button>
            ))}
            {metaLoading ? (
              <span className="text-xs text-[color:var(--text-muted)]">Loading templates…</span>
            ) : null}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* Builder controls */}
          <aside className="space-y-3 xl:col-span-3">
            <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
              <h2 className="zenith-display mb-3 text-sm font-bold text-[color:var(--text-primary)]">
                Design
              </h2>
              <div className="space-y-3">
                <div>
                  <label className={labelCls} htmlFor="cb-dimension">
                    Dimension
                  </label>
                  <select
                    id="cb-dimension"
                    className={`zenith-native-select mt-1.5 ${selectCls}`}
                    value={spec.dimension}
                    onChange={(e) =>
                      patchSpec({ dimension: e.target.value as ChartBuilderDimensionId })
                    }
                  >
                    {(meta?.dimensions ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="cb-measure">
                    Measure
                  </label>
                  <select
                    id="cb-measure"
                    className={`zenith-native-select mt-1.5 ${selectCls}`}
                    value={spec.measure}
                    onChange={(e) =>
                      patchSpec({ measure: e.target.value as ChartBuilderMeasureId })
                    }
                  >
                    {(meta?.measures ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="cb-cohort">
                    Cohort
                  </label>
                  <select
                    id="cb-cohort"
                    className={`zenith-native-select mt-1.5 ${selectCls}`}
                    value={spec.cohort}
                    onChange={(e) => patchSpec({ cohort: e.target.value as ChartBuilderCohort })}
                  >
                    {(meta?.cohorts ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
                    {(meta?.cohorts ?? []).find((c) => c.id === spec.cohort)?.description}
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Chart type</label>
                  <div className="mt-1.5 space-y-1.5">
                    {(meta?.chartTypes ?? []).map((ct) => {
                      const selected = spec.chartType === ct.id
                      return (
                        <button
                          key={ct.id}
                          type="button"
                          onClick={() => patchSpec({ chartType: ct.id as ChartBuilderChartType })}
                          className={`flex w-full min-h-[44px] flex-col items-start rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            selected
                              ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)]'
                              : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)] hover:border-[color:var(--accent-gold-border)]'
                          }`}
                        >
                          <span className="font-semibold text-[color:var(--text-primary)]">
                            {ct.label}
                          </span>
                          <span className="text-[11px] text-[color:var(--text-muted)]">
                            {ct.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={Boolean(spec.extraFilters?.availingLoan)}
                    onChange={(e) =>
                      patchSpec({
                        extraFilters: e.target.checked ? { availingLoan: true } : undefined,
                      })
                    }
                    className="h-4 w-4 rounded border-[color:var(--border-input)] text-[color:var(--accent-gold)]"
                  />
                  Only projects availing loan
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
              <h2 className="zenith-display mb-3 text-sm font-bold text-[color:var(--text-primary)]">
                Period
              </h2>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Financial year</label>
                  <div className="mt-1.5">
                    <MultiSelect
                      options={availableFYs.map((fy) => ({ value: fy, label: fy }))}
                      selectedValues={selectedFYs}
                      onChange={setSelectedFYs}
                      placeholder="All FYs"
                      variant="zenith"
                      compact
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Quarter (needs one FY)</label>
                  <div className="mt-1.5">
                    <MultiSelect
                      options={['Q1', 'Q2', 'Q3', 'Q4'].map((q) => ({ value: q, label: q }))}
                      selectedValues={selectedFYs.length === 1 ? selectedQuarters : []}
                      onChange={(vals) => {
                        if (selectedFYs.length === 1) setSelectedQuarters(vals)
                      }}
                      placeholder={
                        selectedFYs.length === 1 ? 'All quarters' : 'Select exactly one FY first'
                      }
                      variant="zenith"
                      compact
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Preview + save */}
          <section className="min-w-0 space-y-3 xl:col-span-6">
            <ChartPanel
              title={queryResult?.title || 'Chart preview'}
              className="min-h-[420px]"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-[color:var(--text-muted)]">
                  {queryResult?.valueLabel || '—'}
                  {queryFetching ? ' · Updating…' : ''}
                </p>
                <button
                  type="button"
                  onClick={() => void refetchQuery()}
                  className="text-xs font-semibold text-[color:var(--accent-teal)] hover:underline"
                >
                  Refresh
                </button>
              </div>
              {donutWarn ? (
                <p className="mb-2 text-xs text-[color:var(--accent-gold)]">
                  Many slices — a horizontal bar may be easier to read.
                </p>
              ) : null}
              {metaLoading && !queryResult ? (
                <div className="flex h-80 items-center justify-center text-[color:var(--text-muted)]">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                </div>
              ) : (
                <ChartBuilderPreview
                  chartType={spec.chartType}
                  series={series}
                  valueLabel={queryResult?.valueLabel || 'Value'}
                  preferLeadSourceColors={preferLeadSourceColors}
                  height={Math.max(320, Math.min(520, 40 + series.length * 28))}
                />
              )}
            </ChartPanel>

            <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
              <h2 className="zenith-display mb-3 text-sm font-bold text-[color:var(--text-primary)]">
                Save to shared library
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="cb-name">
                    Chart name
                  </label>
                  <input
                    id="cb-name"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder={queryResult?.title || 'Untitled chart'}
                    className={`mt-1.5 ${selectCls}`}
                    maxLength={120}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="cb-desc">
                    Description (optional)
                  </label>
                  <input
                    id="cb-desc"
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    className={`mt-1.5 ${selectCls}`}
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[color:var(--accent-gold)] px-4 text-sm font-bold text-[color:var(--text-on-accent)] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden />
                  {activeChartId ? 'Update chart' : 'Save chart'}
                </button>
                {activeChartId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChartId(null)
                      setSaveName((n) => (n ? `${n} (copy)` : ''))
                    }}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[color:var(--border-default)] px-4 text-sm font-semibold text-[color:var(--text-primary)]"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    Save as new
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] text-[color:var(--text-muted)]">
                Saved charts are visible to all Admin and Management users on any device.
              </p>
            </div>
          </section>

          {/* Library */}
          <aside className="xl:col-span-3">
            <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
              <h2 className="zenith-display mb-3 text-sm font-bold text-[color:var(--text-primary)]">
                Shared library
              </h2>
              {libraryLoading ? (
                <p className="text-sm text-[color:var(--text-muted)]">Loading…</p>
              ) : !library?.length ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  No saved charts yet. Design one and click Save.
                </p>
              ) : (
                <ul className="space-y-2">
                  {library.map((chart) => {
                    const active = chart.id === activeChartId
                    return (
                      <li
                        key={chart.id}
                        className={`rounded-xl border p-3 ${
                          active
                            ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)]'
                            : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)]'
                        }`}
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => openSaved(chart)}
                        >
                          <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                            {chart.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                            {chart.createdBy.name} ·{' '}
                            {new Date(chart.updatedAt).toLocaleDateString('en-IN')}
                          </div>
                        </button>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            title="Duplicate"
                            onClick={() => duplicateSaved(chart)}
                            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:text-[color:var(--accent-teal)]"
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => {
                              if (window.confirm(`Delete “${chart.name}”?`)) {
                                deleteMutation.mutate(chart.id)
                              }
                            }}
                            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[color:var(--accent-red-border)] text-[color:var(--accent-red)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
