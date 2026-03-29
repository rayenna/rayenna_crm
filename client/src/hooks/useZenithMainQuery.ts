import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { UserRole } from '../types'

function zenithEndpoint(role: UserRole | undefined): 'sales' | 'management' | 'operations' | 'finance' | null {
  if (!role) return null
  if (role === UserRole.SALES) return 'sales'
  if (role === UserRole.OPERATIONS) return 'operations'
  if (role === UserRole.FINANCE) return 'finance'
  if (role === UserRole.MANAGEMENT || role === UserRole.ADMIN) return 'management'
  return null
}

export function useZenithMainQuery(
  role: UserRole | undefined,
  selectedFYs: string[],
  selectedQuarters: string[],
  selectedMonths: string[],
  initialDataWhenFiltersEmpty?: unknown,
) {
  const filtersEmpty =
    selectedFYs.length === 0 && selectedQuarters.length === 0 && selectedMonths.length === 0
  const skipFetch =
    filtersEmpty &&
    initialDataWhenFiltersEmpty != null &&
    (role === UserRole.SALES || role === UserRole.MANAGEMENT || role === UserRole.ADMIN)

  const endpoint = zenithEndpoint(role)

  return useQuery({
    queryKey: ['zenith', 'dashboard', endpoint, selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      if (!endpoint) throw new Error('No dashboard endpoint for role')
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((month) => params.append('month', month))
      const res = await axiosInstance.get(`/api/dashboard/${endpoint}?${params.toString()}`)
      return res.data
    },
    enabled: !!endpoint && !skipFetch,
    initialData: skipFetch ? (initialDataWhenFiltersEmpty as Record<string, unknown>) : undefined,
  })
}
