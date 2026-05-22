import { ZENITH_CHART_GROUP, type ZenithChartGroup } from '../constants/zenithChartGroups'
import type { ZenithChartDrilldownDimension } from '../types/zenithExplorer'

export type ZenithRoleChartScope = 'exec' | 'fin' | 'ops'

/** Map drill dimension → chart group for scoped Recharts remount on drawer close. */
export function chartResetGroupForDrill(
  dimension: ZenithChartDrilldownDimension,
  scope: ZenithRoleChartScope,
): ZenithChartGroup {
  if (dimension === 'customer_segment') {
    return scope === 'exec'
      ? ZENITH_CHART_GROUP.EXEC_DONUT
      : scope === 'fin'
        ? ZENITH_CHART_GROUP.FIN_DONUT
        : ZENITH_CHART_GROUP.OPS_DONUT
  }
  if (dimension === 'fy') {
    return scope === 'exec'
      ? ZENITH_CHART_GROUP.EXEC_FY
      : scope === 'fin'
        ? ZENITH_CHART_GROUP.FIN_EXPLORE
        : ZENITH_CHART_GROUP.OPS_EXPLORE
  }
  if (dimension === 'panel_brand' || dimension === 'inverter_brand') {
    return scope === 'exec' ? ZENITH_CHART_GROUP.EXEC_LIFECYCLE : ZENITH_CHART_GROUP.OPS_EXPLORE
  }
  return scope === 'exec'
    ? ZENITH_CHART_GROUP.EXEC_EXPLORE
    : scope === 'fin'
      ? ZENITH_CHART_GROUP.FIN_EXPLORE
      : ZENITH_CHART_GROUP.OPS_EXPLORE
}

export function funnelChartResetGroup(scope: ZenithRoleChartScope): ZenithChartGroup {
  return scope === 'exec'
    ? ZENITH_CHART_GROUP.EXEC_FUNNEL
    : scope === 'fin'
      ? ZENITH_CHART_GROUP.FIN_FUNNEL
      : ZENITH_CHART_GROUP.OPS_FUNNEL
}

export function exploreChartResetGroup(scope: ZenithRoleChartScope): ZenithChartGroup {
  return scope === 'exec'
    ? ZENITH_CHART_GROUP.EXEC_EXPLORE
    : scope === 'fin'
      ? ZENITH_CHART_GROUP.FIN_EXPLORE
      : ZENITH_CHART_GROUP.OPS_EXPLORE
}
