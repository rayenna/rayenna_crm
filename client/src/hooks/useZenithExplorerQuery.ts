import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { ZENITH_QUERY_STALE_MS } from '../constants/zenithQueryStale'
import type { ZenithExplorerProject } from '../types/zenithExplorer'
import { fetchZenithWithOfflineCache } from '../utils/zenithOfflineFetch'
import { zenithQueryCacheKey } from '../utils/zenithOfflineCache'

function appendDateFilters(
  params: URLSearchParams,
  selectedFYs: string[],
  selectedQuarters: string[],
  selectedMonths: string[],
) {
  selectedFYs.forEach((fy) => params.append('fy', fy))
  selectedQuarters.forEach((q) => params.append('quarter', q))
  selectedMonths.forEach((month) => params.append('month', month))
}

/** Chart drill-down / brand bars / briefing — not bundled into KPI dashboard payloads. */
export function useZenithExplorerQuery(
  selectedFYs: string[],
  selectedQuarters: string[],
  selectedMonths: string[],
  enabled = true,
) {
  const cacheKey = zenithQueryCacheKey([
    'dashboard',
    'zenith-explorer',
    selectedFYs,
    selectedQuarters,
    selectedMonths,
  ])

  return useQuery({
    queryKey: ['dashboard', 'zenith-explorer', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      return fetchZenithWithOfflineCache(cacheKey, async () => {
        const params = new URLSearchParams()
        appendDateFilters(params, selectedFYs, selectedQuarters, selectedMonths)
        const res = await axiosInstance.get(`/api/dashboard/zenith-explorer?${params.toString()}`)
        const rows = (res.data as { zenithExplorerProjects?: ZenithExplorerProject[] }).zenithExplorerProjects
        return { zenithExplorerProjects: Array.isArray(rows) ? rows : [] }
      })
    },
    enabled,
    staleTime: ZENITH_QUERY_STALE_MS,
    select: (data) => data.zenithExplorerProjects ?? [],
  })
}
