import { useState } from 'react';
import { artifactSummary } from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';
import {
  ProposalReadinessBadge,
  ArtifactDots,
  MapCoordinatesBadge,
  RoofLayoutSavedBadge,
} from './CustomerBadges';
import { hasSavedRoofLayout } from '../lib/customerStore';
import { hasValidMapCoordinates } from './customerHelpers';

/**
 * Legacy card when browsing local-only customer records (non–API list mode).
 * The main Customers grid uses {@link ProjectCard} with server `peArtifacts` instead.
 */
export function CustomerCard({
  record,
  isActive,
  onOpen,
  onDelete,
  /** From CRM project list when local master has not been hydrated with lat/lng yet. */
  hasMapCoordinatesFromCrm,
}: {
  record:    CustomerRecord;
  isActive:  boolean;
  onOpen:    () => void;
  /** When omitted, trash control is hidden (e.g. Sales — only Admin may delete PE data server-side). */
  onDelete?: () => void;
  hasMapCoordinatesFromCrm?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const date = new Date(record.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const showMapCoordinates =
    hasMapCoordinatesFromCrm === true ||
    hasValidMapCoordinates(record.master.latitude, record.master.longitude);

  return (
    <div
      className={`min-w-0 overflow-hidden bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-200'}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: isActive ? '#0d1b3a' : '#e2e8f0' }}
      onClick={onOpen}
    >
      <div className="p-3 sm:p-4 min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-secondary-900 break-words line-clamp-2 sm:truncate min-w-0">
              {record.master.name}
            </p>
            {typeof record.proposalIndex === 'number' && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                #{record.proposalIndex}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onOpen}
              title="Open on Dashboard"
              className="text-xs text-white font-semibold px-3 py-2 rounded-lg min-h-[36px] touch-manipulation"
              style={{ background: '#0d1b3a' }}
            >
              Open
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Remove from Proposal Engine (Admin only)"
                className="p-2 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation"
              >
                🗑
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 max-w-full min-w-0">
          {isActive && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-primary-200 bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
              Active
            </span>
          )}
          <ProposalReadinessBadge record={record} />
          {showMapCoordinates && <MapCoordinatesBadge />}
          {hasSavedRoofLayout(record) && <RoofLayoutSavedBadge />}
        </div>

        <div className="mt-2 space-y-0.5 min-w-0">
          {record.master.location && (
            <p className="text-xs text-secondary-500 line-clamp-2 sm:truncate">📍 {record.master.location}</p>
          )}
          {typeof record.master.systemSizeKw === 'number' && record.master.systemSizeKw > 0 && (
            <p className="text-[11px] text-secondary-400">
              ⚡ {record.master.systemSizeKw} kW system
            </p>
          )}
          {record.master.contactPerson && (
            <p className="text-xs text-secondary-400 truncate">
              👤 {record.master.contactPerson}
              {record.master.phone ? ` · ${record.master.phone}` : ''}
            </p>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-secondary-100 min-w-0 space-y-2">
          <ArtifactDots record={record} layout="card" />
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] text-secondary-400">
            <span className="tabular-nums shrink-0">{artifactSummary(record)}</span>
            <span className="tabular-nums shrink-0">{date}</span>
          </div>
        </div>
      </div>

      {/* Delete confirm — Admin only */}
      {confirmDelete && onDelete && (
        <div
          className="border-t border-red-100 bg-red-50/80 px-4 py-3 flex items-center justify-between gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-red-700 font-medium">Delete proposal for <strong>{record.master.name}</strong>? All artifacts will be removed from Proposal Engine.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 transition-colors">No</button>
            <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="text-xs text-white font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 transition-colors">Yes</button>
          </div>
        </div>
      )}
    </div>
  );
}
