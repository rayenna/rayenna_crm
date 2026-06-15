import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadHelpSectionMarkdown } from '../../help/helpExport'
import type { HelpSection } from '../../help/sections'

type HelpExportButtonProps = {
  section: HelpSection
  disabled?: boolean
}

export default function HelpExportButton({ section, disabled }: HelpExportButtonProps) {
  const handleDownload = () => {
    try {
      downloadHelpSectionMarkdown(section)
      toast.success(`Downloaded ${section.title} help (.md)`)
    } catch {
      toast.error('Could not download help file')
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled}
      className="inline-flex min-h-[40px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-colors hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      title={`Download ${section.title} as Markdown`}
    >
      <Download className="h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
      <span>Download Markdown</span>
    </button>
  )
}
