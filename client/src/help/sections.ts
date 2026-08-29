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
  'getting-started': [
    { label: 'Welcome', hash: 'welcome' },
    { label: 'First login', hash: 'first-login-guide' },
    { label: 'Navigation', hash: 'navigation-guide' },
    { label: 'Common actions', hash: 'common-actions-guide' },
    { label: 'Shortcuts', hash: 'keyboard-shortcuts' },
  ],
  roles: [
    { label: 'Overview', hash: 'user-roles-permissions' },
    { label: 'Permission matrix', hash: 'permission-matrix' },
    { label: 'Sales', hash: 'sales-role-guide' },
    { label: 'Operations', hash: 'operations-role-guide' },
    { label: 'Finance', hash: 'finance-role-guide' },
    { label: 'Management', hash: 'management-role-guide' },
    { label: 'Administrator', hash: 'administrator-role-guide' },
  ],
  modules: [
    { label: 'Overview', hash: 'modules' },
    { label: 'Customer Master', hash: 'customer-master-module' },
    { label: 'Projects', hash: 'projects-module' },
    { label: 'Needs review', hash: 'needs-review-data-sense' },
    { label: 'Deal Health', hash: 'deal-health-score' },
    { label: 'Key Artifacts', hash: 'key-artifacts-module' },
    { label: 'Support Tickets', hash: 'support-tickets-module' },
    { label: 'Tally Export', hash: 'tally-export-module' },
  ],
  dashboard: [
    { label: 'Overview', hash: 'dashboard' },
    { label: 'Filters & dates', hash: 'dashboard-filters' },
    { label: "Today's plan (Zenith)", hash: 'todays-plan-dashboard' },
    { label: 'Things needing attention (Zenith)', hash: 'things-needing-attention-dashboard' },
    { label: 'Year-on-Year KPIs', hash: 'year-on-year-kpis' },
    { label: 'Quick Access', hash: 'quick-access-tiles' },
    { label: 'Layout by role', hash: 'layout-by-role' },
    { label: 'Charts', hash: 'charts-and-visualizations' },
  ],
  zenith: [
    { label: 'Overview', hash: 'zenith-command-center' },
    { label: 'Command bar', hash: 'command-bar-and-filters' },
    { label: 'Ribbons & KPIs', hash: 'ribbons-and-kpis' },
    { label: 'Pipeline & Hit List', hash: 'pipeline-and-hit-list' },
    { label: 'Your Focus', hash: 'your-focus' },
    { label: 'Board & funnel', hash: 'board-and-funnel' },
    { label: 'Explore charts', hash: 'explore-charts' },
    { label: 'Quick Actions', hash: 'quick-actions-drawer' },
    { label: 'Mobile & offline', hash: 'mobile-pwa-and-limits' },
    { label: 'My Day', hash: 'my-day-personal-productivity-drawer' },
    { label: 'Help & tips', hash: 'help-and-tips' },
    { label: 'By role', hash: 'zenith-by-role' },
    { label: 'Playbook: Sales', hash: 'sales-playbook-morning-in-zenith' },
    { label: 'Playbook: Finance', hash: 'finance-playbook-payment-radar' },
    { label: 'Playbook: Operations', hash: 'operations-playbook-installation-pulse' },
    { label: 'Playbook: Management', hash: 'management-playbook-executive-review' },
  ],
  security: [
    { label: 'Overview', hash: 'security-privacy' },
    { label: 'Privacy & account', hash: 'privacy-and-account' },
    { label: 'Change password', hash: 'change-password' },
    { label: 'Audit & Security', hash: 'audit-and-security' },
    { label: 'Users', hash: 'users' },
  ],
  faq: [
    { label: 'Overview', hash: 'frequently-asked-questions' },
    { label: 'General', hash: 'general' },
    { label: 'Roles & access', hash: 'roles-and-access' },
    { label: 'Dashboard & Zenith', hash: 'dashboard-and-zenith' },
    { label: 'Customers & projects', hash: 'customers-projects-and-data' },
    { label: 'Admin & security', hash: 'admin-and-security' },
    { label: 'Troubleshooting', hash: 'troubleshooting' },
    { label: 'Proposal Engine', hash: 'proposal-engine' },
  ],
  training: [
    { label: 'Overview', hash: 'rayenna-crm-zenith-training-guide' },
    { label: 'Modules 1-5', hash: 'zenith-modules-1-5' },
    { label: 'Modules 6-10', hash: 'zenith-modules-6-10' },
    { label: 'Workshop & lab', hash: 'workshop-script-and-lab' },
    { label: 'Reference', hash: 'training-reference' },
  ],
}

