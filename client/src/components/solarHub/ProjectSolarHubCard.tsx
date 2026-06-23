import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { SolarHubProvisionResponse, SolarHubUser } from '../../types/solarHub'

type Props = {
  projectId: string
  projectStatus: string
}

export default function ProjectSolarHubCard({ projectId, projectStatus }: Props) {
  const { hasRole } = useAuth()
  const canManage = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['solar-hub-project', projectId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/solar-hub/projects/${projectId}/user`)
      return res.data as { user: SolarHubUser | null }
    },
  })

  const provisionMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/api/admin/solar-hub/projects/${projectId}/provision`),
    onSuccess: (res) => {
      const data = res.data as SolarHubProvisionResponse
      const action = data?.action
      const username = data?.username
      if (action === 'skipped') {
        toast.error('Could not provision — check project status')
      } else {
        toast.success(username ? `Solar Hub: ${action} (${username})` : `Solar Hub: ${action}`)
      }
      void refetch()
      queryClient.invalidateQueries({ queryKey: ['solar-hub-users'] })
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const user = data?.user
  const eligible =
    projectStatus === 'COMPLETED' || projectStatus === 'COMPLETED_SUBSIDY_CREDITED'

  return (
    <div className="rounded-2xl border border-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-gold)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Rayenna Solar Hub</h3>
          <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">Homeowner mobile app access</p>
        </div>
        {user ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              user.isActive
                ? 'bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
                : 'bg-[color:var(--bg-muted)] text-[color:var(--text-muted)]'
            }`}
          >
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">Loading…</p>
      ) : user ? (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            <span className="text-[color:var(--text-muted)]">Username: </span>
            <Link
              to={`/solar-hub/users/${user.id}`}
              className="font-semibold text-[color:var(--accent-teal)] hover:underline"
            >
              {user.username}
            </Link>
            {user.isDemo ? (
              <span className="ml-2 text-[10px] font-bold text-[color:var(--accent-gold)]">DEMO</span>
            ) : null}
          </p>
          <p className="text-xs text-[color:var(--text-muted)]">
            Last login:{' '}
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-IN') : 'Never'}
          </p>
          <Link
            to={`/solar-hub/users/${user.id}`}
            className="inline-block text-xs font-semibold text-[color:var(--accent-gold)]"
          >
            Manage in Solar Hub →
          </Link>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-[color:var(--text-secondary)]">No Solar Hub account for this project.</p>
          {eligible && canManage ? (
            <button
              type="button"
              onClick={() => provisionMutation.mutate()}
              disabled={provisionMutation.isPending}
              className="mt-3 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-xs font-bold text-[color:var(--text-inverse)] disabled:opacity-50"
            >
              {provisionMutation.isPending ? 'Provisioning…' : 'Create Hub account'}
            </button>
          ) : (
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              {eligible
                ? 'Only Admin or Operations can provision accounts.'
                : 'Accounts are auto-created when project reaches Completed or Subsidy Credited.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
