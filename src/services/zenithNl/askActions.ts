import { UserRole } from '@prisma/client';

/** Navigation / create / list actions from the Ask box (not analytics metrics). */
export const ZENITH_ASK_ACTIONS = [
  'new_customer',
  'new_project',
  'create_support_ticket',
  'new_user',
  'open_my_day',
  'open_my_day_journal',
  'customer_search',
  'project_search',
  'open_customers',
  'open_projects',
  'overdue_support_tickets',
  'open_support_tickets_queue',
  'solar_hub_tickets',
  'proposal_projects',
  'confirmed_projects',
  'under_installation',
  'pending_subsidy',
  'availing_loan',
  'data_sense_review',
  'pe_not_started',
  'pe_draft',
  'pe_ready',
  'go_zenith',
  'go_support_tickets',
  'go_dashboard',
  'go_solar_hub',
  'go_solar_hub_provisioning',
  'go_solar_hub_unlinked',
  'go_solar_hub_maintenance',
  'go_lost_deals',
  'go_tally_export',
  'go_users',
  'go_audit',
  'go_change_password',
  'go_help',
  'show_tip',
  /** Navigate to project edit / detail for write workflows (resolved in askEditActions). */
  'edit_project_payment',
  'edit_project_status',
  'assign_project_ops',
  'add_project_remark',
  'edit_customer',
  'open_proposal',
] as const;

export type ZenithAskActionId = (typeof ZENITH_ASK_ACTIONS)[number];

export type ZenithAskActionMatch = {
  action: ZenithAskActionId;
  label: string;
  href: string;
  message: string;
  /** Client should navigate immediately after Ask returns. */
  autoNavigate: boolean;
};

const ALL_STAFF: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
];
const NEW_CUSTOMER_ROLES: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
];
/** Align with Layout Ctrl/Cmd+Shift+E. */
const NEW_PROJECT_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SALES];
const SUPPORT_TICKET_ROLES: UserRole[] = [
  UserRole.SALES,
  UserRole.OPERATIONS,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
];
const SOLAR_HUB_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.MANAGEMENT,
];
const EXEC: UserRole[] = [UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN];
const DASHBOARD: UserRole[] = ALL_STAFF;

const ACTION_ROLES: Record<ZenithAskActionId, UserRole[]> = {
  new_customer: NEW_CUSTOMER_ROLES,
  new_project: NEW_PROJECT_ROLES,
  create_support_ticket: SUPPORT_TICKET_ROLES,
  new_user: [UserRole.ADMIN],
  open_my_day: ALL_STAFF,
  open_my_day_journal: ALL_STAFF,
  customer_search: ALL_STAFF,
  project_search: ALL_STAFF,
  open_customers: ALL_STAFF,
  open_projects: ALL_STAFF,
  overdue_support_tickets: SUPPORT_TICKET_ROLES,
  open_support_tickets_queue: SUPPORT_TICKET_ROLES,
  solar_hub_tickets: SUPPORT_TICKET_ROLES,
  proposal_projects: ALL_STAFF,
  confirmed_projects: ALL_STAFF,
  under_installation: ALL_STAFF,
  pending_subsidy: ALL_STAFF,
  availing_loan: ALL_STAFF,
  data_sense_review: EXEC,
  pe_not_started: EXEC,
  pe_draft: EXEC,
  pe_ready: EXEC,
  go_zenith: DASHBOARD,
  go_support_tickets: SUPPORT_TICKET_ROLES,
  go_dashboard: DASHBOARD,
  go_solar_hub: SOLAR_HUB_ROLES,
  go_solar_hub_provisioning: SOLAR_HUB_ROLES,
  go_solar_hub_unlinked: SOLAR_HUB_ROLES,
  go_solar_hub_maintenance: SOLAR_HUB_ROLES,
  go_lost_deals: [UserRole.ADMIN, UserRole.MANAGEMENT],
  go_tally_export: [UserRole.ADMIN, UserRole.FINANCE],
  go_users: [UserRole.ADMIN],
  go_audit: [UserRole.ADMIN],
  go_change_password: ALL_STAFF,
  go_help: ALL_STAFF,
  show_tip: ALL_STAFF,
  edit_project_payment: [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.FINANCE, UserRole.SALES],
  edit_project_status: [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.OPERATIONS, UserRole.SALES],
  assign_project_ops: [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.OPERATIONS],
  add_project_remark: [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.OPERATIONS, UserRole.SALES],
  edit_customer: [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES],
  open_proposal: EXEC,
};

