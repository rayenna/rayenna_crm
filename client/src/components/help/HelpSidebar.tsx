import { HelpSection } from '../../help/sections'
import { Link } from 'react-router-dom'

/** Emoji cues aligned with the Proposal Engine User Guide style (compact nav). */
const SECTION_EMOJI: Record<string, string> = {
  'getting-started': '🚀',
  roles: '👤',
  modules: '🧩',
  analytics: '📊',
  training: '🎓',
  security: '🔒',
  faq: '❓',
}

interface HelpSidebarProps {
  sections: HelpSection[]
  selectedSection: HelpSection | null
  onSectionSelect: (section: HelpSection) => void
}

const HelpSidebar = ({ sections, selectedSection, onSectionSelect }: HelpSidebarProps) => {
  return (
    <div className="bg-gradient-to-br from-white via-indigo-50/20 to-sky-50/40 rounded-2xl shadow-md border border-indigo-100/70 flex flex-col h-full max-h-[calc(100vh-8rem)] sticky top-6 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-indigo-100/90 flex-shrink-0 bg-gradient-to-r from-white to-indigo-50/50">
        <h2 className="text-base font-bold text-gray-900 tracking-tight">Help Topics</h2>
        <p className="text-xs text-indigo-600/90 mt-1 font-medium">Press <kbd className="px-1 py-0.5 rounded bg-indigo-100/80 border border-indigo-200/80 text-[10px] font-mono text-indigo-800">?</kbd> from any page</p>
      </div>

      {/* Scrollable Navigation + About in one list with consistent spacing */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 min-h-0">
        {sections.map((section) => {
          const isSelected = selectedSection?.id === section.id
          return (
            <button
              key={section.id}
              onClick={() => onSectionSelect(section)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2.5 ${
                isSelected
                  ? 'bg-primary-50 text-primary-800 border-l-4 border-primary-600 shadow-sm ring-1 ring-primary-100'
                  : 'text-gray-700 hover:bg-white/90 hover:text-primary-700 border-l-4 border-transparent hover:shadow-sm'
              }`}
            >
              <span className="text-base leading-none flex-shrink-0 w-7 text-center" aria-hidden>
                {SECTION_EMOJI[section.id] ?? '📄'}
              </span>
              <span>{section.title}</span>
            </button>
          )
        })}
        {/* About: same vertical rhythm as topics, minimal gap */}
        <div className="pt-2 mt-1 border-t border-indigo-100/80">
          <Link
            to="/about"
            className="block w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/90 hover:text-indigo-700 transition-all duration-200 border-l-4 border-transparent flex items-center gap-2.5"
          >
            <span className="text-base leading-none flex-shrink-0 w-7 text-center" aria-hidden>
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
