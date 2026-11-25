/**
 * Load help markdown on demand (Vite glob, not eager) so Help chunk stays lean until opened.
 */

type MdLoader = () => Promise<string>

const contentModules = import.meta.glob<string>('./content/*/index.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MdLoader>

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
  'solar-hub.md',
  'reports.md',
  'lost-deals.md',
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
  'ask-analytics.md',
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

const gettingStartedPartModules = import.meta.glob<string>('./content/getting-started/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MdLoader>

const rolesPartModules = import.meta.glob<string>('./content/roles/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MdLoader>

const modulesPartModules = import.meta.glob<string>('./content/modules/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MdLoader>

const dashboardPartModules = import.meta.glob<string>('./content/dashboard/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MdLoader>

const zenithPartModules = import.meta.glob<string>('./content/zenith/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MdLoader>

const securityPartModules = import.meta.glob<string>('./content/security/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MdLoader>

const faqPartModules = import.meta.glob<string>('./content/faq/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MdLoader>

const trainingPartModules = import.meta.glob<string>('./content/training/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MdLoader>

async function loadRaw(modules: Record<string, MdLoader>, key: string): Promise<string> {
  const loader = modules[key]
  if (!loader) return ''
  try {
    return (await loader()) ?? ''
  } catch {
    return ''
  }
}

async function joinHubAndParts(
  hubKey: string,
  partModules: Record<string, MdLoader>,
  partFiles: readonly string[],
  partDir: string,
): Promise<string> {
  const hub = await loadRaw(contentModules, hubKey)
  const parts = (
    await Promise.all(
      partFiles.map((file) => loadRaw(partModules, `./content/${partDir}/${file}`)),
    )
  ).filter((p) => p.trim().length > 0)
  if (parts.length === 0) return hub
  return [hub, ...parts].join('\n\n---\n\n')
}

export async function getHelpContent(sectionId: string): Promise<string> {
  if (sectionId === 'getting-started') {
    return joinHubAndParts(
      './content/getting-started/index.md',
      gettingStartedPartModules,
      GETTING_STARTED_PART_FILES,
      'getting-started',
    )
  }
  if (sectionId === 'roles') {
    return joinHubAndParts('./content/roles/index.md', rolesPartModules, ROLES_PART_FILES, 'roles')
  }
  if (sectionId === 'modules') {
    return joinHubAndParts('./content/modules/index.md', modulesPartModules, MODULES_PART_FILES, 'modules')
  }
  if (sectionId === 'dashboard') {
    return joinHubAndParts(
      './content/dashboard/index.md',
      dashboardPartModules,
      DASHBOARD_PART_FILES,
      'dashboard',
    )
  }
  if (sectionId === 'zenith') {
    return joinHubAndParts('./content/zenith/index.md', zenithPartModules, ZENITH_PART_FILES, 'zenith')
  }
  if (sectionId === 'security') {
    return joinHubAndParts(
      './content/security/index.md',
      securityPartModules,
      SECURITY_PART_FILES,
      'security',
    )
  }
  if (sectionId === 'faq') {
    return joinHubAndParts('./content/faq/index.md', faqPartModules, FAQ_PART_FILES, 'faq')
  }
  if (sectionId === 'training') {
    return joinHubAndParts(
      './content/training/index.md',
      trainingPartModules,
      TRAINING_PART_FILES,
      'training',
    )
  }
  return loadRaw(contentModules, `./content/${sectionId}/index.md`)
}