export function actionAllowedForRole(action: ZenithAskActionId, role: UserRole): boolean {
  return ACTION_ROLES[action].includes(role);
}

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Payment not complete — PENDING + PARTIAL (not FULLY_PAID). */
export function wantsNotFullyPaidPayment(key: string): boolean {
  const q = key.trim().toLowerCase().replace(/\s+/g, ' ');
  return (
    /\b(not\s+(yet\s+)?(fully\s+)?paid|not\s+received\s+full\s+payment|haven'?t\s+received\s+full\s+payment|full\s+payment\s+not\s+received|incomplete\s+payment)\b/.test(
      q,
    ) ||
    /\b(payment\s+(is\s+)?pending|pending\s+payment|partial(ly)?\s+(paid|payment)|payment\s+partial)\b/.test(
      q,
    ) ||
    /\b(outstanding(\s+balance|\s+payment)?|balance\s+(due|pending|outstanding)|unpaid)\b/.test(q)
  );
}

function customersSearchHref(query?: string): string {
  const q = query?.trim();
  if (!q) return '/customers';
  return `/customers?q=${encodeURIComponent(q)}`;
}

function projectsSearchHref(query?: string): string {
  const q = query?.trim();
  if (!q) return '/projects';
  return `/projects?search=${encodeURIComponent(q)}`;
}

function build(
  action: ZenithAskActionId,
  href: string,
  label: string,
  message: string,
  autoNavigate = true,
): ZenithAskActionMatch {
  return { action, label, href, message, autoNavigate };
}

type ExactBuilder = (role: UserRole) => ZenithAskActionMatch | null;

function exact(
  action: ZenithAskActionId,
  href: string,
  label: string,
  message: string,
): ExactBuilder {
  return (role) =>
    actionAllowedForRole(action, role) ? build(action, href, label, message) : null;
}