/**
 * When opening Help from an app route, scroll target inside the matching help section.
 * Hashes must match H1 titles (see `slugifyHeadingLabel` in Help.tsx).
 */
export function getHelpHashForRoute(currentPath: string): string | null {
  if (currentPath.startsWith('/zenith')) return 'zenith-command-center'
  if (currentPath === '/dashboard' || currentPath.startsWith('/dashboard/')) return 'dashboard'
  if (currentPath === '/customers' || currentPath.startsWith('/customers/')) {
    return currentPath === '/customers' || currentPath === '/customers/'
      ? 'customer-master-module'
      : 'customer-detail-page'
  }
  if (currentPath === '/projects/new') return 'projects-module'
  if (currentPath.startsWith('/projects/')) return 'project-detail-page'
  if (currentPath === '/projects') return 'projects-module'
  if (currentPath === '/support-tickets' || currentPath.startsWith('/support-tickets/')) {
    return 'support-tickets-module'
  }
  if (currentPath === '/tally-export' || currentPath.startsWith('/tally-export/')) {
    return 'tally-export-module'
  }
  if (currentPath === '/users' || currentPath.startsWith('/users/')) return 'users'
  if (currentPath === '/audit-security' || currentPath.startsWith('/audit-security/')) {
    return 'audit-and-security'
  }
  if (currentPath === '/change-password' || currentPath.startsWith('/change-password/')) {
    return 'change-password'
  }
  return null
}

/**
 * URL fragments that belong to the classic **Dashboard** help page (`/help/dashboard`).
 * Used to redirect legacy `/help/analytics#…` links to Dashboard vs Zenith help.
 */
export const dashboardHelpAnchors = new Set([
  'dashboard',
  'scrolling-announcements-dashboard',
  'todays-plan-dashboard',
  'dashboard-filters',
  'things-needing-attention-dashboard',
  'year-on-year-kpis',
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
    routePatterns: ['/customers', '/projects', '/tally-export']
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
  },
  {
    id: 'training',
    title: 'Training',
    routeKey: 'training',
    markdownPath: '/help-docs/training/index.md',
  },
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
  '/projects/new': 'New project',
  '/support-tickets': 'Support Tickets',
  '/tally-export': 'Tally Export',
  '/users': 'Users',
  '/change-password': 'Change Password',
  '/audit-security': 'Audit & Security',
}

/**
 * Build `/help/{section}` path with optional in-page hash for the current app route.
 */
export function getHelpPathForRoute(currentPath: string): string {
  const sectionId = getHelpSectionForRoute(currentPath)
  const section = helpSections.find((s) => s.id === sectionId)
  if (!section) return '/help/getting-started'
  const hash = getHelpHashForRoute(currentPath)
  if (hash) return `/help/${section.routeKey}#${hash}`
  return `/help/${section.routeKey}`
}

/**
 * Get a short label for the given path for use in the Help context banner
 */
export function getHelpContextLabel(currentPath: string): string | null {
  if (routeToContextLabel[currentPath]) return routeToContextLabel[currentPath]
  if (currentPath.startsWith('/projects/') && currentPath !== '/projects/new') {
    return 'Project details'
  }
  if (currentPath.startsWith('/customers/') && currentPath !== '/customers') {
    return 'Customer details'
  }
  if (currentPath.startsWith('/support-tickets/')) return 'Ticket details'
  return null
}
