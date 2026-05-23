import {
  MapCoordinatesBadge,
  ProposalReadinessBadgeFromPeStatus,
  RoofLayoutSavedBadge,
  ServerArtifactDots,
} from './CustomerBadges';
import { artifactSummaryFromPeArtifacts } from './customerHelpers';
import type { ProjectOption } from './types';

/**
 * Customers / Projects list card. All badges and artifact dots come from
 * GET /api/proposal-engine/projects (`peArtifacts`, `peStatus`) — never localStorage.
 */
export function ProjectCard({
  project,
  isActive,
  isReadOnly,
  onOpen,
  onRemoveFromList,
  onHideFromList,
}: {
  project: ProjectOption;
  isActive: boolean;
  isReadOnly: boolean;
  onOpen: () => void;
  onRemoveFromList?: () => void;
  onHideFromList?: () => void;
}) {
  const name = project.customerName;
  const location = project.siteAddress || project.city || '';
  const { peArtifacts } = project;
  const listDate = project.listUpdatedAt
    ? new Date(project.listUpdatedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

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
              <p className="text-sm font-bold text-secondary-900 truncate min-w-0">{name}</p>
              {isReadOnly && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold flex-shrink-0">
                  View only
                </span>
              )}
              {isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200 font-semibold flex-shrink-0">
                  Active
                </span>
              )}
              <ProposalReadinessBadgeFromPeStatus peStatus={project.peStatus} />
              {project.hasMapCoordinates && <MapCoordinatesBadge />}
              {peArtifacts.hasRoofLayout && <RoofLayoutSavedBadge />}
            </div>
            {location && (
              <p className="text-xs text-secondary-500 truncate">📍 {location}</p>
            )}
            {typeof project.systemSizeKw === 'number' && project.systemSizeKw > 0 && (
              <p className="text-[11px] text-secondary-400 mt-0.5">
                ⚡ {project.systemSizeKw} kW system
              </p>
            )}
            {(project.contactPerson || project.phone) && (
              <p className="text-xs text-secondary-400 mt-0.5 truncate">
                👤 {project.contactPerson || ''}
                {project.phone ? ` · ${project.phone}` : ''}
              </p>
            )}
            {project.salespersonName && (
              <p className="text-[10px] text-secondary-400 mt-0.5">
                Sales: {project.salespersonName}
              </p>
            )}
          </div>
          <div
            className="flex items-center gap-1.5 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {onRemoveFromList && (
              <button
                onClick={onRemoveFromList}
                title="Remove from Proposal Engine (Admin only)"
                className="p-2 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                🗑
              </button>
            )}
            {onHideFromList && (
              <button
                onClick={onHideFromList}
                title="Hide from my list (show again via link below)"
                className="text-[11px] font-medium px-2 py-1.5 rounded-lg text-secondary-500 hover:text-amber-700 hover:bg-amber-50 border border-secondary-200 hover:border-amber-300 transition-colors"
              >
                Hide
              </button>
            )}
            <button
              onClick={onOpen}
              title="Open project"
              className="text-xs text-white font-semibold px-3 py-1.5 rounded-lg transition-all min-h-[32px]"
              style={{ background: '#0d1b3a' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0a1530';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0d1b3a';
              }}
            >
              Open
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-secondary-100 flex items-center justify-between gap-3">
          <ServerArtifactDots artifacts={peArtifacts} />
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] text-secondary-400">
              {artifactSummaryFromPeArtifacts(peArtifacts)}
            </span>
            {listDate && (
              <>
                <span className="text-[10px] text-secondary-300">·</span>
                <span className="text-[10px] text-secondary-400">{listDate}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
