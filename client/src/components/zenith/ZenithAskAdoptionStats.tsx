import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import axiosInstance from '../../utils/axios'

type AskStats = {
  days: number
  uniqueUsers: number
  uniqueByRole?: Record<string, number>
  rolePack?: Record<string, string>
  byEvent?: Record<string, number>
}

/** Admin / Management: unique Ask users this week — labels, not billing SKUs. */
export default function ZenithAskAdoptionStats() {
  const { user } = useAuth()
  const allowed = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGEMENT
  const q = useQuery({
    queryKey: ['zenith-ask-stats', 7],
    queryFn: async () => {
      const { data } = await axiosInstance.get<AskStats>('/api/dashboard/zenith-ask-stats', {
        params: { days: 7 },
      })
      return data
    },
    enabled: allowed,
    staleTime: 60_000,
  })
  if (!allowed || !q.data) return null
  const unique = q.data.uniqueUsers ?? 0
  const submitted = q.data.byEvent?.ask_submitted ?? 0
  const byRole = Object.entries(q.data.uniqueByRole ?? {})
    .filter(([, n]) => n > 0)
    .map(([role, n]) => `${q.data.rolePack?.[role] || role} ${n}`)
    .join(' · ')
  return (
    <p className="zenith-ask-adoption" aria-label="Ask adoption this week">
      Ask this week: {unique} {unique === 1 ? 'person' : 'people'}
      {submitted ? ` · ${submitted} asks` : ''}
      {byRole ? ` · ${byRole}` : ''}
    </p>
  )
}
