import { useState } from 'react';
import { artifactSummary } from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';
import { ProposalReadinessBadge, ArtifactDots } from './CustomerBadges';

export function CustomerCard({
  record,
  isActive,
  onOpen,
  onDelete,
}: {
  record:    CustomerRecord;
  isActive:  boolean;
  onOpen:    () => void;
  /** When omitted, trash control is hidden (e.g. Sales — only Admin may delete PE data server-side). */
  onDelete?: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const date = new Date(record.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-200'}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: isActive ? '#0d1b3a' : '#e2e8f0' }}
      onClick={onOpen}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-1 min-w-0">
                <p className="text-sm font-bold text-secondary-900 truncate min-w-0">{record.master.name}</p>
                {typeof record.proposalIndex === 'number' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex-shrink-0">
                    #{record.proposalIndex}
                  </span>
                )}
              </div>
              {isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200 font-semibold flex-shrink-0">
                  Active
                </span>
              )}
              <ProposalReadinessBadge record={record} />
            </div>
            {record.master.location && (
              <p className="text-xs text-secondary-500 truncate">📍 {record.master.location}</p>
            )}
            {typeof record.master.systemSizeKw === 'number' && record.master.systemSizeKw > 0 && (
              <p className="text-[11px] text-secondary-400 mt-0.5">
                ⚡ {record.master.systemSizeKw} kW system
              </p>
            )}
            {record.master.contactPerson && (
              <p className="text-xs text-secondary-400 mt-0.5 truncate">
                👤 {record.master.contactPerson}{record.master.phone ? ` · ${record.master.phone}` : ''}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onOpen}
              title="Open on Dashboard"
              className="text-xs text-white font-semibold px-3 py-1.5 rounded-lg transition-all min-h-[32px]"
              style={{ background: '#0d1b3a' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
            >
              Open
            </button>
            {onDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Remove from Proposal Engine (Admin only)"
                className="p-2 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                🗑
              </button>
            )}
          </div>
        </div>

        {/* Artifact dots + date */}
        <div className="mt-3 pt-3 border-t border-secondary-100 flex items-center justify-between gap-3">
          <ArtifactDots record={record} />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-secondary-400">{artifactSummary(record)}</span>
            <span className="text-[10px] text-secondary-300">·</span>
            <span className="text-[10px] text-secondary-400">{date}</span>
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
