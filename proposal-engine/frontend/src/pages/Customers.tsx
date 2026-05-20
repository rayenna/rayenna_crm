import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  loadCustomers,
  createCustomer,
  deleteCustomer,
  switchActiveCustomer,
  getActiveCustomerId,
  getHiddenProjectIds,
  clearHiddenProjectIds,
  removeHiddenProjectId,
  upsertCustomer,
} from '../lib/customerStore';
import type { CustomerRecord } from '../lib/customerStore';
import {
  fetchProposalEngineProjects,
  fetchProposalEngineEligibleProjects,
  fetchProposalEngineProjectsStats,
  fetchProjectWithArtifacts,
  applyProposalEngineProjectDetail,
  getCurrentUserRole,
  deleteProjectFromProposalEngine,
  selectProposalEngineProject,
  type PeProjectsStatsResponse,
} from '../lib/apiClient';

// Sub-modules
import { PROJECTS_PAGE_SIZE, PROJECT_LIST_SORT_OPTIONS } from '../customers/types';
import type { ProjectOption } from '../customers/types';
import {
  mapApiProjectToProjectOption,
  buildMasterFromProject,
  buildShellCustomerRecordFromProject,
  getLatestLocalRecordForCrmProject,
  canCreateOrEditProposals,
  ROLES_VIEW_ONLY_PE,
} from '../customers/customerHelpers';
import { ProjectCard } from '../customers/ProjectCard';
import { ProjectPickerModal } from '../customers/ProjectPickerModal';
import { ProjectConflictModal } from '../customers/ProjectConflictModal';
import { CustomerCard } from '../customers/CustomerCard';

// Re-export for consumers (NewCustomerModal is reserved for manual add flow)
export { NewCustomerModal } from '../customers/NewCustomerModal';