const EXACT: Record<string, ExactBuilder> = {
  [norm('New Customer')]: exact(
    'new_customer',
    '/customers?new=1',
    'New Customer',
    'Opening the new customer form…',
  ),
  [norm('New Project')]: exact(
    'new_project',
    '/projects/new',
    'New Project',
    'Opening the new project form…',
  ),
  [norm('Create a Support Ticket')]: exact(
    'create_support_ticket',
    '/support-tickets?new=1',
    'Create Support Ticket',
    'Opening the create support ticket form…',
  ),
  [norm('New User')]: exact('new_user', '/users?new=1', 'New User', 'Opening the new user form…'),
  [norm('Open My Day')]: exact(
    'open_my_day',
    '/zenith?myday=1',
    'Open My Day',
    'Opening My Day…',
  ),
  [norm('My Day')]: exact('open_my_day', '/zenith?myday=1', 'Open My Day', 'Opening My Day…'),
  [norm('Open My Day Journal')]: exact(
    'open_my_day_journal',
    '/zenith?myday=journal',
    'My Day Journal',
    'Opening My Day Journal…',
  ),
  [norm('Customer Search')]: exact(
    'customer_search',
    '/customers',
    'Customer Search',
    'Opening Customers — use the search box to find someone.',
  ),
  [norm('Project Search')]: exact(
    'project_search',
    '/projects',
    'Project Search',
    'Opening Projects — use the search box to find a project.',
  ),
  [norm('Open Existing Customer')]: exact(
    'open_customers',
    '/customers',
    'Open Customer',
    'Opening Customers — search or pick a customer to open.',
  ),
  [norm('Open Existing Project')]: exact(
    'open_projects',
    '/projects',
    'Open Project',
    'Opening Projects — search or pick a project to open.',
  ),
  // Prefer navigate labels without “show/how many” so analytics chips stay metrics.
  [norm('Overdue Support Tickets')]: exact(
    'overdue_support_tickets',
    '/support-tickets?filter=overdue',
    'Overdue Support Tickets',
    'Opening overdue support tickets…',
  ),
  [norm('Open Pending Subsidy Projects')]: exact(
    'pending_subsidy',
    '/projects?pendingSubsidy=true',
    'Pending Subsidy',
    'Opening projects pending subsidy…',
  ),
  [norm('Go to Pending Subsidy')]: exact(
    'pending_subsidy',
    '/projects?pendingSubsidy=true',
    'Pending Subsidy',
    'Opening projects pending subsidy…',
  ),
  [norm('Availing Loan Projects')]: exact(
    'availing_loan',
    '/projects?availingLoan=true',
    'Availing Loan',
    'Opening availing-loan projects…',
  ),
  [norm('Proposal-stage Projects')]: exact(
    'proposal_projects',
    '/projects?status=PROPOSAL',
    'Proposal Projects',
    'Opening proposal-stage projects…',
  ),
  [norm('Under Installation Projects')]: exact(
    'under_installation',
    '/projects?status=UNDER_INSTALLATION',
    'Under Installation',
    'Opening under-installation projects…',
  ),
  [norm('Projects Needing Review')]: exact(
    'data_sense_review',
    '/projects?dataSenseNeedsReview=true',
    'Needs Review',
    'Opening projects needing review…',
  ),
  [norm('Go to Zenith')]: exact('go_zenith', '/zenith', 'Zenith', 'Opening Zenith…'),
  [norm('Go to Tally Export')]: exact(
    'go_tally_export',
    '/tally-export',
    'Tally Export',
    'Opening Tally Export…',
  ),
  [norm('Go to Users')]: exact('go_users', '/users', 'Users', 'Opening Users…'),
  [norm('Go to Audit & Security')]: exact(
    'go_audit',
    '/audit-security',
    'Audit & Security',
    'Opening Audit & Security…',
  ),
  [norm('Change Password')]: exact(
    'go_change_password',
    '/change-password',
    'Change Password',
    'Opening Change Password…',
  ),
  [norm('Solar Hub Provisioning')]: exact(
    'go_solar_hub_provisioning',
    '/solar-hub/provisioning',
    'Solar Hub Provisioning',
    'Opening Solar Hub provisioning…',
  ),
  [norm('Show Tip of the Day')]: exact(
    'show_tip',
    '/zenith?showTip=1',
    'Tip of the Day',
    'Opening Tip of the Day…',
  ),
};

/**
 * Deterministic Ask-box navigation / create intents (skip Claude + analytics).
 * Keep phrases specific so analytics questions are not stolen.
 */
