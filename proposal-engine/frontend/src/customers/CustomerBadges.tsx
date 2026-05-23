import {
  STATUS_COLORS,
  STATUS_LABELS,
  hasSavedRoofLayout,
  normalizeProposalStatus,
} from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';
import { hasValidMapCoordinates } from './customerHelpers';
import type { PeProjectArtifacts } from './types';

/** Shared pill styles — wrap inside parent `flex flex-wrap`; never wider than the card. */
const PE_PILL_BADGE =
  'inline-flex items-center gap-0.5 max-w-full rounded-full border font-semibold whitespace-nowrap shrink-0 text-[10px] px-2 py-0.5 leading-snug';

/** Customer Master has Google Map lat/lng — ready for AI Roof Layout satellite pin. */
export function MapCoordinatesBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`${PE_PILL_BADGE} bg-emerald-50 text-emerald-800 border-emerald-200/90 ${className}`}
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
      className={`${PE_PILL_BADGE} bg-orange-50 text-orange-900 border-orange-200/90 ${className}`}
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
      className={`${PE_PILL_BADGE} ${STATUS_COLORS[st]}`}
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

const ARTIFACT_SHORT_LABELS: Record<string, string> = {
  Costing: 'Cost',
  Proposal: 'Prop',
};

function artifactDotLabel(label: string, compact: boolean): string {
  if (!compact) return label;
  return ARTIFACT_SHORT_LABELS[label] ?? label;
}

function ArtifactDotsRow({
  dots,
  layout = 'inline',
}: {
  dots: { label: string; done: boolean; color: string }[];
  /** `card` = mobile-first grid inside project cards; `inline` = dashboard row */
  layout?: 'card' | 'inline';
}) {
  if (layout === 'card') {
    return (
      <div
        className="w-full min-w-0"
        role="list"
        aria-label="Proposal Engine artifacts"
      >
        <div className="grid grid-cols-5 gap-1 w-full min-w-0">
          {dots.map((d) => (
            <div
              key={d.label}
              role="listitem"
              className="flex flex-col items-center justify-start min-w-0 py-0.5"
              title={`${d.label}: ${d.done ? 'saved' : 'pending'}`}
            >
              <span
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border flex-shrink-0"
                style={{
                  background: d.done ? d.color : 'transparent',
                  borderColor: d.color,
                  opacity: d.done ? 1 : 0.35,
                }}
                aria-hidden
              />
              <span className="mt-1 w-full min-w-0 px-0.5 text-[9px] sm:text-[10px] leading-tight text-center text-secondary-500 truncate">
                <span className="sm:hidden">{artifactDotLabel(d.label, true)}</span>
                <span className="hidden sm:inline">{d.label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 max-w-full min-w-0">
      {dots.map((d) => (
        <div
          key={d.label}
          className="inline-flex items-center gap-1 shrink-0"
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
          <span className="text-[10px] text-secondary-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Coloured dots from CRM API flags (Customers list — authoritative). */
export function ServerArtifactDots({
  artifacts,
  layout = 'card',
}: {
  artifacts: PeProjectArtifacts;
  layout?: 'card' | 'inline';
}) {
  const dots = ARTIFACT_DOT_DEFS.map((d) => ({
    label: d.label,
    color: d.color,
    done: artifacts[d.key],
  }));
  return <ArtifactDotsRow dots={dots} layout={layout} />;
}

/** Coloured dots from a hydrated local record (Dashboard / detail only). */
export function ArtifactDots({
  record,
  layout = 'inline',
}: {
  record: CustomerRecord;
  layout?: 'card' | 'inline';
}) {
  const dots = [
    { label: 'Costing', done: !!record.costing, color: '#0ea5e9' },
    { label: 'BOM', done: !!record.bom, color: '#eab308' },
    { label: 'ROI', done: !!record.roi, color: '#10b981' },
    { label: 'Proposal', done: !!record.proposal, color: '#8b5cf6' },
    { label: 'Roof', done: hasSavedRoofLayout(record), color: '#ea580c' },
  ];
  return <ArtifactDotsRow dots={dots} layout={layout} />;
}
