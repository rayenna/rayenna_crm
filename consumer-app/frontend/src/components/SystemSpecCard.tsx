import { Cpu, Sun, Zap } from 'lucide-react'
import type { SystemSpec } from '@/types/maintain'

type SystemSpecCardProps = {
  spec: SystemSpec
  installedLabel?: string | null
  compact?: boolean
}

export default function SystemSpecCard({ spec, installedLabel, compact = false }: SystemSpecCardProps) {
  if (compact) {
    return (
      <p className="text-[11px] leading-relaxed text-[color:var(--text-secondary)]">
        {spec.equipmentSummary}
      </p>
    )
  }

  return (
    <section className="zenith-glass mb-4 overflow-hidden rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Your solar system</h2>
        <span className="rounded-full bg-[color:var(--accent-teal-muted)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--accent-teal)]">
          {spec.systemKw} kW
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]">
            <Sun className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Solar panels
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[color:var(--text-primary)]">
              {spec.panelLabel}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]">
            <Cpu className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Inverter
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[color:var(--text-primary)]">
              {spec.inverterLabel}
            </p>
          </div>
        </div>
      </div>

      {installedLabel ? (
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-[color:var(--text-muted)]">
          <Zap className="h-3 w-3 text-[color:var(--accent-gold)]" aria-hidden />
          Commissioned {installedLabel}
        </p>
      ) : null}
    </section>
  )
}