export function matchAskActionIntent(
  question: string,
  role: UserRole,
): ZenithAskActionMatch | null {
  const key = norm(question);
  if (!key) return null;

  const exactHit = EXACT[key];
  if (exactHit) return exactHit(role);

  // Create / new
  if (
    /^(new|create|add)\s+(a\s+)?(new\s+)?customer\b/.test(key) ||
    /^add\s+new\s+customer\b/.test(key)
  ) {
    if (!actionAllowedForRole('new_customer', role)) return null;
    return build(
      'new_customer',
      '/customers?new=1',
      'New Customer',
      'Opening the new customer form…',
    );
  }
  if (
    /^(new|create|add)\s+(a\s+)?(new\s+)?project\b/.test(key) ||
    /^add\s+new\s+project\b/.test(key)
  ) {
    if (!actionAllowedForRole('new_project', role)) return null;
    return build('new_project', '/projects/new', 'New Project', 'Opening the new project form…');
  }
  if (
    /^(create|raise|add)\s+(a\s+)?(new\s+)?support\s+ticket\b/.test(key) ||
    /^new\s+support\s+ticket\b/.test(key)
  ) {
    if (/\b(?:sl\s*\d+|\d{1,6}\b)/.test(key) && /\b(for|on)\b/.test(key)) {
      // Prefill is resolved in matchAskEditActionIntent.
    } else {
      if (!actionAllowedForRole('create_support_ticket', role)) return null;
      return build(
        'create_support_ticket',
        '/support-tickets?new=1',
        'Create Support Ticket',
        'Opening the create support ticket form…',
      );
    }
  }
  if (/^(new|create|add)\s+(a\s+)?(new\s+)?user\b/.test(key)) {
    if (!actionAllowedForRole('new_user', role)) return null;
    return build('new_user', '/users?new=1', 'New User', 'Opening the new user form…');
  }

  // My Day
  if (/^(open\s+)?my\s+day(\s+journal)?$/.test(key) || /^open\s+journal\b/.test(key)) {
    if (/\bjournal\b/.test(key)) {
      if (!actionAllowedForRole('open_my_day_journal', role)) return null;
      return build(
        'open_my_day_journal',
        '/zenith?myday=journal',
        'My Day Journal',
        'Opening My Day Journal…',
      );
    }
    if (!actionAllowedForRole('open_my_day', role)) return null;
    return build('open_my_day', '/zenith?myday=1', 'Open My Day', 'Opening My Day…');
  }

  // Named search / open
  const customerNamed = question.trim().match(
    /^(?:search|find|open)\s+(?:for\s+)?(?:existing\s+)?customer\s+(.+)$/i,
  );
  if (customerNamed?.[1] && actionAllowedForRole('customer_search', role)) {
    const q = customerNamed[1].replace(/[.?!]+$/, '').trim();
    return build(
      'customer_search',
      customersSearchHref(q),
      'Customer Search',
      q ? `Opening Customers search for “${q}”…` : 'Opening Customers…',
    );
  }
  const projectNamed = question.trim().match(
    /^(?:search|find|open)\s+(?:for\s+)?(?:existing\s+)?project\s+(.+)$/i,
  );
  if (projectNamed?.[1] && actionAllowedForRole('project_search', role)) {
    const q = projectNamed[1].replace(/[.?!]+$/, '').trim();
    return build(
      'project_search',
      projectsSearchHref(q),
      'Project Search',
      q ? `Opening Projects search for “${q}”…` : 'Opening Projects…',
    );
  }

  // Bare search / open existing
  if (
    /^(customer\s+search|search\s+customers?|find\s+customers?|open\s+(existing\s+)?customers?)$/.test(
      key,
    )
  ) {
    if (!actionAllowedForRole('customer_search', role)) return null;
    return build(
      'customer_search',
      '/customers',
      'Customer Search',
      'Opening Customers — use the search box to find someone.',
    );
  }
  if (
    /^(project\s+search|search\s+projects?|find\s+projects?|open\s+(existing\s+)?projects?)$/.test(
      key,
    )
  ) {
    if (!actionAllowedForRole('project_search', role)) return null;
    return build(
      'project_search',
      '/projects',
      'Project Search',
      'Opening Projects — use the search box to find a project.',
    );
  }

  // Ticket queues (navigate) — leave “show/how many/total/raised” to analytics metrics
  const looksLikeAnalytics =
    /\b(show|list|how many|total|raised|count|summary|breakdown|sold|revenue|which|who)\b/.test(
      key,
    );
  if (
    !looksLikeAnalytics &&
    /\boverdue\b/.test(key) &&
    /\b(support\s+)?tickets?\b/.test(key)
  ) {
    if (!actionAllowedForRole('overdue_support_tickets', role)) return null;
    return build(
      'overdue_support_tickets',
      '/support-tickets?filter=overdue',
      'Overdue Support Tickets',
      'Opening overdue support tickets…',
    );
  }
  if (
    !looksLikeAnalytics &&
    /\b(solar\s*hub|consumer)\b/.test(key) &&
    /\btickets?\b/.test(key)
  ) {
    if (!actionAllowedForRole('solar_hub_tickets', role)) return null;
    return build(
      'solar_hub_tickets',
      '/support-tickets?filter=hub',
      'Solar Hub Tickets',
      'Opening Solar Hub support tickets…',
    );
  }

  // Project list filters (navigate) — avoid stealing analytics chips
  if (
    !looksLikeAnalytics &&
    /^(open|go to|view)\s+.*\bpending\s+subsidy\b/.test(key)
  ) {
    if (!actionAllowedForRole('pending_subsidy', role)) return null;
    return build(
      'pending_subsidy',
      '/projects?pendingSubsidy=true',
      'Pending Subsidy',
      'Opening projects pending subsidy…',
    );
  }
  if (
    !looksLikeAnalytics &&
    (/\bavailing\s+loan\s+projects?\b/.test(key) ||
      /^(open|go to|view)\s+.*\bavailing\s+loan\b/.test(key))
  ) {
    if (!actionAllowedForRole('availing_loan', role)) return null;
    return build(
      'availing_loan',
      '/projects?availingLoan=true',
      'Availing Loan',
      'Opening availing-loan projects…',
    );
  }
  if (/\bproposal[- ]?stage\b/.test(key) || /^proposal\s+projects?\b/.test(key)) {
    if (!actionAllowedForRole('proposal_projects', role)) return null;
    return build(
      'proposal_projects',
      '/projects?status=PROPOSAL',
      'Proposal Projects',
      'Opening proposal-stage projects…',
    );
  }
  if (/\bunder[\s-]+installation\b/.test(key)) {
    // "Under installation + payment pending / not fully paid" → analytics list (not bare stage nav).
    if (wantsNotFullyPaidPayment(key)) return null;
    if (!actionAllowedForRole('under_installation', role)) return null;
    return build(
      'under_installation',
      '/projects?status=UNDER_INSTALLATION',
      'Under Installation',
      'Opening under-installation projects…',
    );
  }
  if (/\bconfirmed\s+projects?\b/.test(key)) {
    // “Confirmed projects with no documents” → analytics detail list, not stage nav.
    if (/\b(no|missing|without)\s+documents?\b/.test(key) || /\bdocuments?\b/.test(key) && /\b(no|missing|without)\b/.test(key)) {
      return null;
    }
    if (!actionAllowedForRole('confirmed_projects', role)) return null;
    return build(
      'confirmed_projects',
      '/projects?status=CONFIRMED',
      'Confirmed Projects',
      'Opening confirmed projects…',
    );
  }
  if (/\b(needs?\s+review|data\s*sense)\b/.test(key)) {
    if (!actionAllowedForRole('data_sense_review', role)) return null;
    return build(
      'data_sense_review',
      '/projects?dataSenseNeedsReview=true',
      'Needs Review',
      'Opening projects needing review…',
    );
  }
  if (/\bproposal\s+engine\b/.test(key) && /\bnot\s+started\b/.test(key)) {
    if (!actionAllowedForRole('pe_not_started', role)) return null;
    return build(
      'pe_not_started',
      '/projects?peBucket=not-started',
      'PE Not Started',
      'Opening Proposal Engine — not started…',
    );
  }
  if (/\bproposal\s+engine\b/.test(key) && /\bdrafts?\b/.test(key)) {
    if (!actionAllowedForRole('pe_draft', role)) return null;
    return build(
      'pe_draft',
      '/projects?peBucket=draft',
      'PE Drafts',
      'Opening Proposal Engine drafts…',
    );
  }
  if (/\bproposal\s+engine\b/.test(key) && /\b(ready|proposal[- ]ready)\b/.test(key)) {
    if (!actionAllowedForRole('pe_ready', role)) return null;
    return build(
      'pe_ready',
      '/projects?peBucket=proposal-ready',
      'PE Proposal Ready',
      'Opening Proposal Engine — proposal ready…',
    );
  }

  // Go to modules
  if (/^(go\s+to\s+)?zenith\b/.test(key) && !/\bask\b/.test(key)) {
    if (!actionAllowedForRole('go_zenith', role)) return null;
    return build('go_zenith', '/zenith', 'Zenith', 'Opening Zenith…');
  }
  if (/^(go\s+to\s+)?tally(\s+export)?\b/.test(key)) {
    if (!actionAllowedForRole('go_tally_export', role)) return null;
    return build('go_tally_export', '/tally-export', 'Tally Export', 'Opening Tally Export…');
  }
  if (/^(go\s+to\s+)?users?\b/.test(key) && !/\bnew\b/.test(key)) {
    if (!actionAllowedForRole('go_users', role)) return null;
    return build('go_users', '/users', 'Users', 'Opening Users…');
  }
  if (/\baudit\b/.test(key) || /\bsecurity\b/.test(key)) {
    if (!actionAllowedForRole('go_audit', role)) return null;
    return build('go_audit', '/audit-security', 'Audit & Security', 'Opening Audit & Security…');
  }
  if (/\bchange\s+password\b/.test(key)) {
    if (!actionAllowedForRole('go_change_password', role)) return null;
    return build(
      'go_change_password',
      '/change-password',
      'Change Password',
      'Opening Change Password…',
    );
  }
  if (
    /\blost\s+deals?\b/.test(key) &&
    !/\b(summarise|summarize|reason|by reason|details?)\b/.test(key)
  ) {
    if (!actionAllowedForRole('go_lost_deals', role)) return null;
    return build('go_lost_deals', '/lost-deals', 'Lost Deals', 'Opening Lost Deals…');
  }
  if (/solar\s*hub\s+provision/.test(key) || /\bprovisioning\b/.test(key)) {
    if (!actionAllowedForRole('go_solar_hub_provisioning', role)) return null;
    return build(
      'go_solar_hub_provisioning',
      '/solar-hub/provisioning',
      'Solar Hub Provisioning',
      'Opening Solar Hub provisioning…',
    );
  }
  if (/unlinked\s+plants?/.test(key)) {
    if (!actionAllowedForRole('go_solar_hub_unlinked', role)) return null;
    return build(
      'go_solar_hub_unlinked',
      '/solar-hub/users?plantLink=none',
      'Unlinked Plants',
      'Opening Solar Hub unlinked plants…',
    );
  }
  if (/solar\s*hub\s+maintenance/.test(key)) {
    if (!actionAllowedForRole('go_solar_hub_maintenance', role)) return null;
    return build(
      'go_solar_hub_maintenance',
      '/solar-hub/maintenance',
      'Solar Hub Maintenance',
      'Opening Solar Hub maintenance…',
    );
  }
  if (/^(go\s+to\s+)?solar\s*hub\b/.test(key)) {
    if (!actionAllowedForRole('go_solar_hub', role)) return null;
    return build('go_solar_hub', '/solar-hub', 'Solar Hub', 'Opening Solar Hub…');
  }
  if (/^(go\s+to\s+)?(old\s+)?dashboard\b/.test(key)) {
    if (!actionAllowedForRole('go_dashboard', role)) return null;
    return build('go_dashboard', '/dashboard', 'Dashboard', 'Opening Dashboard…');
  }
  if (/^(open\s+)?help\b/.test(key) || /^go\s+to\s+help\b/.test(key)) {
    if (!actionAllowedForRole('go_help', role)) return null;
    return build('go_help', '/help', 'Help', 'Opening Help…');
  }
  if (/\btip\s+of\s+the\s+day\b/.test(key) || /^show\s+tip\b/.test(key)) {
    if (!actionAllowedForRole('show_tip', role)) return null;
    return build('show_tip', '/zenith?showTip=1', 'Tip of the Day', 'Opening Tip of the Day…');
  }

  return null;
}

/** Example action chips shown alongside analytics examples (role-filtered). */
export const ACTION_EXAMPLE_CHIPS_BY_ROLE: Partial<Record<UserRole, string[]>> = {
  [UserRole.SALES]: ['New Customer', 'Open My Day', 'Create a Support Ticket'],
  [UserRole.MANAGEMENT]: ['Open My Day', 'Overdue Support Tickets', 'Open Pending Subsidy Projects'],
  [UserRole.ADMIN]: ['New User', 'Open My Day', 'Go to Audit & Security'],
  [UserRole.OPERATIONS]: ['Under Installation Projects', 'Create a Support Ticket', 'Solar Hub Provisioning'],
  [UserRole.FINANCE]: ['Go to Tally Export', 'Availing Loan Projects', 'Customer Search'],
};

/** Extra task chips for edit/write navigation (shown in More questions / help). */
export const EDIT_ACTION_EXAMPLE_CHIPS = [
  'Update payment for SL 1',
  'Change status of SL 1',
  'Assign ops to SL 1',
  'Add remark to SL 1',
];
