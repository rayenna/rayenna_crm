import {
  MapCoordinatesBadge,
  ProposalReadinessBadgeFromPeStatus,
  RoofLayoutSavedBadge,
  ServerArtifactDots,
} from './CustomerBadges';
import { artifactSummaryFromPeArtifacts, formatRoofLayoutCardSummary, formatRoofLayoutModuleLabel } from './customerHelpers';
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
  const roofLayoutLine =
    peArtifacts.hasRoofLayout && project.roofLayoutSummary
      ? formatRoofLayoutCardSummary(
          project.roofLayoutSummary,
          formatRoofLayoutModuleLabel(project),
        )
      : null;

  const statusBadges = (
    <>
      {isReadOnly && (
        <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 shrink-0">
          View only
        </span>
      )}
      {isActive && (
        <span className="inline-flex max-w-full items-center rounded-full border border-primary-200 bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700 shrink-0">
          Active
        </span>
      )}
      <ProposalReadinessBadgeFromPeStatus peStatus={project.peStatus} />
      {project.hasMapCoordinates && <MapCoordinatesBadge />}
      {peArtifacts.hasRoofLayout && <RoofLayoutSavedBadge />}
    </>
  );

  return (
    <div
      className={`min-w-0 overflow-hidden bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-200'}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: isActive ? '#0d1b3a' : '#e2e8f0' }}
      onClick={onOpen}
    >
      <div className="p-3 sm:p-4 min-w-0">
        {/* Name + actions — badges stay on their own row so pills never collide with Open */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <p className="flex-1 min-w-0 text-sm font-bold text-secondary-900 leading-snug break-words line-clamp-2 sm:line-clamp-1 sm:truncate">
            {name}
          </p>
          <div
            className="flex items-center gap-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {onRemoveFromList && (
              <button
                type="button"
                onClick={onRemoveFromList}
                title="Remove from Proposal Engine (Admin only)"
                className="p-2 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation"
              >
                🗑
              </button>
            )}
            {onHideFromList && (
              <button
                type="button"
                onClick={onHideFromList}
                title="Hide from my list"
                className="text-[11px] font-medium px-2 py-1.5 rounded-lg text-secondary-500 hover:text-amber-700 hover:bg-amber-50 border border-secondary-200 touch-manipulation"
              >
                Hide
              </button>
            )}
            <button
              type="button"
              onClick={onOpen}
              title="Open project"
              className="text-xs text-white font-semibold px-3 py-2 rounded-lg transition-all min-h-[36px] touch-manipulation"
              style={{ background: '#0d1b3a' }}
            >
              Open
            </button>
          </div>
        </div>

        {/* Status pills — wrap inside card width (mobile / iPad) */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 max-w-full min-w-0">
          {statusBadges}
        </div>

        <div className="mt-2 space-y-0.5 min-w-0">
          {location && (
            <p className="text-xs text-secondary-500 line-clamp-2 sm:truncate" title={location}>
              📍 {location}
            </p>
          )}
          {typeof project.systemSizeKw === 'number' && project.systemSizeKw > 0 && (
            <p className="text-[11px] text-secondary-400">
              ⚡ {project.systemSizeKw} kW system
            </p>
          )}
          {roofLayoutLine && (
            <p className="text-[11px] text-emerald-700 font-medium tabular-nums" title="Saved roof layout">
              📐 {roofLayoutLine}
            </p>
          )}
          {(project.contactPerson || project.phone) && (
            <p className="text-xs text-secondary-400 truncate">
              👤 {project.contactPerson || ''}
              {project.phone ? ` · ${project.phone}` : ''}
            </p>
          )}
          {project.salespersonName && (
            <p className="text-[10px] text-secondary-400 truncate">
              Sales: {project.salespersonName}
            </p>
          )}
        </div>

        {/* Artifacts — stacked on narrow cards; grid dots never overflow */}
        <div className="mt-3 pt-3 border-t border-secondary-100 min-w-0 space-y-2">
          <ServerArtifactDots artifacts={peArtifacts} layout="card" />
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] text-secondary-400 min-w-0">
            <span className="tabular-nums shrink-0">
              {artifactSummaryFromPeArtifacts(peArtifacts)}
            </span>
            {listDate && (
              <span className="tabular-nums text-secondary-400 shrink-0">{listDate}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
