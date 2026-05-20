import { STATUS_COLORS, STATUS_LABELS } from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';

/** Pill badge showing proposal document readiness (not-started / draft / proposal-ready / confirmed). */
export function ProposalReadinessBadge({ record }: { record: CustomerRecord }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[record.status]}`}
      title="Not Yet Created, PE Draft, or PE Ready — same as CRM; based on saved Costing, BOM, ROI, and Proposal. Track deal stages in CRM."
    >
      {STATUS_LABELS[record.status]}
    </span>
  );
}

/** Four coloured dots (Costing / BOM / ROI / Proposal) indicating which artifacts are saved. */
export function ArtifactDots({ record }: { record: CustomerRecord }) {
  const dots = [
    { label: 'Costing',  done: !!record.costing,  color: '#0ea5e9' },
    { label: 'BOM',      done: !!record.bom,       color: '#eab308' },
    { label: 'ROI',      done: !!record.roi,       color: '#10b981' },
    { label: 'Proposal', done: !!record.proposal,  color: '#8b5cf6' },
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
