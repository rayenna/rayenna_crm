/**
 * Load help markdown at build time (no runtime fetch) – works reliably in dev and prod.
 * Uses Vite's import.meta.glob with ?raw so markdown is bundled.
 */
const contentModules = import.meta.glob<string>('./content/*/index.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Extra pages merged after the Getting Started hub (order = sidebar scroll order). */
const GETTING_STARTED_PART_FILES = [
  'first-login.md',
  'navigation.md',
  'common-actions.md',
  'keyboard-shortcuts.md',
] as const

/** Modules hub + per-module guides (order = sidebar scroll order). */
const MODULES_PART_FILES = [
  'customer-master.md',
  'projects.md',
  'deal-health-score.md',
  'key-artifacts.md',
  'support-tickets.md',
  'tally-export.md',
] as const

/** Classic Dashboard hub + sub-pages (order = sidebar scroll order). */
const DASHBOARD_PART_FILES = [
  'filters-and-dates.md',
  'todays-plan-and-attention.md',
  'year-on-year-kpis.md',
  'quick-access.md',
  'layout-by-role.md',
  'charts-and-drilldown.md',
] as const

/** Zenith hub + sub-pages (order = sidebar scroll order). */
const ZENITH_PART_FILES = [
  'command-bar-and-filters.md',
  'ribbons-and-kpis.md',
  'pipeline-and-hit-list.md',
  'your-focus.md',
  'board-and-funnel.md',
  'explore-charts.md',
  'quick-actions-drawer.md',
  'mobile-pwa-and-limits.md',
  'my-day.md',
  'help-and-tips.md',
  'zenith-by-role.md',
  'playbook-sales.md',
  'playbook-finance.md',
  'playbook-operations.md',
  'playbook-management.md',
] as const

/** Roles hub + matrix + per-role guides (order = sidebar scroll order). */
const ROLES_PART_FILES = [
  'permission-matrix.md',
  'sales.md',
  'operations.md',
  'finance.md',
  'management.md',
  'admin.md',
] as const

/** Security hub + sub-pages (order = sidebar scroll order). */
const SECURITY_PART_FILES = [
  'privacy-and-account.md',
  'change-password.md',
  'audit-and-security.md',
  'users.md',
] as const

/** FAQ hub + category pages (order = sidebar scroll order). */
const FAQ_PART_FILES = [
  'general.md',
  'roles-and-access.md',
  'dashboard-and-zenith.md',
  'customers-and-projects.md',
  'admin-security.md',
  'troubleshooting.md',
  'proposal-engine.md',
] as const

/** Training hub + facilitator parts (order = sidebar scroll order). */
const TRAINING_PART_FILES = [
  'zenith-modules-part-1.md',
  'zenith-modules-part-2.md',
  'workshop.md',
  'reference.md',
] as const

const gettingStartedPartModules = import.meta.glob<string>(
  './content/getting-started/*.md',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
)

const rolesPartModules = import.meta.glob<string>('./content/roles/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const modulesPartModules = import.meta.glob<string>('./content/modules/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const dashboardPartModules = import.meta.glob<string>('./content/dashboard/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const zenithPartModules = import.meta.glob<string>('./content/zenith/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const securityPartModules = import.meta.glob<string>('./content/security/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const faqPartModules = import.meta.glob<string>('./content/faq/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const trainingPartModules = import.meta.glob<string>('./content/training/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function loadGettingStartedContent(): string {
  const hub = (contentModules as Record<string, string>)['./content/getting-started/index.md'] ?? ''
  const parts = GETTING_STARTED_PART_FILES.map((file) => {
    const key = `./content/getting-started/${file}`
    return gettingStartedPartModules[key] ?? ''
  }).filter((p) => p.trim().length > 0)
  if (parts.length === 0) return hub
  return [hub, ...parts].join('\n\n---\n\n')
}

function loadRolesPartContent(file: (typeof ROLES_PART_FILES)[number]): string {
  const key = `./content/roles/${file}`
  return rolesPartModules[key] ?? ''
}

function loadRolesContent(): string {
  const hub = (contentModules as Record<string, string>)['./content/roles/index.md'] ?? ''
  const parts = ROLES_PART_FILES.map(loadRolesPartContent).filter((p) => p.trim().length > 0)
  if (parts.length === 0) return hub
  return [hub, ...parts].join('\n\n---\n\n')
}

function loadModulesPartContent(file: (typeof MODULES_PART_FILES)[number]): string {
  const key = `./content/modules/${file}`
  return modulesPartModules[key] ?? ''
}

function loadModulesContent(): string {
  const hub = (contentModules as Record<string, string>)['./content/modules/index.md'] ?? ''
  const parts = MODULES_PART_FILES.map(loadModulesPartContent).filter((p) => p.trim().length > 0)
  if (parts.length === 0) return hub
  return [hub, ...parts].join('\n\n---\n\n')
}

function loadDashboardPartContent(file: (typeof DASHBOARD_PART_FILES)[number]): string {
  const key = `./content/dashboard/${file}`
  return dashboardPartModules[key] ?? ''
}

function loadDashboardContent(): string {
  const hub = (contentModules as Record<string, string>)['./content/dashboard/index.md'] ?? ''
  const parts = DASHBOARD_PART_FILES.map(loadDashboardPartContent).filter((p) => p.trim().length > 0)
  if (parts.length === 0) return hub
  return [hub, ...parts].join('\n\n---\n\n')
}

function loadZenithPartContent(file: (typeof ZENITH_PART_FILES)[number]): string {
  const key = `./content/zenith/${file}`
  return zenithPartModules[key] ?? ''
}

function loadZenithContent(): string {
  const hub = (contentModules as Record<string, string>)['./content/zenith/index.md'] ?? ''
  const parts = ZENITH_PART_FILES.map(loadZenithPartContent).filter((p) => p.trim().length > 0)
  if (parts.length === 0) return hub
  return [hub, ...parts].join('\n\n---\n\n')
}

function loadSecurityPartContent(file: (typeof SECURITY_PART_FILES)[number]): string {
  const key = `./content/security/${file}`
  return securityPartModules[key] ?? ''
}

function loadSecurityContent(): string {
  const hub = (contentModules as Record<string, string>)['./content/security/index.md'] ?? ''
  const parts = SECURITY_PART_FILES.map(loadSecurityPartContent).filter((p) => p.trim().length > 0)
  if (parts.length === 0) return hub
  return [hub, ...parts].join('\n\n---\n\n')
}

function loadFaqPartContent(file: (typeof FAQ_PART_FILES)[number]): string {
  const key = `./content/faq/${file}`
  return faqPartModules[key] ?? ''
}

function loadFaqContent(): string {
  const hub = (contentModules as Record<string, string>)['./content/faq/index.md'] ?? ''
  const parts = FAQ_PART_FILES.map(loadFaqPartContent).filter((p) => p.trim().length > 0)
  if (parts.length === 0) return hub
  return [hub, ...parts].join('\n\n---\n\n')
}

function loadTrainingPartContent(file: (typeof TRAINING_PART_FILES)[number]): string {
  const key = `./content/training/${file}`
  return trainingPartModules[key] ?? ''
}

function loadTrainingContent(): string {
  const hub = (contentModules as Record<string, string>)['./content/training/index.md'] ?? ''
  const parts = TRAINING_PART_FILES.map(loadTrainingPartContent).filter((p) => p.trim().length > 0)
  if (parts.length === 0) return hub
  return [hub, ...parts].join('\n\n---\n\n')
}

export function getHelpContent(sectionId: string): string {
  if (sectionId === 'getting-started') {
    return loadGettingStartedContent()
  }
  if (sectionId === 'roles') {
    return loadRolesContent()
  }
  if (sectionId === 'modules') {
    return loadModulesContent()
  }
  if (sectionId === 'dashboard') {
    return loadDashboardContent()
  }
  if (sectionId === 'zenith') {
    return loadZenithContent()
  }
  if (sectionId === 'security') {
    return loadSecurityContent()
  }
  if (sectionId === 'faq') {
    return loadFaqContent()
  }
  if (sectionId === 'training') {
    return loadTrainingContent()
  }
  const path = `./content/${sectionId}/index.md`
  const content = (contentModules as Record<string, string>)[path]
  return content ?? ''
}
