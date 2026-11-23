import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import type { SolarHubUser } from '../../types/solarHub'
import HubSolisPlantCard from './HubSolisPlantCard'
import HubDeyePlantCard from './HubDeyePlantCard'
import HubSunwaysPlantCard from './HubSunwaysPlantCard'

export type InverterCloudProvider = 'solis' | 'deye' | 'sunways'

const PROVIDERS: { id: InverterCloudProvider; label: string }[] = [
  { id: 'solis', label: 'SolisCloud' },
  { id: 'deye', label: 'Deye Cloud' },
  { id: 'sunways', label: 'Sunways Portal' },
]

function linkedProvider(user: SolarHubUser): InverterCloudProvider | null {
  if (user.project.solisStationId) return 'solis'
  if (user.project.deyeStationId) return 'deye'
  if (user.project.sunwaysStationId) return 'sunways'
  return null
}

function defaultProvider(user: SolarHubUser): InverterCloudProvider {
  return linkedProvider(user) ?? 'solis'
}

export default function HubInverterCloudPlantHub({
  user,
  canManage,
}: {
  user: SolarHubUser
  canManage: boolean
}) {
  const active = linkedProvider(user)
  const [selected, setSelected] = useState<InverterCloudProvider>(() => defaultProvider(user))

  // Keep dropdown on the linked cloud after save/unlink when the active cloud changes.
  useEffect(() => {
    if (active) setSelected(active)
  }, [active])

  return (
    <section className="mb-6 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-[color:var(--accent-gold)]" aria-hidden />
        <h2 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Inverter Cloud Plant Hub
        </h2>
      </div>
      <p className="mt-2 text-xs text-[color:var(--text-muted)]">
        One cloud per project. Pick the inverter cloud, then choose the plant and Save — that also
        pulls kWh once. Hub refreshes about every 6 hours. Use Pull only for the latest numbers right
        now. Splits are typical, not the KSEB bill.
      </p>

      <label className="mt-4 block text-xs font-semibold text-[color:var(--text-muted)]">
        Inverter cloud
        <select
          className="mt-1 min-h-[44px] w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          value={selected}
          onChange={(e) => setSelected(e.target.value as InverterCloudProvider)}
        >
          {PROVIDERS.map((p) => {
            const isLinked = active === p.id
            const blocked = active != null && active !== p.id
            return (
              <option key={p.id} value={p.id}>
                {p.label}
                {isLinked ? ' · linked' : blocked ? ' · other cloud linked' : ''}
              </option>
            )
          })}
        </select>
      </label>

      <div className="mt-4 border-t border-[color:var(--border-default)] pt-4">
        {selected === 'solis' ? (
          <HubSolisPlantCard user={user} canManage={canManage} embedded />
        ) : null}
        {selected === 'deye' ? (
          <HubDeyePlantCard user={user} canManage={canManage} embedded />
        ) : null}
        {selected === 'sunways' ? (
          <HubSunwaysPlantCard user={user} canManage={canManage} embedded />
        ) : null}
      </div>
    </section>
  )
}
