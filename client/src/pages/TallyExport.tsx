import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axiosInstance from '../utils/axios'
import { UserRole } from '../types'

const TallyExport = () => {
  const { hasRole } = useAuth()
  const [exportType, setExportType] = useState<'projects' | 'invoices' | 'payments'>('projects')
  const [format, setFormat] = useState<'excel' | 'csv' | 'tally-xml'>('excel')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showExportConfirm, setShowExportConfirm] = useState(false)

  // Check if user has access
  if (!hasRole([UserRole.ADMIN, UserRole.FINANCE])) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You don't have permission to access this page.</p>
        </div>
      </div>
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
          Authorization: `Bearer ${localStorage.getItem('token')}`,
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
    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.response?.data?.error || 'Failed to export data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cancelExport = () => {
    setShowExportConfirm(false)
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-4xl mx-auto">
        <div className="border-l-4 border-l-emerald-500 pl-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Tally Data Export
          </h1>
          <p className="text-sm text-emerald-600/80 mt-0.5">Export projects, invoices, and payments for Tally integration</p>
        </div>

        <div className="bg-white rounded-xl border-l-4 border-l-emerald-400 border border-emerald-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Export Data</h3>
          </div>
          {/* Info Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-emerald-900 mb-2">Export Instructions</h3>
            <ul className="text-sm text-emerald-800 space-y-1 list-disc list-inside">
              <li><strong>Excel:</strong> Import directly into Tally using Excel import feature</li>
              <li><strong>CSV:</strong> Compatible with Tally CSV import format</li>
              <li><strong>Tally XML:</strong> Native Tally format - Import via Tally Gateway of Tally</li>
            </ul>
          </div>

          {/* Export Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Data Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setExportType('projects')}
                className={`px-4 py-3 rounded-xl border-2 transition-colors ${
                  exportType === 'projects'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300'
                }`}
              >
                Projects
              </button>
              <button
                type="button"
                onClick={() => setExportType('invoices')}
                className={`px-4 py-3 rounded-xl border-2 transition-colors ${
                  exportType === 'invoices'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300'
                }`}
              >
                Invoices
              </button>
              <button
                type="button"
                onClick={() => setExportType('payments')}
                className={`px-4 py-3 rounded-xl border-2 transition-colors ${
                  exportType === 'payments'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300'
                }`}
              >
                Payments
              </button>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  format === 'excel'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary-300'
                }`}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`px-4 py-3 rounded-xl border-2 transition-colors ${
                  format === 'csv'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300'
                }`}
              >
                CSV (.csv)
              </button>
              <button
                type="button"
                onClick={() => setFormat('tally-xml')}
                className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                  format === 'tally-xml'
                    ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary-300'
                }`}
              >
                Tally XML
              </button>
            </div>
          </div>

          {/* Date Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date (Optional)
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Export Button */}
          <div>
            <button
              onClick={handleExport}
              disabled={loading || showExportConfirm}
              className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold transition-colors ${
                loading || showExportConfirm
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-primary-600 text-white hover:from-emerald-700 hover:to-primary-700 shadow-md'
              }`}
            >
              {loading ? 'Exporting...' : `Export ${exportType.charAt(0).toUpperCase() + exportType.slice(1)} as ${format.toUpperCase().replace('-', '/')}`}
            </button>
          </div>
        </div>

        {/* Export Confirmation Modal */}
        {showExportConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6">
                <h3 className="text-xl font-bold text-red-600 mb-4">WARNING</h3>
                <div className="border-t border-b border-gray-300 my-4 py-4">
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited.
                  </p>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.
                  </p>
                  <p className="text-gray-700 mb-4 leading-relaxed font-medium">
                    By exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.
                  </p>
                </div>
                <p className="text-gray-600 mb-6 font-medium">
                  Do you want to continue?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={cancelExport}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={confirmExport}
                    className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
                  >
                    YES
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border-l-4 border-l-sky-400 border border-sky-100">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">How to Import into Tally</h3>
          </div>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold mb-2">For Excel/CSV Format:</h4>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Open Tally and go to Gateway of Tally</li>
                <li>Select F11 (Features) → Set "Allow Excel Import" to Yes</li>
                <li>Go to Gateway of Tally → Import → Excel/CSV</li>
                <li>Select the exported file and map the columns</li>
                <li>Complete the import process</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">For Tally XML Format:</h4>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Open Tally and go to Gateway of Tally</li>
                <li>Press F11 (Features) → Enable "Import from Tally XML"</li>
                <li>Go to Gateway of Tally → Import → Tally XML</li>
                <li>Select the exported XML file</li>
                <li>Tally will automatically import ledgers/vouchers</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 leading-relaxed">
            <strong>WARNING:</strong> Access to this page is monitored and downloading of data from this page is only with management approvals. All Data / Info in this CRM System is the exclusive property of Rayenna Energy Private Limited.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TallyExport
