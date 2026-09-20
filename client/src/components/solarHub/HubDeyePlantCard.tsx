import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link2, RefreshCw } from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import type { SolarHubUser } from '../../types/solarHub'

type DeyeStatus = { configured: boolean; apiHost: string | null }
type DeyeStation = {
  id: string
  name: string
  capacityKw: number | null
  linkedSlNo?: number | null
  linkedUsername?: string | null
  linkedCustomerName?: string | null
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatIstStamp(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function kwhStatusLabel(opts: {
  linked: boolean
  busy: boolean
  lastError: string | null
  sync: SolarHubUser['energySync']
}): { text: string; tone: 'muted' | 'ok' | 'warn' | 'bad' } {
  if (opts.busy) return { text: 'Pulling kWh from Deye Cloud…', tone: 'muted' }
  if (opts.lastError) return { text: `kWh not synced — ${opts.lastError}`, tone: 'bad' }
  if (!opts.linked) return { text: 'kWh not synced — no plant linked', tone: 'muted' }
  const sync = opts.sync
  if (!sync || sync.liveMonthCount === 0) {
    return { text: 'Plant linked — kWh not synced yet', tone: 'warn' }
  }
  const monthLabel = `${MONTH_SHORT[(sync.currentMonth || 1) - 1]} ${sync.currentYear}`
  const when = formatIstStamp(sync.lastUpdatedAt)
  if (sync.currentMonthLive && sync.currentMonthKwh != null) {
    return {
      text: `kWh synced · ${sync.liveMonthCount} month${sync.liveMonthCount === 1 ? '' : 's'} · ${monthLabel} ${Math.round(sync.currentMonthKwh).toLocaleString('en-IN')} kWh${when ? ` · updated ${when}` : ''}`,
      tone: 'ok',
    }
  }
  return {
    text: `kWh synced · ${sync.liveMonthCount} month${sync.liveMonthCount === 1 ? '' : 's'} · ${monthLabel} not in Deye yet${when ? ` · last ${when}` : ''}`,
    tone: 'ok',
  }
}

export default function HubDeyePlantCard({
  user,
  canManage,
}: {
  user: SolarHubUser
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const linked = user.project.deyeStationId ?? ''
  const solisLinked = Boolean(user.project.solisStationId)
  const [selectedId, setSelectedId] = useState(linked)
  const [manualId, setManualId] = useState(linked)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedId(linked)
    setManualId(linked)
  }, [linked])

  const statusQuery = useQuery({
    queryKey: ['deye-status'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/deye/status')
      return res.data as DeyeStatus
    },
  })

  const stationsQuery = useQuery({
    queryKey: ['deye-stations'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/deye/stations')
      return res.data as { items: DeyeStation[] }
    },
    enabled: Boolean(statusQuery.data?.configured) && !solisLinked,
  })

  const saveMutation = useMutation({
    mutationFn: (stationId: string | null) =>
      axiosInstance.patch(`/api/admin/solar-hub/users/${user.id}/deye-station`, { stationId }),
    onSuccess: (res) => {
      const body = res.data as SolarHubUser & { monthsWritten?: number; ingestError?: string }
      const saved = body.project?.deyeStationId ?? null
      setSelectedId(saved ?? '')
      setManualId(saved ?? '')
      setLastError(body.ingestError ?? null)
      queryClient.setQueryData(['solar-hub-user', user.id], body)
      if (!saved) toast.success('Deye plant unlinked')
      else if (!body.ingestError) toast.success('Plant saved')
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-user', user.id] })
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-users'] })
    },
    onError: (err) => {
      setLastError(getFriendlyApiErrorMessage(err))
      toast.error(getFriendlyApiErrorMessage(err))
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => axiosInstance.post(`/api/admin/solar-hub/users/${user.id}/deye-sync`),
    onSuccess: (res) => {
      const body = res.data as { monthsWritten?: number; user?: SolarHubUser }
      setLastError(null)
      if (body.user) queryClient.setQueryData(['solar-hub-user', user.id], body.user)
      toast.success('kWh updated from Deye Cloud')
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-user', user.id] })
    },
    onError: (err) => {
      setLastError(getFriendlyApiErrorMessage(err))
      toast.error(getFriendlyApiErrorMessage(err))
    },
  })

  const configured = statusQuery.data?.configured === true
  const stations = stationsQuery.data?.items ?? []
  const pendingId = (manualId.trim() || selectedId.trim() || '') || null
  const savedOnServer = Boolean(linked)
  const busy = saveMutation.isPending || syncMutation.isPending
  const status = kwhStatusLabel({
    linked: savedOnServer,
    busy,
    lastError,
    sync: user.energySync,
  })
  const toneClass =
    status.tone === 'ok'
      ? 'border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
      : status.tone === 'bad'
        ? 'border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]'
        : status.tone === 'warn'
          ? 'border-[color:var(--border-default)] bg-[color:var(--bg-muted)] text-[color:var(--text-primary)]'
          : 'border-[color:var(--border-default)] bg-[color:var(--bg-muted)] text-[color:var(--text-muted)]'

  return (
    <section className="mb-6 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-[color:var(--accent-gold)]" />
        <h2 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Deye Cloud plant
        </h2>
      </div>
      <p className="mt-2 text-xs text-[color:var(--text-muted)]">
        One cloud per project. Pick a Deye plant, then Save — that also pulls kWh once. Hub refreshes
        about every 6 hours. Splits are typical, not the KSEB bill.
      </p>

      {solisLinked ? (
        <p className="mt-3 text-sm text-[color:var(--text-primary)]">
          This project is linked to SolisCloud. Unlink Solis first if this inverter is on Deye Cloud.
        </p>
      ) : !configured ? (
        <p className="mt-3 text-sm text-[color:var(--text-primary)]">
          Deye keys are not on the CRM API yet. Add <code>DEYE_APP_ID</code>, <code>DEYE_APP_SECRET</code>,{' '}
          <code>DEYE_LOGIN</code>, and <code>DEYE_PASSWORD</code> on Render, then redeploy the API.
        </p>
      ) : (
        <p className="mt-3 text-xs text-[color:var(--text-muted)]">
          API host: {statusQuery.data?.apiHost}
          {linked ? (
            <>
              {' '}
              · Linked ID <span className="font-mono text-[color:var(--text-primary)]">{linked}</span>
            </>
          ) : (
            ' · Not linked yet'
          )}
        </p>
      )}

      {canManage && !solisLinked ? (
        <div className="mt-4 space-y-3">
          {stations.length > 0 ? (
            <label className="block text-xs font-semibold text-[color:var(--text-muted)]">
              Plant on this Deye account
              <select
                className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                value={selectedId}
                onChange={(e) => {
                  const v = e.target.value
                  setSelectedId(v)
                  setManualId(v)
                }}
              >
                <option value="">Not linked</option>
                {selectedId && !stations.some((s) => s.id === selectedId) ? (
                  <option value={selectedId}>Linked plant {selectedId}</option>
                ) : null}
                {stations.map((s) => {
                  const takenByOther = Boolean(s.linkedSlNo) && s.id !== linked
                  const takenLabel = takenByOther
                    ? ` · already #${s.linkedSlNo}${
                        s.linkedUsername
                          ? ` @${s.linkedUsername}`
                          : s.linkedCustomerName
                            ? ` ${s.linkedCustomerName}`
                            : ''
                      }`
                    : ''
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id}
                      {s.capacityKw ? ` · ${s.capacityKw} kW` : ''}
                      {takenLabel})
                    </option>
                  )
                })}
              </select>
            </label>
          ) : null}

          <label className="block text-xs font-semibold text-[color:var(--text-muted)]">
            Plant ID
            <input
              value={manualId}
              onChange={(e) => {
                setManualId(e.target.value)
                setSelectedId(e.target.value.trim())
              }}
              placeholder="Filled from the list above, or paste from Deye Cloud"
              className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 font-mono text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => saveMutation.mutate(pendingId)}
              className="rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)] disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving…' : pendingId ? 'Save plant' : 'Unlink plant'}
            </button>
            <button
              type="button"
              disabled={!savedOnServer || busy || !configured}
              onClick={() => syncMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4 text-[color:var(--accent-teal)]" />
              {syncMutation.isPending ? 'Pulling…' : 'Pull latest kWh'}
            </button>
            <p className={`rounded-xl border px-3 py-2 text-xs font-semibold sm:max-w-xl ${toneClass}`}>
              {status.text}
            </p>
          </div>
          {stationsQuery.isError ? (
            <p className="text-xs text-[color:var(--accent-red)]">{getFriendlyApiErrorMessage(stationsQuery.error)}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-[color:var(--text-primary)]">{linked ? `Linked plant ${linked}` : 'Not linked'}</p>
          {!solisLinked ? (
            <p className={`inline-block rounded-xl border px-3 py-2 text-xs font-semibold ${toneClass}`}>{status.text}</p>
          ) : null}
        </div>
      )}
    </section>
  )
}
