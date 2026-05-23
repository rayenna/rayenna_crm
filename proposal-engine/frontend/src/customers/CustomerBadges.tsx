import {
  STATUS_COLORS,
  STATUS_LABELS,
  hasSavedRoofLayout,
  normalizeProposalStatus,
} from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';
import { hasValidMapCoordinates } from './customerHelpers';
import type { PeProjectArtifacts } from './types';

/** Customer Master has Google Map lat/lng — ready for AI Roof Layout satellite pin. */
export function MapCoordinatesBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/90 flex-shrink-0 ${className}`}
      title="Google Map coordinates saved in Rayenna Customer Master"
    >
      <span className="text-[11px] leading-none" aria-hidden>
        📌
      </span>
      <span>Map GPS</span>
    </span>
  );
}

export function MapCoordinatesBadgeFromRecord({ record }: { record: CustomerRecord }) {
  if (!hasValidMapCoordinates(record.master.latitude, record.master.longitude)) return null;
  return <MapCoordinatesBadge />;
}

/** Saved AI/manual roof layout on this project (server or proposal embed). */
export function RoofLayoutSavedBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-900 border border-orange-200/90 flex-shrink-0 ${className}`}
      title="AI Roof Layout saved for this project"
    >
      <span className="text-[11px] leading-none" aria-hidden>
        📐
      </span>
      <span>Roof layout</span>
    </span>
  );
}

/** Pill badge showing proposal document readiness (not-started / draft / proposal-ready / confirmed). */
export function ProposalReadinessBadge({ record }: { record: CustomerRecord }) {
  return <ProposalReadinessBadgeFromPeStatus peStatus={record.status} />;
}

/** PE status from CRM API list/detail (`peStatus` or derived `record.status`). */
export function ProposalReadinessBadgeFromPeStatus({
  peStatus,
}: {
  peStatus?: string | null;
}) {
  const st = normalizeProposalStatus(peStatus);
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[st]}`}
      title="Not Yet Created, PE Draft, or PE Ready — same as CRM; based on saved Costing, BOM, ROI, and Proposal (roof layout is separate). Track deal stages in CRM."
    >
      {STATUS_LABELS[st]}
    </span>
  );
}

const ARTIFACT_DOT_DEFS: { key: keyof PeProjectArtifacts; label: string; color: string }[] = [
  { key: 'hasCosting', label: 'Costing', color: '#0ea5e9' },
  { key: 'hasBom', label: 'BOM', color: '#eab308' },
  { key: 'hasRoi', label: 'ROI', color: '#10b981' },
  { key: 'hasProposal', label: 'Proposal', color: '#8b5cf6' },
  { key: 'hasRoofLayout', label: 'Roof', color: '#ea580c' },
];

function ArtifactDotsRow({
  dots,
}: {
  dots: { label: string; done: boolean; color: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      {dots.map((d) => (
        <div
          key={d.label}
          className="flex items-center gap-1"
          title={`${d.label}: ${d.done ? 'saved' : 'pending'}`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full border flex-shrink-0"
            style={{
              background: d.done ? d.color : 'transparent',
              borderColor: d.color,
              opacity: d.done ? 1 : 0.4,
            }}
          />
          <span className="text-[10px] text-secondary-400 hidden sm:inline">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Coloured dots from CRM API flags (Customers list — authoritative). */
export function ServerArtifactDots({ artifacts }: { artifacts: PeProjectArtifacts }) {
  const dots = ARTIFACT_DOT_DEFS.map((d) => ({
    label: d.label,
    color: d.color,
    done: artifacts[d.key],
  }));
  return <ArtifactDotsRow dots={dots} />;
}

/** Coloured dots from a hydrated local record (Dashboard / detail only). */
export function ArtifactDots({ record }: { record: CustomerRecord }) {
  const dots = [
    { label: 'Costing', done: !!record.costing, color: '#0ea5e9' },
    { label: 'BOM', done: !!record.bom, color: '#eab308' },
    { label: 'ROI', done: !!record.roi, color: '#10b981' },
    { label: 'Proposal', done: !!record.proposal, color: '#8b5cf6' },
    { label: 'Roof', done: hasSavedRoofLayout(record), color: '#ea580c' },
  ];
  return <ArtifactDotsRow dots={dots} />;
}
