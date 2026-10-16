import { UserRole } from '../types'
import { ROUTE_ROLES } from './routeRoles'

export type CommandPaletteGroup = 'Create' | 'Go to' | 'Search' | 'Lists'

/** Non-navigation runs handled in CommandPalette / Layout. */
export type CommandPaletteRun =
  | { type: 'href'; href: string }
  | { type: 'my_day' }
  | { type: 'my_day_journal' }
  | { type: 'show_tip' }

export type CommandPaletteItem = {
  id: string
  label: string
  /** Extra tokens for filter matching. */
  keywords: string[]
  group: CommandPaletteGroup
  roles: readonly UserRole[]
  /** Static destination, or builder when the palette query should be passed through. */
  href?: string | ((query: string) => string)
  /** Special run when not a plain href navigate. */
  run?: 'my_day' | 'my_day_journal' | 'show_tip'
  /** Shown only when the user has typed a search query. */
  dynamic?: boolean
}

const ALL = ROUTE_ROLES.allStaff
const SUPPORT = ROUTE_ROLES.supportTickets
const NEW_CUSTOMER: UserRole[] = [UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN]
/** Matches Layout Ctrl/Cmd+Shift+E shortcut. */
const NEW_PROJECT: UserRole[] = [UserRole.ADMIN, UserRole.SALES]
const DASHBOARD: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
  UserRole.MANAGEMENT,
]
const EXEC: UserRole[] = [UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN]

/**
 * Global command palette items (⌘K / Ctrl+K).
 * Keep create/search/list targets aligned with Ask-box actions in
 * `src/services/zenithNl/askActions.ts`.
 */
