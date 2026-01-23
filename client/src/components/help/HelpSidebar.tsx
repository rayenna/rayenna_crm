import { HelpSection } from '../../help/sections'
import { Link } from 'react-router-dom'

interface HelpSidebarProps {
  sections: HelpSection[]
  selectedSection: HelpSection | null
  onSectionSelect: (section: HelpSection) => void
}

const HelpSidebar = ({ sections, selectedSection, onSectionSelect }: HelpSidebarProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full max-h-[calc(100vh-8rem)] sticky top-6">
      {/* Header */}
      <div className="px-4 lg:px-6 pt-4 lg:pt-6 pb-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Help Topics</h2>
        <p className="text-xs text-gray-500 mt-1">Press ? for help</p>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 lg:px-4 py-4 space-y-1">
        {sections.map((section) => {
          const isSelected = selectedSection?.id === section.id
          return (
            <button
              key={section.id}
              onClick={() => onSectionSelect(section)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600 border-l-4 border-transparent'
              }`}
            >
              {section.title}
            </button>
          )
        })}
      </nav>
      
      {/* Additional Help Links */}
      <div className="px-3 lg:px-4 pt-4 pb-4 lg:pb-6 border-t border-gray-200">
        <Link
          to="/about"
          className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-all duration-200"
        >
          About
        </Link>
      </div>
    </div>
  )
}

export default HelpSidebar
