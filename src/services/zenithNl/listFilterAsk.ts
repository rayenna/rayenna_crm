/**
 * Ask Zenith — list/show questions that mirror Customer Master & Projects list filters.
 * Dimension extraction fills filters; this only picks the list metric early.
 */
import { UserRole } from '@prisma/client';
import type { ZenithNlIntent } from './catalog';
import { metricAllowedForRole } from './catalog';

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * “List/show … projects” with Projects-list filter language → projects_list_slice.
 * Avoids mix/revenue/funnel analytics and single-project detail lookups.
 */
export function matchProjectsListFilterIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('projects_list_slice', role)) return null;
  const q = norm(question);
  if (/^(how|what|where|why|when|can\s+i)\b/.test(q)) return null;
  if (!/\b(list|show|all|find|which)\b/.test(q)) return null;
  // Plural “projects” only — “show project SL:…” stays project_detail_lookup.
  if (!/\bprojects\b/.test(q)) return null;
  if (
    /\b(vs|versus|mix|breakdown|share|funnel|how\s+many|revenue|profit|margin|workload|analys[ei]s|customer\s+details?|project\s+details?)\b/.test(
      q,
    )
  ) {
    return null;
  }
  // Pipeline-by-stage / lost summaries have dedicated metrics.
  if (/\bpipeline\s+by\s+stage\b/.test(q) || /\blost\s+deals?\s+by\s+reason\b/.test(q)) {
    return null;
  }
  // Ops detail slices (feasibility, PE BOM, hub IDs, wattage…) keep their own metric.
  if (
    /\b(feasibility|registration|mnre|payment\s+timeline|missing\s+documents?|pe\s+missing|hub\s+station|incentive\s+eligible|\d+\s*w\b|wattage)\b/.test(
      q,
    )
  ) {
    return null;
  }

  return {
    metric: 'projects_list_slice',
    viz: 'table',
    insightHints: 'filtered projects list',
  };
}