export const COMMAND_PALETTE_ITEMS: CommandPaletteItem[] = [
  // —— Create ——
  {
    id: 'new_customer',
    label: 'New Customer',
    keywords: ['create', 'add', 'customer'],
    group: 'Create',
    roles: NEW_CUSTOMER,
    href: '/customers?new=1',
  },
  {
    id: 'new_project',
    label: 'New Project',
    keywords: ['create', 'add', 'project'],
    group: 'Create',
    roles: NEW_PROJECT,
    href: '/projects/new',
  },
  {
    id: 'create_support_ticket',
    label: 'Create Support Ticket',
    keywords: ['ticket', 'raise', 'support', 'new ticket'],
    group: 'Create',
    roles: SUPPORT,
    href: '/support-tickets?new=1',
  },
  {
    id: 'new_user',
    label: 'New User',
    keywords: ['create', 'add', 'user', 'account', 'staff'],
    group: 'Create',
    roles: ROUTE_ROLES.users,
    href: '/users?new=1',
  },

  // —— Personal / tips ——
  {
    id: 'open_my_day',
    label: 'Open My Day',
    keywords: ['tasks', 'journal', 'reminders', 'myday', 'my day'],
    group: 'Go to',
    roles: ALL,
    run: 'my_day',
  },
  {
    id: 'open_my_day_journal',
    label: 'Open My Day Journal',
    keywords: ['journal', 'diary', 'end of day', 'myday'],
    group: 'Go to',
    roles: ALL,
    run: 'my_day_journal',
  },
  {
    id: 'show_tip',
    label: 'Show Tip of the Day',
    keywords: ['tip', 'hint', 'discover'],
    group: 'Go to',
    roles: ALL,
    run: 'show_tip',
  },

  // —— Lists / filtered queues ——
  {
    id: 'overdue_support_tickets',
    label: 'Overdue Support Tickets',
    keywords: ['overdue', 'tickets', 'queue', 'support'],
    group: 'Lists',
    roles: SUPPORT,
    href: '/support-tickets?filter=overdue',
  },
  {
    id: 'open_support_tickets',
    label: 'Open Support Tickets (queue)',
    keywords: ['open', 'tickets', 'queue', 'support'],
    group: 'Lists',
    roles: SUPPORT,
    href: '/support-tickets?filter=open',
  },
  {
    id: 'solar_hub_tickets',
    label: 'Solar Hub Support Tickets',
    keywords: ['hub', 'consumer', 'tickets', 'solar'],
    group: 'Lists',
    roles: SUPPORT,
    href: '/support-tickets?filter=hub',
  },
  {
    id: 'proposal_projects',
    label: 'Proposal-stage Projects',
    keywords: ['proposal', 'pipeline', 'stage'],
    group: 'Lists',
    roles: ALL,
    href: '/projects?status=PROPOSAL',
  },
  {
    id: 'confirmed_projects',
    label: 'Confirmed Projects',
    keywords: ['confirmed', 'orders', 'pipeline'],
    group: 'Lists',
    roles: ALL,
    href: '/projects?status=CONFIRMED',
  },
  {
    id: 'under_installation',
    label: 'Under Installation Projects',
    keywords: ['installation', 'install', 'ops'],
    group: 'Lists',
    roles: ALL,
    href: '/projects?status=UNDER_INSTALLATION',
  },
  {
    id: 'pending_subsidy',
    label: 'Pending Subsidy Projects',
    keywords: ['subsidy', 'pending', 'credit'],
    group: 'Lists',
    roles: ALL,
    href: '/projects?pendingSubsidy=true',
  },
  {
    id: 'availing_loan',
    label: 'Availing Loan Projects',
    keywords: ['loan', 'finance', 'bank'],
    group: 'Lists',
    roles: ALL,
    href: '/projects?availingLoan=true',
  },
  {
    id: 'data_sense_review',
    label: 'Projects Needing Review',
    keywords: ['data sense', 'needs review', 'quality', 'gaps'],
    group: 'Lists',
    roles: EXEC,
    href: '/projects?dataSenseNeedsReview=true',
  },
  {
    id: 'pe_not_started',
    label: 'Proposal Engine — Not Started',
    keywords: ['proposal engine', 'pe', 'not started', 'costing'],
    group: 'Lists',
    roles: EXEC,
    href: '/projects?peBucket=not-started',
  },
  {
    id: 'pe_draft',
    label: 'Proposal Engine — Drafts',
    keywords: ['proposal engine', 'pe', 'draft'],
    group: 'Lists',
    roles: EXEC,
    href: '/projects?peBucket=draft',
  },
  {
    id: 'pe_ready',
    label: 'Proposal Engine — Proposal Ready',
    keywords: ['proposal engine', 'pe', 'ready'],
    group: 'Lists',
    roles: EXEC,
    href: '/projects?peBucket=proposal-ready',
  },

  // —— Go to ——
  {
    id: 'go_zenith',
    label: 'Go to Zenith',
    keywords: ['ask', 'analytics', 'dashboard'],
    group: 'Go to',
    roles: DASHBOARD,
    href: '/zenith',
  },
  {
    id: 'go_customers',
    label: 'Go to Customers',
    keywords: ['customers', 'list'],
    group: 'Go to',
    roles: ALL,
    href: '/customers',
  },
  {
    id: 'go_projects',
    label: 'Go to Projects',
    keywords: ['projects', 'list'],
    group: 'Go to',
    roles: ALL,
    href: '/projects',
  },
  {
    id: 'go_support_tickets',
    label: 'Go to Support Tickets',
    keywords: ['tickets', 'queue', 'support'],
    group: 'Go to',
    roles: SUPPORT,
    href: '/support-tickets',
  },
  {
    id: 'go_dashboard',
    label: 'Go to Dashboard (Old)',
    keywords: ['dashboard', 'classic'],
    group: 'Go to',
    roles: DASHBOARD,
    href: '/dashboard',
  },
  {
    id: 'go_solar_hub',
    label: 'Go to Solar Hub',
    keywords: ['solar', 'hub', 'consumer'],
    group: 'Go to',
    roles: ROUTE_ROLES.solarHub,
    href: '/solar-hub',
  },
  {
    id: 'go_solar_hub_provisioning',
    label: 'Solar Hub Provisioning',
    keywords: ['provision', 'hub', 'login', 'handover'],
    group: 'Go to',
    roles: ROUTE_ROLES.solarHub,
    href: '/solar-hub/provisioning',
  },
  {
    id: 'go_solar_hub_unlinked',
    label: 'Solar Hub — Unlinked Plants',
    keywords: ['unlinked', 'plants', 'hub', 'link'],
    group: 'Go to',
    roles: ROUTE_ROLES.solarHub,
    href: '/solar-hub/users?plantLink=none',
  },
  {
    id: 'go_solar_hub_maintenance',
    label: 'Solar Hub Maintenance',
    keywords: ['maintenance', 'hub', 'cleaning'],
    group: 'Go to',
    roles: ROUTE_ROLES.solarHub,
    href: '/solar-hub/maintenance',
  },
  {
    id: 'go_lost_deals',
    label: 'Go to Lost Deals',
    keywords: ['lost', 'deals'],
    group: 'Go to',
    roles: ROUTE_ROLES.lostDeals,
    href: '/lost-deals',
  },
  {
    id: 'go_tally_export',
    label: 'Go to Tally Export',
    keywords: ['tally', 'export', 'finance', 'accounting'],
    group: 'Go to',
    roles: ROUTE_ROLES.tallyExport,
    href: '/tally-export',
  },
  {
    id: 'go_users',
    label: 'Go to Users',
    keywords: ['users', 'staff', 'accounts'],
    group: 'Go to',
    roles: ROUTE_ROLES.users,
    href: '/users',
  },
  {
    id: 'go_audit',
    label: 'Go to Audit & Security',
    keywords: ['audit', 'security', 'log'],
    group: 'Go to',
    roles: ROUTE_ROLES.auditSecurity,
    href: '/audit-security',
  },
  {
    id: 'go_change_password',
    label: 'Change Password',
    keywords: ['password', 'security', 'account'],
    group: 'Go to',
    roles: ALL,
    href: '/change-password',
  },
  {
    id: 'go_help',
    label: 'Open Help',
    keywords: ['help', 'docs', '?'],
    group: 'Go to',
    roles: ALL,
    href: '/help',
  },

  // —— Search (dynamic) ——
  {
    id: 'search_customers',
    label: 'Search Customers',
    keywords: ['find', 'customer', 'search'],
    group: 'Search',
    roles: ALL,
    href: (q) => {
      const t = q.trim()
      return t ? `/customers?q=${encodeURIComponent(t)}` : '/customers'
    },
    dynamic: true,
  },
  {
    id: 'search_projects',
    label: 'Search Projects',
    keywords: ['find', 'project', 'search'],
    group: 'Search',
    roles: ALL,
    href: (q) => {
      const t = q.trim()
      return t ? `/projects?search=${encodeURIComponent(t)}` : '/projects'
    },
    dynamic: true,
  },
]

