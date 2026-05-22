/** Chart groups for scoped Recharts remount after Zenith quick drawers close. */
export const ZENITH_CHART_GROUP = {
  EXEC_EXPLORE: 'exec-explore',
  EXEC_FUNNEL: 'exec-funnel',
  EXEC_DONUT: 'exec-donut',
  EXEC_FY: 'exec-fy',
  EXEC_LIFECYCLE: 'exec-lifecycle',
  EXEC_HITLIST: 'exec-hitlist',
  FIN_EXPLORE: 'fin-explore',
  FIN_FUNNEL: 'fin-funnel',
  FIN_DONUT: 'fin-donut',
  OPS_EXPLORE: 'ops-explore',
  OPS_FUNNEL: 'ops-funnel',
  OPS_DONUT: 'ops-donut',
  FOCUS: 'focus',
} as const

export type ZenithChartGroup = (typeof ZENITH_CHART_GROUP)[keyof typeof ZENITH_CHART_GROUP]
