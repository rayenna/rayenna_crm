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
    markdownPath: '/help/getting-started/index.md',
    routePatterns: ['/dashboard']
  },
  {
    id: 'roles',
    title: 'Roles',
    routeKey: 'roles',
    markdownPath: '/help/roles/index.md'
  },
  {
    id: 'modules',
    title: 'Modules',
    routeKey: 'modules',
    markdownPath: '/help/modules/index.md',
    routePatterns: ['/customers', '/projects', '/users', '/tally-export']
  },
  {
    id: 'analytics',
    title: 'Analytics',
    routeKey: 'analytics',
    markdownPath: '/help/analytics/index.md',
    routePatterns: ['/dashboard']
  },
  {
    id: 'security',
    title: 'Security',
    routeKey: 'security',
    markdownPath: '/help/security/index.md',
    routePatterns: ['/change-password']
  },
  {
    id: 'faq',
    title: 'FAQ',
    routeKey: 'faq',
    markdownPath: '/help/faq/index.md'
  }
]

// Route to help section mapping
export const routeToHelpMapping: Record<string, string> = {
  '/dashboard': 'getting-started',
  '/customers': 'modules',
  '/projects': 'modules',
  '/support-tickets': 'modules',
  '/tally-export': 'modules',
  '/users': 'modules',
  '/change-password': 'security',
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