export function resolveCommandRun(item: CommandPaletteItem, query: string): CommandPaletteRun {
  if (item.run === 'my_day') return { type: 'my_day' }
  if (item.run === 'my_day_journal') return { type: 'my_day_journal' }
  if (item.run === 'show_tip') return { type: 'show_tip' }
  const href =
    typeof item.href === 'function' ? item.href(query) : item.href || '/'
  return { type: 'href', href }
}

/** @deprecated use resolveCommandRun — kept for tests that only need hrefs */
export function resolveCommandHref(item: CommandPaletteItem, query: string): string {
  const run = resolveCommandRun(item, query)
  return run.type === 'href' ? run.href : '/'
}

export function filterCommandPaletteItems(
  role: UserRole | undefined,
  query: string,
): CommandPaletteItem[] {
  if (!role) return []
  const q = query.trim().toLowerCase()
  const allowed = COMMAND_PALETTE_ITEMS.filter((item) => item.roles.includes(role))

  if (!q) {
    return allowed.filter((item) => !item.dynamic)
  }

  const staticHits = allowed.filter((item) => {
    if (item.dynamic) return false
    const hay = `${item.label} ${item.keywords.join(' ')}`.toLowerCase()
    return hay.includes(q) || q.split(/\s+/).every((part) => hay.includes(part))
  })

  const dynamic = allowed
    .filter((item) => item.dynamic)
    .map((item) => ({
      ...item,
      label:
        item.id === 'search_customers'
          ? `Search customers for “${query.trim()}”`
          : item.id === 'search_projects'
            ? `Search projects for “${query.trim()}”`
            : item.label,
    }))

  return [...staticHits, ...dynamic]
}

export const COMMAND_PALETTE_GROUP_ORDER: CommandPaletteGroup[] = [
  'Create',
  'Lists',
  'Search',
  'Go to',
]
