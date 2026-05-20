import type { BomArtifact, CostingArtifact, ProposalArtifact, RoiArtifact } from '../customerStore';
import { apiFetch, getApiBaseUrl } from './core';
import { getToken, handleUnauthorized } from './session';

export type PeProjectsListParams = {
  limit?: number;
  offset?: number;
  page?: number;
  q?: string;
  stage?: string;
  stages?: string;
  peStatus?: 'not-started' | 'draft' | 'proposal-ready';
  salespersonId?: string;
  projectId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PeProjectsStatsResponse = {
  total: number;
  notStarted: number;
  draft: number;
  ready: number;
  confirmed: number;
};

export interface ProposalEngineProjectFromApi {
  id: string;
  slNo?: number | null;
  projectStatus?: string | null;
  projectStage?: string | null;
  panelCapacityW?: number | null;
  peStatus?: 'not-started' | 'draft' | 'proposal-ready' | string;
  peSelectedAt?: string | null;
  peSelectedById?: string | null;
  systemCapacity?: number | null;
  siteAddress?: string | null;
  type?: string | null;
  panelType?: string | null;
  projectCost?: number | null;
  confirmationDate?: string | null;
  createdAt?: string | null;
  salesperson?: {
    id: string;
    name?: string | null;
  } | null;
  customer: {
    id: string;
    customerId?: string | null;
    customerName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    city?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    state?: string | null;
    pinCode?: string | null;
    consumerNumber?: string | null;
    customerType?: string | null;
    contactNumbers?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

function buildPeProjectsSearchParams(arg?: number | PeProjectsListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (typeof arg === 'number' && Number.isFinite(arg)) {
    params.set('limit', String(Math.max(1, Math.floor(arg))));
    return params;
  }
  if (arg && typeof arg === 'object') {
    if (arg.limit != null && Number.isFinite(arg.limit)) {
      params.set('limit', String(Math.max(1, Math.floor(arg.limit))));
    }
    if (arg.offset != null && Number.isFinite(arg.offset)) {
      params.set('offset', String(Math.max(0, Math.floor(arg.offset))));
    }
    if (arg.page != null && Number.isFinite(arg.page)) {
      params.set('page', String(Math.max(1, Math.floor(arg.page))));
    }
    if (arg.q != null && arg.q.trim()) params.set('q', arg.q.trim());
    if (arg.stage != null && arg.stage.trim()) params.set('stage', arg.stage.trim());
    if (arg.stages != null && arg.stages.trim()) params.set('stages', arg.stages.trim());
    if (arg.peStatus) params.set('peStatus', arg.peStatus);
    if (arg.salespersonId != null && arg.salespersonId.trim()) {
      params.set('salespersonId', arg.salespersonId.trim());
    }
    if (arg.projectId != null && arg.projectId.trim()) {
      params.set('projectId', arg.projectId.trim());
    }
    if (arg.sortBy) params.set('sortBy', arg.sortBy);
    if (arg.sortOrder) params.set('sortOrder', arg.sortOrder);
  }
  return params;
}

async function fetchPeProjectsRaw(params: URLSearchParams): Promise<{
  items: ProposalEngineProjectFromApi[];
  total: number;
}> {
  const qs = params.toString();
  const path = `/api/proposal-engine/projects${qs ? `?${qs}` : ''}`;
  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path}`;
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { headers });
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : [];
  } catch {
    parsed = [];
  }
  if (!response.ok) {
    const errMsg =
      (parsed as { error?: string })?.error ||
      (parsed as { message?: string })?.message ||
      response.statusText ||
      `Request failed (${response.status})`;
    throw new Error(errMsg);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid projects response from server.');
  }
  const items = parsed as ProposalEngineProjectFromApi[];
  const totalHeader = response.headers.get('X-Total-Count');
  const total =
    totalHeader != null && totalHeader.trim() !== ''
      ? Math.max(0, parseInt(totalHeader, 10) || 0)
      : items.length;
  return { items, total };
}

export async function fetchProposalEngineProjects(
  arg?: number | PeProjectsListParams,
): Promise<{ items: ProposalEngineProjectFromApi[]; total: number }> {
  const params = buildPeProjectsSearchParams(arg);
  if (!params.has('limit')) params.set('limit', '200');
  return fetchPeProjectsRaw(params);
}

export async function fetchProposalEngineProjectsStats(
  filters: Omit<PeProjectsListParams, 'limit' | 'offset' | 'page' | 'sortBy' | 'sortOrder'> = {},
): Promise<PeProjectsStatsResponse> {
  const params = buildPeProjectsSearchParams(filters);
  params.delete('limit');
  params.delete('offset');
  params.delete('page');
  params.delete('sortBy');
  params.delete('sortOrder');
  const qs = params.toString();
  return apiFetch<PeProjectsStatsResponse>(
    `/api/proposal-engine/projects/stats${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchProposalEngineEligibleProjects(): Promise<ProposalEngineProjectFromApi[]> {
  return apiFetch<ProposalEngineProjectFromApi[]>('/api/proposal-engine/projects/eligible');
}

export async function selectProposalEngineProject(projectId: string): Promise<void> {
  await apiFetch(`/api/proposal-engine/projects/${projectId}/select`, { method: 'POST' });
}

export async function adminClearProposalEngineList(): Promise<{ clearedProjects: number }> {
  return apiFetch<{ clearedProjects: number }>('/api/proposal-engine/admin/clear', {
    method: 'POST',
  });
}

export async function adminRestoreProposalEngineHidden(): Promise<{ restoredProjects: number }> {
  return apiFetch<{ restoredProjects: number }>('/api/proposal-engine/admin/unhide-all', {
    method: 'POST',
  });
}

async function captureSyncError(err: unknown, tags: Record<string, string>) {
  try {
    const DSN = import.meta.env.VITE_SENTRY_DSN;
    if (!DSN || typeof DSN !== 'string' || DSN.trim() === '') return;
    const Sentry = await import('@sentry/react');
    Sentry.captureException(err, { tags });
  } catch {
    // ignore sentry failures
  }
}

type DebounceEntry = {
  timer: number | null;
  resolvers: Array<() => void>;
  rejecters: Array<(e: unknown) => void>;
  run: (() => Promise<void>) | null;
};

const SYNC_DEBOUNCE_MS = 600;
const syncDebounceMap = new Map<string, DebounceEntry>();

function debounceSync(key: string, run: () => Promise<void>): Promise<void> {
  const existing = syncDebounceMap.get(key) ?? {
    timer: null,
    resolvers: [],
    rejecters: [],
    run: null,
  };
  existing.run = run;

  const p = new Promise<void>((resolve, reject) => {
    existing.resolvers.push(resolve);
    existing.rejecters.push(reject);
  });

  if (existing.timer != null) {
    window.clearTimeout(existing.timer);
  }
  existing.timer = window.setTimeout(async () => {
    const entry = syncDebounceMap.get(key);
    if (!entry?.run) return;
    const toResolve = entry.resolvers.slice();
    const toReject = entry.rejecters.slice();
    entry.resolvers = [];
    entry.rejecters = [];
    entry.timer = null;
    try {
      await entry.run();
      toResolve.forEach((r) => r());
    } catch (e) {
      toReject.forEach((rej) => rej(e));
    }
  }, SYNC_DEBOUNCE_MS);

  syncDebounceMap.set(key, existing);
  return p;
}

export async function syncProjectCosting(
  projectId: string,
  artifact: CostingArtifact,
): Promise<void> {
  return debounceSync(`sync:costing:${projectId}`, async () => {
    try {
      await apiFetch(`/api/proposal-engine/projects/${projectId}/costing`, {
        method: 'PUT',
        body: JSON.stringify({
          sheetName: artifact.sheetName,
          items: artifact.items,
          grandTotal: artifact.grandTotal,
          showGst: artifact.showGst,
          marginPct: artifact.marginPercent,
          systemSizeKw: artifact.systemSizeKw,
        }),
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to sync costing sheet to CRM backend:', err);
      } else {
        void captureSyncError(err, { sync: 'costing' });
      }
      throw err;
    }
  });
}

export async function syncProjectBom(projectId: string, artifact: BomArtifact): Promise<void> {
  return debounceSync(`sync:bom:${projectId}`, async () => {
    try {
      await apiFetch(`/api/proposal-engine/projects/${projectId}/bom`, {
        method: 'PUT',
        body: JSON.stringify({
          rows: artifact.rows,
        }),
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to sync BOM to CRM backend:', err);
      } else {
        void captureSyncError(err, { sync: 'bom' });
      }
      throw err;
    }
  });
}

export async function syncProjectRoi(projectId: string, artifact: RoiArtifact): Promise<void> {
  return debounceSync(`sync:roi:${projectId}`, async () => {
    try {
      await apiFetch(`/api/proposal-engine/projects/${projectId}/roi`, {
        method: 'PUT',
        body: JSON.stringify({
          result: artifact.result,
        }),
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to sync ROI result to CRM backend:', err);
      } else {
        void captureSyncError(err, { sync: 'roi' });
      }
      throw err;
    }
  });
}

export async function deleteProjectFromProposalEngine(projectId: string): Promise<void> {
  await apiFetch(`/api/proposal-engine/projects/${projectId}`, {
    method: 'DELETE',
  });
}

export async function clearProjectProposalArtifact(projectId: string): Promise<void> {
  await apiFetch(`/api/proposal-engine/projects/${projectId}/proposal`, {
    method: 'DELETE',
  });
}

export interface CostingTemplateDto {
  id: string;
  name: string;
  description?: string | null;
  items: unknown[];
  savedAt: string;
  createdById: string;
  createdByName?: string | null;
}

export async function fetchCostingTemplates(): Promise<CostingTemplateDto[]> {
  return apiFetch<CostingTemplateDto[]>('/api/proposal-engine/costing-templates');
}

export async function createCostingTemplate(payload: {
  name: string;
  description?: string;
  items: unknown[];
}): Promise<CostingTemplateDto> {
  return apiFetch<CostingTemplateDto>('/api/proposal-engine/costing-templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteCostingTemplate(id: string): Promise<void> {
  await apiFetch(`/api/proposal-engine/costing-templates/${id}`, {
    method: 'DELETE',
  });
}

export interface CreateShareResponse {
  token: string;
  expiresAt: string;
}

export async function createProposalShare(payload: {
  projectId: string;
  proposalHtml: string;
  refNumber?: string;
  password?: string;
  expiresAt?: string;
}): Promise<CreateShareResponse> {
  return apiFetch<CreateShareResponse>('/api/proposal-engine/share', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getSharedProposal(
  token: string,
  password?: string,
): Promise<{ html: string; refNumber?: string; expiresAt: string }> {
  const base = getApiBaseUrl() || '';
  const url = password
    ? `${base}/api/proposal-engine/share/${encodeURIComponent(token)}?password=${encodeURIComponent(password)}`
    : `${base}/api/proposal-engine/share/${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? res.statusText ?? 'Failed to load shared proposal');
  }
  return data;
}

export async function syncProjectProposal(
  projectId: string,
  artifact: ProposalArtifact,
): Promise<void> {
  return debounceSync(`sync:proposal:${projectId}`, async () => {
    try {
      await apiFetch(`/api/proposal-engine/projects/${projectId}/proposal`, {
        method: 'PUT',
        body: JSON.stringify({
          refNumber: artifact.refNumber,
          generatedAt: artifact.generatedAt,
          bomComments: artifact.bomComments ?? null,
          editedHtml: artifact.editedHtml ?? null,
          textOverrides: artifact.textOverrides ?? null,
          customSectionsBeforeBoq: artifact.customSectionsBeforeBoq ?? null,
          proposalView: artifact.proposalView ?? null,
          summary: artifact.summary ?? null,
          includeRoofLayout: artifact.includeRoofLayout ?? false,
        }),
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to sync proposal artifact to CRM backend:', err);
      } else {
        void captureSyncError(err, { sync: 'proposal' });
      }
      throw err;
    }
  });
}
