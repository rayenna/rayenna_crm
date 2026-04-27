import { HelpSection, HelpSubNavItem } from '../../help/sections'
import { Link, useLocation } from 'react-router-dom'

/** Emoji cues aligned with the Proposal Engine User Guide style (compact nav). */
const SECTION_EMOJI: Record<string, string> = {
  'getting-started': '🚀',
  roles: '👤',
  modules: '🧩',
  dashboard: '📊',
  zenith: '✦',
  training: '🎓',
  security: '🔒',
  faq: '❓',
}

interface HelpSidebarProps {
  sections: HelpSection[]
  selectedSection: HelpSection | null
  onSectionSelect: (section: HelpSection) => void
  /** Optional per-section in-page anchors (e.g. Modules → Customer Master, Projects, …). */
  sectionSubNav?: Partial<Record<string, HelpSubNavItem[]>>
}

const HelpSidebar = ({
  sections,
  selectedSection,
  onSectionSelect,
  sectionSubNav = {},
}: HelpSidebarProps) => {
  const location = useLocation()

  return (
    <div className="flex h-full max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] sticky top-6">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)] px-4 py-3.5">
        <h2 className="zenith-display text-base font-bold tracking-tight text-[color:var(--zenith-table-header-fg)]">
          Help Topics
        </h2>
        <p className="mt-1 text-xs font-medium text-[color:var(--text-secondary)]">
          Press{' '}
          <kbd className="rounded border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-1 py-0.5 font-mono text-[10px] text-[color:var(--accent-gold)]">
            ?
          </kbd>{' '}
          from any page
        </p>
      </div>

      {/* Scrollable Navigation + About in one list with consistent spacing */}
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {sections.map((section) => {
          const isSelected = selectedSection?.id === section.id
          const subItems = sectionSubNav[section.id]
          return (
            <div key={section.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => onSectionSelect(section)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'border-l-4 border-[color:var(--accent-gold)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] shadow-sm ring-1 ring-[color:var(--accent-gold-border)]'
                    : 'border-l-4 border-transparent text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-table-hover)] hover:text-[color:var(--text-primary)]'
                }`}
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-base leading-none" aria-hidden>
                  {SECTION_EMOJI[section.id] ?? '📄'}
                </span>
                <span>{section.title}</span>
              </button>
              {subItems && subItems.length > 0 ? (
                <ul
                  className="ml-2 space-y-0.5 border-l border-[color:var(--border-default)] pl-2.5"
                  aria-label={`${section.title} in this page`}
                >
                  {subItems.map((item) => {
                    const to = `/help/${section.routeKey}#${encodeURIComponent(item.hash)}`
                    const hashActive =
                      location.pathname === `/help/${section.routeKey}` &&
                      decodeURIComponent(location.hash.slice(1) || '') === item.hash
                    return (
                      <li key={item.hash}>
                        <Link
                          to={to}
                          className={`flex w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium leading-snug transition-colors ${
                            hashActive
                              ? 'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)] ring-1 ring-[color:var(--accent-teal-border)]'
                              : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-table-hover)] hover:text-[color:var(--text-primary)]'
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          )
        })}
        {/* About: same vertical rhythm as topics, minimal gap */}
        <div className="mt-1 border-t border-[color:var(--border-default)] pt-2">
          <Link
            to="/about"
            className="flex w-full items-center gap-2.5 rounded-xl border-l-4 border-transparent px-3 py-2.5 text-left text-sm font-medium text-[color:var(--text-secondary)] transition-all duration-200 hover:bg-[color:var(--bg-table-hover)] hover:text-[color:var(--text-primary)]"
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-base leading-none" aria-hidden>
              ℹ️
            </span>
            About
          </Link>
        </div>
      </nav>
    </div>
  )
}

export default HelpSidebar