export default function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => loadCustomers());
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const activeId                  = getActiveCustomerId();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [projectListPage, setProjectListPage] = useState(0);
  const [listSortBy, setListSortBy] = useState('selectionUpdatedAt');
  const [listSortOrder, setListSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStage, setFilterStage] = useState('');
  const [filterPeStatus, setFilterPeStatus] = useState<
    '' | 'not-started' | 'draft' | 'proposal-ready'
  >('');
  const [projectStats, setProjectStats] = useState<PeProjectsStatsResponse>({
    total: 0,
    notStarted: 0,
    draft: 0,
    ready: 0,
    confirmed: 0,
  });
  const [eligibleProjects, setEligibleProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Conflict modal state when selecting a CRM project that already has proposals.
  const [conflictProject, setConflictProject] = useState<ProjectOption | null>(null);
  const [conflictExistingCount, setConflictExistingCount] = useState<number>(0);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [hydratingProjectId, setHydratingProjectId] = useState<string | null>(null);

  // Delete confirmation (ProjectCard trash): Admin only (server enforces).
  const [removeConfirmProject, setRemoveConfirmProject] = useState<ProjectOption | null>(null);

  const userRole = getCurrentUserRole();
  // Per clarified requirement: the list view is always API-driven (selected projects).
  const viewAllMode = true;
  const canCreateProposal = canCreateOrEditProposals(userRole);
  const isReadOnlyRole =
    userRole != null && ROLES_VIEW_ONLY_PE.has(userRole.toUpperCase());
  const isAdmin = userRole != null && userRole.toUpperCase() === 'ADMIN';

  const [hiddenProjectIds, setHiddenProjectIds] = useState<string[]>(() => getHiddenProjectIds());

  const refresh = useCallback(() => setCustomers(loadCustomers()), []);

  /** Always read the latest customers inside async callbacks without putting `customers` in deps (P1). */
  const customersRef = useRef(customers);
  customersRef.current = customers;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setProjectListPage(0);
  }, [debouncedSearch, filterStage, filterPeStatus, listSortBy, listSortOrder]);

  const customersByCrmProjectId = useMemo(() => {
    const m = new Map<string, CustomerRecord>();
    for (const c of customers) {
      const pid = c?.master?.crmProjectId;
      if (!pid) continue;
      // If multiple proposals exist per CRM project, prefer the most recently updated record.
      const existing = m.get(pid);
      if (!existing) {
        m.set(pid, c);
        continue;
      }
      const a = new Date(existing.updatedAt).getTime();
      const b = new Date(c.updatedAt).getTime();
      if (b >= a) m.set(pid, c);
    }
    return m;
  }, [customers]);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const q = debouncedSearch.trim() || undefined;
      const stage = filterStage.trim() || undefined;
      const peStatus = filterPeStatus || undefined;
      const sharedFilters = {
        ...(q ? { q } : {}),
        ...(stage ? { stage } : {}),
        ...(peStatus ? { peStatus } : {}),
      };

      const [listRes, statsRes] = await Promise.all([
        fetchProposalEngineProjects({
          limit: PROJECTS_PAGE_SIZE,
          offset: projectListPage * PROJECTS_PAGE_SIZE,
          sortBy: listSortBy,
          sortOrder: listSortOrder,
          ...sharedFilters,
        }),
        fetchProposalEngineProjectsStats(sharedFilters),
      ]);

      const mapped: ProjectOption[] = listRes.items.map((p) => mapApiProjectToProjectOption(p));
      setProjects(mapped);
      setProjectsTotal(listRes.total);
      setProjectStats(statsRes);

      const maxPage = Math.max(0, Math.ceil(listRes.total / PROJECTS_PAGE_SIZE) - 1);
      setProjectListPage((p) => (p > maxPage ? maxPage : p));

      // Do not prune local customers from paginated list results — the current page is not the full
      // selection set. Removal stays tied to explicit delete / remove-from-list flows.
    } catch (err: any) {
      setProjectsError(err?.message || 'Failed to load projects.');
    } finally {
      setProjectsLoading(false);
    }
  }, [
    debouncedSearch,
    filterPeStatus,
    filterStage,
    listSortBy,
    listSortOrder,
    projectListPage,
  ]);

  const hasActiveListFilters =
    search.trim() !== '' ||
    filterStage !== '' ||
    filterPeStatus !== '' ||
    listSortBy !== 'selectionUpdatedAt' ||
    listSortOrder !== 'desc';

  const handleResetListFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setFilterStage('');
    setFilterPeStatus('');
    setListSortBy('selectionUpdatedAt');
    setListSortOrder('desc');
    setProjectListPage(0);
  }, []);

  const loadEligibleProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const apiProjects = await fetchProposalEngineEligibleProjects();
      if (!Array.isArray(apiProjects)) {
        throw new Error('Invalid eligible projects response from server.');
      }
      const mapped: ProjectOption[] = apiProjects.map((p) => mapApiProjectToProjectOption(p));
      setEligibleProjects(mapped);
    } catch (err: any) {
      setProjectsError(err?.message || 'Failed to load eligible projects.');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const handleRemoveFromList = useCallback(async (projectId: string) => {
    try {
      await deleteProjectFromProposalEngine(projectId);
      removeHiddenProjectId(projectId);
      setHiddenProjectIds(getHiddenProjectIds());
      // Remove any local records linked to this CRM project (so Dashboard + Customers are consistent).
      const locals = customers.filter((c) => c?.master?.crmProjectId === projectId);
      locals.forEach((c) => deleteCustomer(c.id));
      setCustomers((prev) => prev.filter((c) => c?.master?.crmProjectId !== projectId));
      await loadProjects();
    } catch (err) {
      setProjectsError((err as Error)?.message ?? 'Failed to remove project');
    }
  }, [customers, loadProjects]);

  // Admin maintenance actions (restore/clear) are currently not exposed in the UI.
  // Keeping the functions commented-out here for possible future use.
  // const handleAdminClearAll = useCallback(async () => { ... }, [isAdmin, clearingAll, loadProjects]);
  // const handleAdminRestoreHidden = useCallback(async () => { ... }, [isAdmin, clearingAll, loadProjects]);

  const handleClearHiddenList = useCallback(() => {
    clearHiddenProjectIds();
    setHiddenProjectIds([]);
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  /** Create local record from CRM project and hydrate with backend artifacts if any. */
  const createFromProjectAndHydrate = useCallback(
    async (project: ProjectOption, proposalIndex: number): Promise<CustomerRecord> => {
      const master = buildMasterFromProject(project);
      const record = createCustomer(master);
      const indexed: CustomerRecord = { ...record, proposalIndex };
      try {
        const res = await fetchProjectWithArtifacts(project.id);
        const final = applyProposalEngineProjectDetail(indexed, res);
        upsertCustomer(final);
        return final;
      } catch {
        // No backend data or network error — keep local shell only
        upsertCustomer(indexed);
        return indexed;
      }
    },
    [],
  );

  const handleCreateFromProject = useCallback(
    async (project: ProjectOption) => {
      const existingForProject = customers.filter(
        (c) => c.master.crmProjectId === project.id,
      );

      if (existingForProject.length > 0) {
        setConflictProject(project);
        setConflictExistingCount(existingForProject.length);
        setShowPicker(false);
        setShowConflictModal(true);
        return;
      }

      setHydratingProjectId(project.id);
      try {
        // Persist selection server-side so it appears in lists for everyone.
        await selectProposalEngineProject(project.id);
        const merged = await createFromProjectAndHydrate(project, 1);
        switchActiveCustomer(merged.id);
        setShowPicker(false);
        await loadProjects();
        navigate('/dashboard');
      } finally {
        setHydratingProjectId(null);
      }
    },
    [createFromProjectAndHydrate, customers, navigate, loadProjects],
  );

  const handleOpen = (id: string) => {
    switchActiveCustomer(id);
    navigate('/dashboard');
  };

  /** Open a project from the API list. Always fetches latest artifacts from backend and merges into
   *  local record so Sales (and others) see server-backed data even if their local copy was empty/stale. */
  const handleOpenProjectFromApi = useCallback(
    async (project: ProjectOption) => {
      setHydratingProjectId(project.id);
      try {
        const res = await fetchProjectWithArtifacts(project.id);
        const now = new Date().toISOString();
        const existing = customersByCrmProjectId.get(project.id) ?? null;
        const base: CustomerRecord = existing
          ? { ...existing, updatedAt: now }
          : buildShellCustomerRecordFromProject(project);
        const record = applyProposalEngineProjectDetail(base, res);
        switchActiveCustomer(record.id);
        upsertCustomer(record);
        setCustomers((prev) => {
          const idx = prev.findIndex((c) => c.id === record.id);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = record;
            return next;
          }
          return [...prev, record];
        });
        navigate('/dashboard');
      } catch {
        // Same resilience as Dashboard: detail API can 500 (e.g. missing DB columns) while list API still works.
        const existing = customersByCrmProjectId.get(project.id) ?? null;
        const now = new Date().toISOString();
        const record: CustomerRecord = existing
          ? {
              ...existing,
              updatedAt: now,
              master: buildMasterFromProject(project),
            }
          : buildShellCustomerRecordFromProject(project);
        switchActiveCustomer(record.id);
        upsertCustomer(record);
        setCustomers((prev) => {
          const idx = prev.findIndex((c) => c.id === record.id);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = record;
            return next;
          }
          return [...prev, record];
        });
        setProjectsError(null);
        navigate('/dashboard');
      } finally {
        setHydratingProjectId(null);
      }
    },
    [customersByCrmProjectId, navigate],
  );

  const handleDelete = useCallback(async (record: CustomerRecord) => {
    const projectId = record.master.crmProjectId;
    if (projectId) {
      try {
        await deleteProjectFromProposalEngine(projectId);
      } catch {
        setProjectsError('Failed to remove project for everyone');
        return;
      }
    }
    deleteCustomer(record.id);
    refresh();
    if (projectId) {
      removeHiddenProjectId(projectId);
      setHiddenProjectIds(getHiddenProjectIds());
      await loadProjects();
    }
  }, [loadProjects]);

  // Deep link support: /customers?openProjectId=<CRM_PROJECT_ID>
  // Runs only when the query string changes; merges using fresh loadCustomers() so we do not re-run on every customer edit (P1).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectId = params.get('openProjectId');
    if (!projectId) return;

    let cancelled = false;

    void (async () => {
      try {
        try {
          await selectProposalEngineProject(projectId);
        } catch {
          // Ignore selection errors – user may not have access; we'll surface a generic error below.
        }
        if (cancelled) return;

        const detail = await fetchProjectWithArtifacts(projectId);
        if (cancelled) return;

        const projectOption = mapApiProjectToProjectOption(detail.project);
        const now = new Date().toISOString();
        const existing =
          getLatestLocalRecordForCrmProject(projectId, loadCustomers()) ?? null;
        const base: CustomerRecord = existing
          ? { ...existing, updatedAt: now }
          : buildShellCustomerRecordFromProject(projectOption);
        const record = applyProposalEngineProjectDetail(base, detail);
        if (cancelled) return;

        switchActiveCustomer(record.id);
        upsertCustomer(record);
        setCustomers((prev) => {
          const idx = prev.findIndex((c) => c.id === record.id);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = record;
            return next;
          }
          return [...prev, record];
        });
        navigate('/dashboard');
      } catch {
        if (cancelled) return;
        // Detail API often fails when DB is behind schema (e.g. missing pe_proposals.proposalView) while
        // GET /projects list still works — mirror Dashboard by using local data or list metadata.
        const now = new Date().toISOString();
        const existing =
          getLatestLocalRecordForCrmProject(projectId, loadCustomers()) ?? null;

        let projectOption: ProjectOption | null = null;
        try {
          const { items } = await fetchProposalEngineProjects({ projectId });
          if (!cancelled) {
            const row = items.find((x) => x.id === projectId);
            if (row) projectOption = mapApiProjectToProjectOption(row);
          }
        } catch {
          // ignore
        }
        if (cancelled) return;

        let record: CustomerRecord | null = null;
        if (existing) {
          record = projectOption
            ? { ...existing, updatedAt: now, master: buildMasterFromProject(projectOption) }
            : existing;
        } else if (projectOption) {
          record = buildShellCustomerRecordFromProject(projectOption);
        }

        if (record) {
          switchActiveCustomer(record.id);
          upsertCustomer(record);
          setCustomers((prev) => {
            const idx = prev.findIndex((c) => c.id === record.id);
            if (idx >= 0) {
              const next = prev.slice();
              next[idx] = record;
              return next;
            }
            return [...prev, record];
          });
          setProjectsError(null);
          navigate('/dashboard');
          return;
        }

        setProjectsError(
          'Unable to open this project in Proposal Engine. Check access and project stage, and ensure the CRM backend database is migrated (npx prisma migrate deploy on the server).',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, navigate]);

  const filtered = customers.filter((c) => {
    const m = c?.master;
    if (!m) return false;
    const q = search.toLowerCase();
    return (
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.location ?? '').toLowerCase().includes(q) ||
      (m.contactPerson ?? '').toLowerCase().includes(q)
    );
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const hiddenSet = new Set(hiddenProjectIds);
  const filteredProjects = projects.filter((p) => !hiddenSet.has(p.id));

  const statCounts = viewAllMode
    ? {
        total:      projectStats.total,
        notStarted: projectStats.notStarted,
        draft:      projectStats.draft,
        ready:      projectStats.ready,
        confirmed:  projectStats.confirmed,
      }
    : {
        total:       customers.length,
        notStarted:  customers.filter((c) => c.status === 'not-started').length,
        draft:       customers.filter((c) => c.status === 'draft').length,
        ready:       customers.filter((c) => c.status === 'proposal-ready').length,
        confirmed:   customers.filter((c) => (c.master.projectStage || '').toUpperCase() === 'CONFIRMED').length,
      };

  const projectPageCount = Math.max(1, Math.ceil(projectsTotal / PROJECTS_PAGE_SIZE));
  const rangeStart = projectsTotal === 0 ? 0 : projectListPage * PROJECTS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(projectsTotal, (projectListPage + 1) * PROJECTS_PAGE_SIZE);

  return (
    <>
      {showConflictModal && conflictProject && (
        <ProjectConflictModal
          project={conflictProject}
          existingCount={conflictExistingCount}
          onOverwrite={() => {
            const forProject = customers.filter(
              (c) => c.master.crmProjectId === conflictProject.id,
            );
            if (forProject.length === 0) {
              setShowConflictModal(false);
              setConflictProject(null);
              setConflictExistingCount(0);
              // Fallback: treat as first-time selection.
              handleCreateFromProject(conflictProject);
              return;
            }

            // Normalise proposal indexes (Proposal #1, #2, ...) by createdAt.
            const sorted = [...forProject].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
            sorted.forEach((rec, idx) => {
              if (rec.proposalIndex !== idx + 1) {
                upsertCustomer({ ...rec, proposalIndex: idx + 1 });
              }
            });
            const target = sorted[sorted.length - 1]!;
            const reset: CustomerRecord = {
              ...target,
              status: 'not-started',
              costing: null,
              bom: null,
              roi: null,
              roofLayout: null,
              proposal: null,
            };
            upsertCustomer(reset);
            switchActiveCustomer(reset.id);
            setShowConflictModal(false);
            setConflictProject(null);
            setConflictExistingCount(0);
            navigate('/dashboard');
          }}
          onAppend={async () => {
            const forProject = customers.filter(
              (c) => c.master.crmProjectId === conflictProject.id,
            );
            const sorted = [...forProject].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
            sorted.forEach((rec, idx) => {
              if (rec.proposalIndex !== idx + 1) {
                upsertCustomer({ ...rec, proposalIndex: idx + 1 });
              }
            });
            const nextIndex = sorted.length + 1;
            setHydratingProjectId(conflictProject.id);
            try {
              const merged = await createFromProjectAndHydrate(
                conflictProject,
                nextIndex,
              );
              switchActiveCustomer(merged.id);
              setShowConflictModal(false);
              setConflictProject(null);
              setConflictExistingCount(0);
              navigate('/dashboard');
            } finally {
              setHydratingProjectId(null);
            }
          }}
          onCancel={() => {
            setShowConflictModal(false);
            setConflictProject(null);
            setConflictExistingCount(0);
            setShowPicker(true);
          }}
        />
      )}

      {/* Delete proposal confirmation — Admin only (ProjectCard trash) */}
      {removeConfirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary-900/70 backdrop-blur-sm" onClick={() => setRemoveConfirmProject(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-red-200/80 max-w-md w-full p-6">
            <p className="text-sm text-secondary-800 font-medium">
              Remove proposal for <strong>{removeConfirmProject.customerName}</strong> from Proposal Engine? This will remove it for everyone. All artifacts (Costing, BOM, ROI, Proposal) will be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveConfirmProject(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 transition-colors"
              >
                No
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = removeConfirmProject.id;
                  setRemoveConfirmProject(null);
                  await handleRemoveFromList(id);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showPicker && (
        <ProjectPickerModal
          projects={eligibleProjects}
          loading={projectsLoading}
          error={projectsError}
          onRetry={loadEligibleProjects}
          onSelect={handleCreateFromProject}
          onCancel={() => setShowPicker(false)}
          selectionLoading={hydratingProjectId != null}
        />
      )}

      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">👥</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">Customers / Projects</h1>
                <p className="mt-0.5 text-white/90 text-sm">
                  Comprehensive module for solar costing, BOMs, proposals, and ROI.
                  <br />
                  Select a customer to start a proposal workflow — Costing → BOM → ROI → Proposal.
                </p>
              </div>
            </div>
            {canCreateProposal && (
              <button
                onClick={() => { void loadEligibleProjects(); setShowPicker(true); }}
                title="Pick from Rayenna CRM Projects in Proposal stage or higher."
                className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all w-full sm:w-auto flex-shrink-0"
              >
                + Select Project
              </button>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total',           value: statCounts.total,       color: 'text-secondary-700 bg-secondary-50 border-secondary-200' },
              { label: 'Not Yet Created', value: statCounts.notStarted,  color: 'text-slate-700 bg-slate-50 border-slate-200' },
              { label: 'PE Draft',        value: statCounts.draft,       color: 'text-secondary-600 bg-secondary-50 border-secondary-200' },
              { label: 'PE Ready',        value: statCounts.ready,       color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: 'Confirmed',       value: statCounts.confirmed,   color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                <p className="text-2xl font-extrabold tabular-nums">{s.value}</p>
                <p className="text-xs mt-0.5 opacity-70">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search, filters, sort (server-side for API list) */}
          <div className="mb-5 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <div className="w-full min-w-0 lg:w-56 lg:flex-shrink-0 xl:w-64">
                <label className="block text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-1">
                  Search projects
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Customer, site, city, contact, salesperson…"
                  className="w-full border border-secondary-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
                />
              </div>
              {/* Mobile: 2×2 (CRM|PE, Sort|Order). Laptop: one row of four + reset. */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-w-0 lg:max-w-none">
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-1">
                    CRM stage
                  </label>
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="w-full min-w-0 border border-secondary-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 bg-white"
                  >
                    <option value="">All stages</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="LEAD">Lead</option>
                    <option value="SITE_SURVEY">Site survey</option>
                    <option value="UNDER_INSTALLATION">Under installation</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-1">
                    PE status
                  </label>
                  <select
                    value={filterPeStatus}
                    onChange={(e) =>
                      setFilterPeStatus(
                        (e.target.value || '') as
                          | ''
                          | 'not-started'
                          | 'draft'
                          | 'proposal-ready',
                      )
                    }
                    className="w-full min-w-0 border border-secondary-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 bg-white"
                  >
                    <option value="">All</option>
                    <option value="not-started">Not yet created</option>
                    <option value="draft">PE draft</option>
                    <option value="proposal-ready">PE ready</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-1">
                    Sort by
                  </label>
                  <select
                    value={listSortBy}
                    onChange={(e) => setListSortBy(e.target.value)}
                    className="w-full min-w-0 border border-secondary-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 bg-white"
                  >
                    {PROJECT_LIST_SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-1">
                    Order
                  </label>
                  <select
                    value={listSortOrder}
                    onChange={(e) =>
                      setListSortOrder(e.target.value === 'asc' ? 'asc' : 'desc')
                    }
                    className="w-full min-w-0 border border-secondary-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 bg-white"
                  >
                    <option value="desc">Newest / Z→A</option>
                    <option value="asc">Oldest / A→Z</option>
                  </select>
                </div>
              </div>
              {viewAllMode && (
                <div className="flex flex-col justify-end lg:flex-shrink-0 w-full lg:w-auto">
                  <label className="hidden lg:block text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-1 opacity-0 pointer-events-none select-none" aria-hidden>
                    Reset
                  </label>
                  <button
                    type="button"
                    onClick={handleResetListFilters}
                    disabled={!hasActiveListFilters}
                    title={
                      hasActiveListFilters
                        ? 'Clear search, filters, and sort to defaults'
                        : 'No filters to reset'
                    }
                    className={`w-full lg:w-auto text-sm font-semibold px-3 py-2.5 rounded-lg transition-all whitespace-nowrap min-h-[40px] lg:min-h-[42px] ${
                      hasActiveListFilters
                        ? 'text-[#0d1b3a] bg-[#eab308] hover:bg-[#ca8a04] border border-amber-800/20 shadow-sm'
                        : 'text-white bg-[#0d1b3a] hover:bg-[#0a1530] disabled:opacity-45 disabled:hover:bg-[#0d1b3a] disabled:pointer-events-none'
                    }`}
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Customer / Project list */}
          {viewAllMode ? (
            <>
              {projectsLoading ? (
                <div className="rounded-xl border-2 border-dashed border-secondary-200 p-12 text-center">
                  <p className="text-secondary-500 font-semibold text-sm">Loading all project proposals…</p>
                </div>
              ) : projectsError ? (
                <div className="rounded-xl border-2 border-dashed border-secondary-200 p-12 text-center">
                  <p className="text-red-600 font-semibold text-sm">{projectsError}</p>
                  <button type="button" onClick={() => void loadProjects()} className="mt-3 text-sm text-primary-600 hover:underline">Retry</button>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-secondary-200 p-12 text-center">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="text-secondary-500 font-semibold text-sm">
                    {debouncedSearch || filterStage || filterPeStatus
                      ? 'No projects match your filters'
                      : 'No projects in Proposal stage yet'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((p) => {
                    const localRecord = customersByCrmProjectId.get(p.id) ?? null;
                    const effectiveId = localRecord?.id ?? `crm_${p.id}`;
                    if (isAdmin && localRecord) {
                      return (
                        <CustomerCard
                          key={localRecord.id}
                          record={localRecord}
                          isActive={activeId === localRecord.id}
                          onOpen={() => handleOpen(localRecord.id)}
                          onDelete={() => void handleDelete(localRecord)}
                        />
                      );
                    }
                    return (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        record={localRecord}
                        isActive={activeId === effectiveId}
                        isReadOnly={isReadOnlyRole}
                        onOpen={() => void handleOpenProjectFromApi(p)}
                        onRemoveFromList={isAdmin ? () => setRemoveConfirmProject(p) : undefined}
                      />
                    );
                  })}
                </div>
              )}
              {!projectsLoading && projectsError == null && (
                <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 border-t border-secondary-100 text-xs text-secondary-500">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="tabular-nums text-sm text-secondary-600">
                      {projectsTotal === 0
                        ? 'No matching projects'
                        : `Showing ${rangeStart}–${rangeEnd} of ${projectsTotal}`}
                    </p>
                    {hiddenProjectIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearHiddenList}
                        className="text-sm text-secondary-600 hover:text-primary-600 font-medium whitespace-nowrap"
                      >
                        Show {hiddenProjectIds.length} hidden project{hiddenProjectIds.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                  {projectsTotal > PROJECTS_PAGE_SIZE && (
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <button
                        type="button"
                        disabled={projectListPage <= 0 || projectsLoading}
                        onClick={() => setProjectListPage((p) => Math.max(0, p - 1))}
                        className="px-3 py-1.5 rounded-lg border border-secondary-300 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-secondary-600 tabular-nums px-1">
                        Page {projectListPage + 1} / {projectPageCount}
                      </span>
                      <button
                        type="button"
                        disabled={
                          projectListPage >= projectPageCount - 1 || projectsLoading
                        }
                        onClick={() =>
                          setProjectListPage((p) =>
                            Math.min(projectPageCount - 1, p + 1),
                          )
                        }
                        className="px-3 py-1.5 rounded-lg border border-secondary-300 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-secondary-200 p-12 text-center">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-secondary-500 font-semibold text-sm">
                {search ? 'No customers match your search' : 'No customers yet'}
              </p>
              {!search && (
                <p className="text-xs text-secondary-400 mt-2">
                  Click <strong>+ Select Project</strong> to start from an existing Rayenna CRM Project.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <CustomerCard
                  key={c.id}
                  record={c}
                  isActive={c.id === activeId}
                  onOpen={() => handleOpen(c.id)}
                  onDelete={isAdmin ? () => void handleDelete(c) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
