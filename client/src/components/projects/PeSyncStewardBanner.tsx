import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import type { Project, User } from '../../types'
import {
  canApplyPeCapacityToCrm,
  peCapacityToCrmPatchValue,
  type PeCapacityDriftFinding,
} from '../../utils/peSyncSteward'
import { ErrorModal } from '@/components/common/ErrorModal'

type Props = {
  project: Project
  findings: PeCapacityDriftFinding[]
  user: User | null | undefined
}

export default function PeSyncStewardBanner({ project, findings, user }: Props) {
  const queryClient = useQueryClient()
  const [confirmApply, setConfirmApply] = useState(false)
  const canApply = canApplyPeCapacityToCrm(project, user)
  const finding = findings[0]

  const applyMutation = useMutation({
    mutationFn: async (peKw: number) => {
      const systemCapacity = peCapacityToCrmPatchValue(peKw)
      await axiosInstance.put(`/api/projects/${project.id}`, { systemCapacity })
      return systemCapacity
    },
    onSuccess: (systemCapacity) => {
      toast.success(`CRM system capacity updated to ${systemCapacity} kW`)
      void queryClient.invalidateQueries({ queryKey: ['project', project.id] })
      void queryClient.invalidateQueries({ queryKey: ['proposal-engine-summary', project.id] })
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      setConfirmApply(false)
    },
    onError: (err: unknown) => {
      toast.error(getFriendlyApiErrorMessage(err) || 'Could not update system capacity')
    },
  })

  if (!finding) return null

  return (
    <>
      <div
        className="mb-4 rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-4 py-3 text-sm leading-relaxed shadow-sm text-[color:var(--text-primary)]"
        role="note"
      >
        <p className="font-extrabold text-[color:var(--text-primary)]">CRM ↔ Proposal Engine</p>
        <p className="mt-1 text-[color:var(--text-secondary)]">
          Costing sheet capacity is outside the CRM band (CRM size up to +1 kW for redundancy).
          ROI and Zenith use CRM capacity — update CRM only if the commercial size should change.
        </p>
        <ul className="mt-3 space-y-2">
          <li>
            <span className="font-semibold text-[color:var(--text-primary)]">{finding.label}</span>
            <span className="text-[color:var(--text-secondary)]"> — {finding.detail}</span>
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {canApply ? (
            <button
              type="button"
              onClick={() => setConfirmApply(true)}
              disabled={applyMutation.isPending}
              className="inline-flex min-h-[40px] touch-manipulation items-center justify-center rounded-xl bg-[color:var(--accent-teal)] px-3 py-2 text-sm font-semibold text-[color:var(--text-inverse)] transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              Apply PE value to CRM…
            </button>
          ) : (
            <p className="text-[12px] text-[color:var(--text-muted)]">
              Ask Sales/Ops/Admin (with edit rights) to apply the PE capacity to CRM.
            </p>
          )}
        </div>
      </div>

      <ErrorModal
        open={confirmApply}
        onClose={() => {
          if (!applyMutation.isPending) setConfirmApply(false)
        }}
        type="warning"
        surface="zenith"
        message={`Apply PE costing capacity to CRM?\n\nThis will set CRM system capacity to ${peCapacityToCrmPatchValue(finding.peValue)} kW (from PE costing). It does not change Proposal Engine artifacts. ROI and Zenith will then follow this CRM value.`}
        actions={[
          {
            label: 'Cancel',
            variant: 'ghost',
            onClick: () => setConfirmApply(false),
          },
          {
            label: applyMutation.isPending ? 'Updating…' : 'Confirm apply',
            variant: 'primary',
            onClick: () => {
              if (!applyMutation.isPending) {
                applyMutation.mutate(finding.peValue)
              }
            },
          },
        ]}
      />
    </>
  )
}
