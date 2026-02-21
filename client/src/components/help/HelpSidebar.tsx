import { HelpSection } from '../../help/sections'
import { Link } from 'react-router-dom'

interface HelpSidebarProps {
  sections: HelpSection[]
  selectedSection: HelpSection | null
  onSectionSelect: (section: HelpSection) => void
}

const HelpSidebar = ({ sections, selectedSection, onSectionSelect }: HelpSidebarProps) => {
  return (
    <div className="bg-gradient-to-br from-white to-sky-50/30 rounded-xl shadow-sm border border-sky-100/60 flex flex-col h-full max-h-[calc(100vh-8rem)] sticky top-6 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-sky-100/80 flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900">Help Topics</h2>
        <p className="text-xs text-sky-600/80 mt-0.5">Press ? for help</p>
      </div>

      {/* Scrollable Navigation + About in one list with consistent spacing */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 min-h-0">
        {sections.map((section) => {
          const isSelected = selectedSection?.id === section.id
          return (
            <button
              key={section.id}
              onClick={() => onSectionSelect(section)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600 border-l-4 border-transparent'
              }`}
            >
              {section.title}
            </button>
          )
        })}
        {/* About: same vertical rhythm as topics, minimal gap */}
        <div className="pt-2 mt-1 border-t border-sky-100/80">
          <Link
            to="/about"
            className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-sky-50/50 hover:text-sky-700 transition-all duration-200 border-l-4 border-transparent"
          >
            About
          </Link>
        </div>
      </nav>
    </div>
  )
}

export default HelpSidebar
