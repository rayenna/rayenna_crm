import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

interface ProposalPreviewProps {
  projectId: string
  onClose: () => void
}

interface ProposalData {
  content: {
    executiveSummary: string
    aboutRayenna: string
    systemDescription: string
    whyRayenna: string
    nextSteps: string
  }
  financials: {
    grossProjectCost: number
    subsidyAmount: number
    netCustomerInvestment: number
    estimatedAnnualGeneration: number
    estimatedYearlySavings: number
    estimatedPaybackPeriod: number
    lifetimeSavings: number
  }
  proposalData: {
    customer: {
      name: string
      address?: string
      addressLine1?: string
      city?: string
      state?: string
    }
    project: {
      systemCapacity?: number
      systemType?: string
      roofType?: string
      panelBrand?: string
      inverterBrand?: string
    }
  }
  htmlPreview: string
}

const ProposalPreview = ({ projectId, onClose }: ProposalPreviewProps) => {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const generateProposal = async () => {
    setLoading(true)
    try {
      const res = await axios.post(`/api/projects/${projectId}/generate-proposal`)
      setProposal(res.data)
      toast.success('Proposal generated successfully!')
    } catch (error: any) {
      console.error('Error generating proposal:', error)
      toast.error(error.response?.data?.error || 'Failed to generate proposal')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    setPdfLoading(true)
    try {
      const res = await axios.get(`/api/projects/${projectId}/proposal-pdf`, {
        responseType: 'blob',
      })
      
      // Create blob and download
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Proposal_${proposal?.proposalData.customer.name || 'Project'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // Invalidate project query to refresh documents list (PDF is saved automatically)
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      
      toast.success('PDF downloaded and saved to Key Artifacts!')
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      toast.error(error.response?.data?.error || 'Failed to download PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  if (!proposal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Generate AI Proposal</h2>
            <p className="text-gray-600 mb-6">
              Generate a professional, AI-powered solar proposal for this project. The proposal will include
              system specifications, financial analysis, ROI calculations, and next steps.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={generateProposal}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  'Generate Proposal'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Proposal Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={downloadPDF}
              disabled={pdfLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {pdfLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            dangerouslySetInnerHTML={{ __html: proposal.htmlPreview }}
            className="proposal-content"
          />
        </div>
      </div>
    </div>
  )
}

export default ProposalPreview
