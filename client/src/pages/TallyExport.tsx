import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axiosInstance from '../utils/axios'
import { UserRole } from '../types'
import { FileOutput, Info } from 'lucide-react'
import { ErrorModal } from '@/components/common/ErrorModal'

const TallyExport = () => {
  const { hasRole } = useAuth()
  const [exportType, setExportType] = useState<'projects' | 'invoices' | 'payments'>('projects')
  const [format, setFormat] = useState<'excel' | 'csv' | 'tally-xml'>('excel')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showExportConfirm, setShowExportConfirm] = useState(false)

  const shell = (children: React.ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  // Check if user has access
  if (!hasRole([UserRole.ADMIN, UserRole.FINANCE])) {
    return shell(
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 pt-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-8 shadow-[var(--shadow-card)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:color-mix(in srgb,var(--accent-red) 12%, var(--bg-card))] text-[color:var(--accent-red)]">
            <FileOutput className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
          <h1 className="zenith-display text-lg font-bold tracking-tight text-[color:var(--text-primary)]">Access denied</h1>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">You don't have permission to access this page.</p>
        </div>
      </div>,
    )
  }

  const handleExport = () => {
    // Show confirmation modal first
    setShowExportConfirm(true)
  }

  const confirmExport = async () => {
    setShowExportConfirm(false)
    setLoading(true)
    setError('')

    try {
      let url = ''
      const params = new URLSearchParams()

      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      if (format === 'csv') {
        url = `/api/tally/export/csv?type=${exportType}${params.toString() ? '&' + params.toString() : ''}`
      } else if (format === 'tally-xml') {
        url = `/api/tally/export/tally-xml?type=${exportType === 'projects' ? 'ledgers' : 'vouchers'}${params.toString() ? '&' + params.toString() : ''}`
      } else {
        // Excel format
        if (exportType === 'projects') {
          url = `/api/tally/export/projects/excel${params.toString() ? '?' + params.toString() : ''}`
        } else if (exportType === 'invoices') {
          url = `/api/tally/export/invoices/excel${params.toString() ? '?' + params.toString() : ''}`
        } else {
          url = `/api/tally/export/payments/excel${params.toString() ? '?' + params.toString() : ''}`
        }
      }

      const response = await axiosInstance.get(url, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
      })

      // Create download link
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      // Set filename based on format
      const extension = format === 'csv' ? 'csv' : format === 'tally-xml' ? 'xml' : 'xlsx'
      link.download = `tally-export-${exportType}-${Date.now()}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Export error:', err)
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error || 'Failed to export data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cancelExport = () => {
    setShowExportConfirm(false)
  }

  return (
    shell(
      <>
        <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
                <FileOutput className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">Tally Data Export</h1>
                <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">Export projects, invoices, and payments for Tally integration</p>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)]">
            <div className="h-1.5 bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-amber)] to-[color:var(--accent-teal)]" aria-hidden />
            <div className="space-y-6 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-[color:var(--accent-teal)]" strokeWidth={2} aria-hidden />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--text-primary)]">Export Data</h3>
              </div>

              {/* Info Banner */}
              <div className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-4 sm:p-5">
                <h3 className="zenith-display mb-2 text-sm font-semibold text-[color:var(--text-primary)]">Export Instructions</h3>
                <ul className="list-inside list-disc space-y-1.5 text-sm text-[color:var(--text-secondary)]">
                  <li><strong className="text-[color:var(--text-primary)]">Excel:</strong> Import directly into Tally using Excel import feature</li>
                  <li><strong className="text-[color:var(--text-primary)]">CSV:</strong> Compatible with Tally CSV import format</li>
                  <li><strong className="text-[color:var(--text-primary)]">Tally XML:</strong> Native Tally format - Import via Tally Gateway of Tally</li>
                </ul>
              </div>

              {/* Export Type Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--text-primary)]">Export Data Type</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(['projects', 'invoices', 'payments'] as const).map((t) => {
                    const active = exportType === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setExportType(t)}
                        className={`min-h-[44px] touch-manipulation rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                          active
                            ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                            : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]'
                        }`}
                      >
                        {t === 'projects' ? 'Projects' : t === 'invoices' ? 'Invoices' : 'Payments'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[color:var(--text-primary)]">Export Format</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(['excel', 'csv', 'tally-xml'] as const).map((f) => {
                    const active = format === f
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={`min-h-[44px] touch-manipulation rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                          active
                            ? 'border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                            : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]'
                        }`}
                      >
                        {f === 'excel' ? 'Excel (.xlsx)' : f === 'csv' ? 'CSV (.csv)' : 'Tally XML'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-[color:var(--text-primary)]">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="zenith-native-select mt-1.5 block w-full rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-[color:var(--text-primary)]">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="zenith-native-select mt-1.5 block w-full rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Error: shown in unified ErrorModal */}
              <ErrorModal
                open={!!error}
                onClose={() => setError('')}
                type="error"
                surface="zenith"
                message={error}
                actions={[{ label: 'Dismiss', variant: 'ghost', onClick: () => setError('') }]}
              />

              {/* Export Button */}
              <div className="pt-2">
                <button
                  onClick={handleExport}
                  disabled={loading || showExportConfirm}
                  className={`min-h-[44px] touch-manipulation w-full rounded-xl px-6 py-3 font-bold transition-opacity sm:w-auto ${
                    loading || showExportConfirm
                      ? 'cursor-not-allowed bg-[color:var(--bg-badge)] text-[color:var(--text-muted)]'
                      : 'bg-gradient-to-r from-[color:var(--accent-teal)] to-[color:var(--accent-gold)] text-[color:var(--text-inverse)] shadow-lg hover:opacity-95'
                  }`}
                >
                  {loading
                    ? 'Exporting...'
                    : `Export ${exportType.charAt(0).toUpperCase() + exportType.slice(1)} as ${format
                        .toUpperCase()
                        .replace('-', '/')}`}
                </button>
              </div>
            </div>
          </section>

          {/* Export Confirmation: unified ErrorModal */}
          <ErrorModal
            open={showExportConfirm}
            onClose={cancelExport}
            type="warning"
            surface="zenith"
            message={`The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited.

Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.

By exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.

Do you want to continue?`}
            actions={[
              { label: 'CANCEL', variant: 'ghost', onClick: cancelExport },
              { label: 'YES', variant: 'primary', onClick: confirmExport },
            ]}
          />

          {/* Help Section */}
          <section className="overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)]">
            <div className="p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--text-primary)]">How to Import into Tally</h3>
              </div>
              <div className="space-y-4 text-sm text-[color:var(--text-secondary)]">
                <div>
                  <h4 className="mb-2 font-semibold text-[color:var(--text-primary)]">For Excel/CSV Format:</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Open Tally and go to Gateway of Tally</li>
                    <li>Select F11 (Features) → Set \"Allow Excel Import\" to Yes</li>
                    <li>Go to Gateway of Tally → Import → Excel/CSV</li>
                    <li>Select the exported file and map the columns</li>
                    <li>Complete the import process</li>
                  </ol>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold text-[color:var(--text-primary)]">For Tally XML Format:</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Open Tally and go to Gateway of Tally</li>
                    <li>Press F11 (Features) → Enable \"Import from Tally XML\"</li>
                    <li>Go to Gateway of Tally → Import → Tally XML</li>
                    <li>Select the exported XML file</li>
                    <li>Tally will automatically import ledgers/vouchers</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>

          {/* Warning Message */}
          <section className="rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-[color:var(--text-primary)]">
              <strong className="text-[color:var(--accent-red)]">WARNING:</strong> Access to this page is monitored and downloading of data from this page is only with management approvals. All Data / Info in this CRM System is the exclusive property of Rayenna Energy Private Limited.
            </p>
          </section>
        </div>
      </>,
    )
  )
}

export default TallyExport
