import {
  STATUS_COLORS,
  STATUS_LABELS,
  hasSavedRoofLayout,
} from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';
import { hasValidMapCoordinates } from './customerHelpers';

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
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[record.status]}`}
      title="Not Yet Created, PE Draft, or PE Ready — same as CRM; based on saved Costing, BOM, ROI, and Proposal (roof layout is separate). Track deal stages in CRM."
    >
      {STATUS_LABELS[record.status]}
    </span>
  );
}

/** Coloured dots (Costing / BOM / ROI / Proposal / Roof) indicating which artifacts are saved. */
export function ArtifactDots({ record }: { record: CustomerRecord }) {
  const dots = [
    { label: 'Costing',  done: !!record.costing,  color: '#0ea5e9' },
    { label: 'BOM',      done: !!record.bom,       color: '#eab308' },
    { label: 'ROI',      done: !!record.roi,       color: '#10b981' },
    { label: 'Proposal', done: !!record.proposal,  color: '#8b5cf6' },
    { label: 'Roof',     done: hasSavedRoofLayout(record), color: '#ea580c' },
  ];
  return (
    <div className="flex items-center gap-2">
      {dots.map((d) => (
        <div key={d.label} className="flex items-center gap-1" title={`${d.label}: ${d.done ? 'saved' : 'pending'}`}>
          <span
            className="w-2.5 h-2.5 rounded-full border flex-shrink-0"
            style={{
              background:  d.done ? d.color : 'transparent',
              borderColor: d.color,
              opacity:     d.done ? 1 : 0.4,
            }}
          />
          <span className="text-[10px] text-secondary-400 hidden sm:inline">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
