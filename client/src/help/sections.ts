// Help sections configuration
export interface HelpSection {
  id: string
  title: string
  routeKey: string
  markdownPath: string
  routePatterns?: string[] // Routes that should show this help section
}

/** Sidebar sub-links under a help section (hash = `slugifyHeadingLabel` of the target H1 in that page). */
export type HelpSubNavItem = { label: string; hash: string }

export const helpSectionSubNav: Partial<Record<string, HelpSubNavItem[]>> = {
  modules: [
    { label: 'Customer Master', hash: 'customer-master-module' },
    { label: 'Projects', hash: 'projects-module' },
    { label: 'Support Tickets', hash: 'support-tickets-module' },
    { label: 'Tally Export', hash: 'tally-export-module' },
  ],
}

/**
 * When opening Help from a module route, scroll target inside /help/modules.
 * Hashes must match H1 titles in `content/modules/index.md` (see `slugifyHeadingLabel` in Help.tsx).
 */
export function getHelpHashForRoute(currentPath: string): string | null {
  if (currentPath === '/customers' || currentPath.startsWith('/customers/')) return 'customer-master-module'
  if (currentPath === '/projects' || currentPath.startsWith('/projects/')) return 'projects-module'
  if (currentPath === '/support-tickets' || currentPath.startsWith('/support-tickets/')) {
    return 'support-tickets-module'
  }
  if (currentPath === '/tally-export' || currentPath.startsWith('/tally-export/')) return 'tally-export-module'
  return null
}

/**
 * URL fragments that belong to the classic **Dashboard** help page (`/help/dashboard`).
 * Used to redirect legacy `/help/analytics#…` links to Dashboard vs Zenith help.
 */
export const dashboardHelpAnchors = new Set([
  'dashboard-filters',
  'things-needing-attention-dashboard',
  'quick-access-tiles',
  'payment-status-card',
  'proposal-engine-card',
  'layout-by-role',
  'charts-and-visualizations',
  'classic-dashboard-chart-click-through-to-projects',
  'keyboard-shortcuts',
])

export const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    routeKey: 'getting-started',
    markdownPath: '/help-docs/getting-started/index.md',
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
    id: 'dashboard',
    title: 'Dashboard',
    routeKey: 'dashboard',
    markdownPath: '/help-docs/dashboard/index.md',
    routePatterns: ['/dashboard'],
  },
  {
    id: 'zenith',
    title: 'Zenith',
    routeKey: 'zenith',
    markdownPath: '/help-docs/zenith/index.md',
    routePatterns: ['/zenith'],
  },
  {
    id: 'training',
    title: 'Training',
    routeKey: 'training',
    markdownPath: '/help-docs/training/index.md',
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

// Route to help section mapping (context-sensitive Help)
export const routeToHelpMapping: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/zenith': 'zenith',
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
  '/zenith': 'Zenith',
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
