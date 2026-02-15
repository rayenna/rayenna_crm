// Help sections configuration
export interface HelpSection {
  id: string
  title: string
  routeKey: string
  markdownPath: string
  routePatterns?: string[] // Routes that should show this help section
}

export const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    routeKey: 'getting-started',
    markdownPath: '/help-docs/getting-started/index.md',
    routePatterns: ['/dashboard']
  },
  {
    id: 'roles',
    title: 'Roles',
    routeKey: 'roles',
    markdownPath: '/help-docs/roles/index.md'
  },
  {
    id: 'modules',
    title: 'Modules',
    routeKey: 'modules',
    markdownPath: '/help-docs/modules/index.md',
    routePatterns: ['/customers', '/projects', '/users', '/tally-export']
  },
  {
    id: 'analytics',
    title: 'Analytics',
    routeKey: 'analytics',
    markdownPath: '/help-docs/analytics/index.md',
    routePatterns: ['/dashboard']
  },
  {
    id: 'security',
    title: 'Security',
    routeKey: 'security',
    markdownPath: '/help-docs/security/index.md',
    routePatterns: ['/change-password', '/audit-security', '/users']
  },
  {
    id: 'faq',
    title: 'FAQ',
    routeKey: 'faq',
    markdownPath: '/help-docs/faq/index.md'
  }
]

// Route to help section mapping (Dashboard opens Analytics for context-sensitive help)
export const routeToHelpMapping: Record<string, string> = {
  '/dashboard': 'analytics',
  '/customers': 'modules',
  '/projects': 'modules',
  '/support-tickets': 'modules',
  '/tally-export': 'modules',
  '/users': 'security',
  '/change-password': 'security',
  '/audit-security': 'security',
}

/**
 * Get the appropriate help section based on the current route
 * @param currentPath - Current route path
 * @returns HelpSection ID or null
 */
export const getHelpSectionForRoute = (currentPath: string): string | null => {
  // Direct mapping
  if (routeToHelpMapping[currentPath]) {
    return routeToHelpMapping[currentPath]
  }

  // Pattern matching - check if path starts with any route pattern
  for (const section of helpSections) {
    if (section.routePatterns) {
      for (const pattern of section.routePatterns) {
        if (currentPath.startsWith(pattern)) {
          return section.id
        }
      }
    }
  }

  // Special cases
  if (currentPath.startsWith('/projects/')) {
    return 'modules'
  }
  if (currentPath.startsWith('/customers')) {
    return 'modules'
  }
  if (currentPath.startsWith('/support-tickets')) {
    return 'modules'
  }

  // Fallback to getting started
  return 'getting-started'
}

/** Human-readable label for a route, used in the context banner when opening Help from that page */
const routeToContextLabel: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/projects': 'Projects',
  '/support-tickets': 'Support Tickets',
  '/tally-export': 'Tally Export',
  '/users': 'Users',
  '/change-password': 'Change Password',
  '/audit-security': 'Audit & Security',
}

/**
 * Get a short label for the given path for use in the Help context banner
 */
export function getHelpContextLabel(currentPath: string): string | null {
  if (routeToContextLabel[currentPath]) return routeToContextLabel[currentPath]
  if (currentPath.startsWith('/projects/')) return 'Project details'
  return null
}
