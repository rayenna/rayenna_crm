import { getHelpContent } from './contentLoader'
import type { HelpSection } from './sections'

/** Markdown body plus export header for download or print. */
export function formatHelpMarkdownExport(section: HelpSection, body: string): string {
  const exported = new Date().toISOString().slice(0, 10)
  return [
    '<!-- Rayenna CRM Help export -->',
    '',
    `> **Exported:** ${exported} · **Section:** ${section.title} · **In-app:** /help/${section.routeKey}`,
    '',
    body.trim(),
    '',
  ].join('\n')
}

export function helpExportFilename(section: HelpSection): string {
  return `rayenna-crm-help-${section.routeKey}.md`
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Download the merged markdown for one Help section (same text as in-app). */
export function downloadHelpSectionMarkdown(section: HelpSection): void {
  const body = getHelpContent(section.id) || ''
  const content = formatHelpMarkdownExport(section, body)
  downloadTextFile(helpExportFilename(section), content, 'text/markdown;charset=utf-8')
}
