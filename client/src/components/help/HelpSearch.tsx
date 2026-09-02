import type { HelpSearchResult } from '../../help/searchHelp'

type HelpSearchProps = {
  id?: string
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  searchResults: HelpSearchResult[]
  onResultClick: (routeKey: string) => void
  className?: string
}

export default function HelpSearch({
  id = 'help-search',
  searchQuery,
  onSearchQueryChange,
  searchResults,
  onResultClick,
  className = '',
}: HelpSearchProps) {
  const resultsId = `${id}-results`

  return (
    <div
      className={`flex-shrink-0 overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ${className}`.trim()}
    >
      <label htmlFor={id} className="sr-only">
        Search help
      </label>
      <input
        id={id}
        type="search"
        placeholder="Search help…"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="zenith-native-filter-input w-full rounded-none border-0 px-4 py-3 text-sm placeholder:text-[color:var(--text-placeholder)] focus:ring-0"
        aria-describedby={searchQuery.trim().length > 0 ? resultsId : undefined}
      />
      {searchQuery.trim().length > 0 ? (
        <div
          id={resultsId}
          className="max-h-64 overflow-y-auto border-t border-[color:var(--border-default)]"
          role="list"
        >
          {searchResults.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[color:var(--text-muted)]">No matches</p>
          ) : (
            searchResults.map((r) => (
              <button
                key={r.routeKey}
                type="button"
                onClick={() => onResultClick(r.routeKey)}
                className="w-full border-b border-[color:var(--border-default)] px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-[color:var(--bg-table-hover)] touch-manipulation min-h-[44px]"
                role="listitem"
              >
                <span className="block font-semibold text-[color:var(--accent-gold)]">{r.sectionTitle}</span>
                <span className="line-clamp-2 text-[color:var(--text-secondary)]">{r.snippet}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
