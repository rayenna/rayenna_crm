import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link2, RefreshCw } from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import type { SolarHubUser } from '../../types/solarHub'

type SolisStatus = { configured: boolean; apiHost: string | null }
type SolisStation = { id: string; name: string; capacityKw: number | null }

export default function HubSolisPlantCard({
  user,
  canManage,
}: {
  user: SolarHubUser
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [manualId, setManualId] = useState(user.project.solisStationId ?? '')

  const statusQuery = useQuery({
    queryKey: ['solis-status'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/solis/status')
      return res.data as SolisStatus
    },
  })

  const stationsQuery = useQuery({
    queryKey: ['solis-stations'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/solis/stations')
      return res.data as { items: SolisStation[] }
    },
    enabled: Boolean(statusQuery.data?.configured),
  })

  const saveMutation = useMutation({
    mutationFn: (stationId: string | null) =>
      axiosInstance.patch(`/api/admin/solar-hub/users/${user.id}/solis-station`, { stationId }),
    onSuccess: () => {
      toast.success('Solis plant saved')
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-user', user.id] })
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-users'] })
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const syncMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/api/admin/solar-hub/users/${user.id}/solis-sync`),
    onSuccess: (res) => {
      const n = (res.data as { monthsWritten?: number }).monthsWritten ?? 0
      toast.success(n ? `Pulled ${n} month${n === 1 ? '' : 's'} from SolisCloud` : 'Solis sync finished (no kWh rows)')
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const configured = statusQuery.data?.configured === true
  const stations = stationsQuery.data?.items ?? []
  const linked = user.project.solisStationId

  return (
    <section className="mb-6 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-[color:var(--accent-gold)]" />
        <h2 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          SolisCloud plant
        </h2>
      </div>
      <p className="mt-2 text-xs text-[color:var(--text-muted)]">
        Link this Hub user to one Solis plant. Generation then updates from SolisCloud (not the KSEB bill).
        Manual kWh below still works as a fallback.
      </p>

      {!configured ? (
        <p className="mt-3 text-sm text-[color:var(--text-primary)]">
          Solis keys are not on the CRM API yet. Add <code>SOLIS_KEY_ID</code>,{' '}
          <code>SOLIS_KEY_SECRET</code>, and <code>SOLIS_API_BASE_URL</code> on Render, then redeploy the API.
        </p>
      ) : (
        <p className="mt-3 text-xs text-[color:var(--text-muted)]">API host: {statusQuery.data?.apiHost}</p>
      )}

      {canManage ? (
        <div className="mt-4 space-y-3">
          {stations.length > 0 ? (
            <label className="block text-xs font-semibold text-[color:var(--text-muted)]">
              Plant on this Solis account
              <select
                className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                value={linked ?? ''}
                onChange={(e) => saveMutation.mutate(e.target.value || null)}
              >
                <option value="">Not linked</option>
                {linked && !stations.some((s) => s.id === linked) ? (
                  <option value={linked}>Linked plant {linked}</option>
                ) : null}
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id}
                    {s.capacityKw ? ` · ${s.capacityKw} kW` : ''})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-xs font-semibold text-[color:var(--text-muted)]">
            Plant ID
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="From SolisCloud plant details"
              className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(manualId.trim() || null)}
              className="rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)] disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save plant ID'}
            </button>
            <button
              type="button"
              disabled={!linked || syncMutation.isPending || !configured}
              onClick={() => syncMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4 text-[color:var(--accent-teal)]" />
              {syncMutation.isPending ? 'Pulling…' : 'Pull kWh now'}
            </button>
          </div>
          {stationsQuery.isError ? (
            <p className="text-xs text-[color:var(--accent-red)]">{getFriendlyApiErrorMessage(stationsQuery.error)}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[color:var(--text-primary)]">{linked ? `Linked plant ${linked}` : 'Not linked'}</p>
      )}
    </section>
  )
}
