/**
 * Simple client-side search over help content.
 * Returns one result per section that contains the query, with a snippet.
 */

export interface HelpSearchItem {
  id: string
  title: string
  routeKey: string
  content: string
}

export interface HelpSearchResult {
  sectionId: string
  sectionTitle: string
  routeKey: string
  snippet: string
}

const SNIPPET_RADIUS = 60

function extractSnippet(content: string, queryLower: string): string {
  const lower = content.toLowerCase()
  const idx = lower.indexOf(queryLower)
  if (idx === -1) return ''
  const start = Math.max(0, idx - SNIPPET_RADIUS)
  const end = Math.min(content.length, idx + queryLower.length + SNIPPET_RADIUS)
  let snippet = content.slice(start, end)
  if (start > 0) snippet = '…' + snippet
  if (end < content.length) snippet = snippet + '…'
  return snippet.replace(/\s+/g, ' ').trim()
}

export function searchHelpContent(
  query: string,
  items: HelpSearchItem[]
): HelpSearchResult[] {
  const q = (query && String(query).trim().toLowerCase()) || ''
  if (q.length === 0) return []
  if (!Array.isArray(items)) return []

  const results: HelpSearchResult[] = []
  for (const item of items) {
    if (!item || !item.id || !item.routeKey) continue
    const content = (item.content || '').replace(/\r\n?/g, '\n')
    if (content.toLowerCase().includes(q)) {
      results.push({
        sectionId: item.id,
        sectionTitle: item.title,
        routeKey: item.routeKey,
        snippet: extractSnippet(content, q),
      })
    }
  }
  return results
}
