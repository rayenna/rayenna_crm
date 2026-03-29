import { reportStorageFailure } from './safeLocalStorage';

const TOKEN_KEY = 'pe_jwt';
const USER_ID_KEY = 'pe_user_id';
const USER_ROLE_KEY = 'pe_user_role';
const USER_NAME_KEY = 'pe_user_name';

// Match CRM frontend behaviour:
// - In dev: VITE_API_BASE_URL is usually empty → use relative `/api/...` (Vite proxy).
// - In prod: VITE_API_BASE_URL is the backend origin, e.g. https://rayenna-crm.onrender.com
//   and we always prefix paths with `/api/...`.
const RAW_API_BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL || '';
const API_BASE_URL: string = RAW_API_BASE_URL.replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/** Timeout for health check and cold-start tolerance (matches CRM). 90s for Render free-tier wake. */
export const HEALTH_CHECK_TIMEOUT_MS = 90_000;

/** Check if error is due to timeout or backend unreachable (e.g. cold start). Used for login pre-warm messaging. */
export function isTimeoutOrNetworkError(error: unknown): boolean {
  if (error == null) return false;
  const err = error as { name?: string; code?: string; message?: string };
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  return (
    err.name === 'AbortError' ||
    err.code === 'ECONNABORTED' ||
    err.code === 'ERR_NETWORK' ||
    msg === 'network error' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('cannot reach') ||
    msg.includes('reachable')
  );
}

export function getToken(): string | null {
  try {
    // Prefer sessionStorage so closing the tab/window logs the user out,
    // mirroring Rayenna CRM behaviour.
    const sessionToken = window.sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) return sessionToken;

    // Backwards compatibility: if an old token exists in localStorage, migrate it.
    const legacyToken = window.localStorage.getItem(TOKEN_KEY);
    if (legacyToken) {
      try {
        window.sessionStorage.setItem(TOKEN_KEY, legacyToken);
        window.localStorage.removeItem(TOKEN_KEY);
      } catch (e) {
        reportStorageFailure(TOKEN_KEY, e);
      }
      return legacyToken;
    }

    return null;
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
    // Ensure any legacy localStorage value is cleared.
    window.localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    reportStorageFailure(TOKEN_KEY, e);
  }
}

export function clearToken(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_ID_KEY);
    window.sessionStorage.removeItem(USER_ROLE_KEY);
    window.sessionStorage.removeItem(USER_NAME_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function setUserId(userId: string): void {
  try {
    window.sessionStorage.setItem(USER_ID_KEY, userId);
  } catch (e) {
    reportStorageFailure(USER_ID_KEY, e);
  }
}

export function setUserRole(role: string): void {
  try {
    window.sessionStorage.setItem(USER_ROLE_KEY, role);
  } catch (e) {
    reportStorageFailure(USER_ROLE_KEY, e);
  }
}

export function setUserName(name: string): void {
  try {
    window.sessionStorage.setItem(USER_NAME_KEY, name);
  } catch (e) {
    reportStorageFailure(USER_NAME_KEY, e);
  }
}

/** Current user display name (prefers sessionStorage, falls back to JWT email). */
export function getCurrentUserName(): string | null {
  try {
    const name = window.sessionStorage.getItem(USER_NAME_KEY);
    if (name) return name;
    const token = getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { name?: string; email?: string };
    const fallback = payload.name ?? payload.email ?? null;
    if (fallback) {
      window.sessionStorage.setItem(USER_NAME_KEY, fallback);
      return fallback;
    }
    return null;
  } catch {
    return null;
  }
}

/** True if the current user can edit Costing/BOM/ROI/Proposal artifacts (SALES, ADMIN only). Ops/Finance/Management are read-only. */
export function canEditProposalArtifacts(): boolean {
  const role = getCurrentUserRole();
  return role != null && ['ADMIN', 'SALES'].includes(String(role).toUpperCase());
}

/** Admin-only: remove saved proposal / full PE kit on the server. */
export function canDeleteProposalEngineArtifacts(): boolean {
  const role = getCurrentUserRole();
  return role != null && String(role).toUpperCase() === 'ADMIN';
}

/** Current user role (SALES, ADMIN, OPERATIONS, MANAGEMENT, FINANCE) for access control. */
export function getCurrentUserRole(): string | null {
  try {
    let role = window.sessionStorage.getItem(USER_ROLE_KEY);
    if (role) return role;
    const token = getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { role?: string };
    role = payload.role ?? null;
    if (role) {
      window.sessionStorage.setItem(USER_ROLE_KEY, role);
      return role;
    }
    return null;
  } catch {
    return null;
  }
}

/** Current user id for scoping localStorage (customers/proposals per user). Uses sessionStorage or decodes JWT as fallback. */
export function getCurrentUserId(): string | null {
  try {
    let uid = window.sessionStorage.getItem(USER_ID_KEY);
    if (uid) return uid;
    const token = getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { userId?: string; sub?: string };
    uid = payload.userId ?? payload.sub ?? null;
    if (uid) {
      window.sessionStorage.setItem(USER_ID_KEY, uid);
      return uid;
    }
    return null;
  } catch {
    return null;
  }
}

function handleUnauthorized() {
  clearToken();
  // Hard redirect so any in-memory state is reset
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions extends Omit<RequestInit, 'method'> {
  method?: ApiMethod;
  /** When false, omits Authorization header even if a token exists. */
  auth?: boolean;
}

export async function apiFetch<TResponse = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const method: ApiMethod = options.method ?? 'GET';
  const auth = options.auth ?? true;

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const headers = new Headers(options.headers ?? {});

  if (!headers.has('Content-Type') && method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  const text = await response.text();
  let parsed: TResponse;
  try {
    parsed = (text ? JSON.parse(text) : undefined) as TResponse;
  } catch {
    parsed = text as unknown as TResponse;
  }

  if (!response.ok) {
    const errMsg =
      (parsed as { error?: string })?.error ||
      (parsed as { message?: string })?.message ||
      response.statusText ||
      `Request failed (${response.status})`;
    throw new Error(errMsg);
  }

  return parsed;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function loginWithEmailPassword(email: string, password: string): Promise<LoginResponse> {
  try {
    const data = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    });

    if (!data?.token) {
      throw new Error('Login succeeded but no token was returned by the CRM backend.');
    }

    return data;
  } catch (err: any) {
    // Normalize network failures (e.g. backend down / wrong VITE_API_BASE_URL / CORS)
    const rawMsg = String(err?.message || '');
    if (rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('networkerror')) {
      const base = API_BASE_URL || window.location.origin;
      throw new Error(`Cannot reach CRM backend from Proposal Engine. Check the backend is running and reachable. (Base: ${base})`);
    }
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// AI Roof Segmentation & Layout
// ───────────────────────────────────────────────────────────────────────────────

export interface AiRoofLayoutPolygonPoint {
  x: number;
  y: number;
}

export interface AiRoofLayoutPanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AiRoofLayoutResponse {
  roof_area_m2: number;
  usable_area_m2: number;
  panel_count: number;
  layout_image_url: string;
  /** Server-persisted 3D simulation image (when saved). */
  layout_image_3d_url?: string;
  /** Proposal embed uses 3D URL when true and `layout_image_3d_url` is set. */
  prefer_3d_for_proposal?: boolean;
  roof_polygon_coordinates?: AiRoofLayoutPolygonPoint[];
  panel_coordinates?: AiRoofLayoutPanelRect[];
}

export async function generateAiRoofLayout(params: {
  projectId: string;
  latitude: number;
  longitude: number;
  systemSizeKw: number;
  panelWattage: number;
}): Promise<AiRoofLayoutResponse> {
  return apiFetch<AiRoofLayoutResponse>('/api/roof/ai-layout', {
    method: 'POST',
    body: JSON.stringify({
      projectId: params.projectId,
      latitude: params.latitude,
      longitude: params.longitude,
      systemSizeKw: params.systemSizeKw,
      panelWattage: params.panelWattage,
    }),
  });
}

export async function saveManualRoofLayoutImage(params: {
  projectId: string;
  dataUrl: string;
  roof_area_m2?: number;
  usable_area_m2?: number;
  panel_count?: number;
}): Promise<{ layout_image_url: string }> {
  return apiFetch<{ layout_image_url: string }>('/api/roof/save-layout-image', {
    method: 'POST',
    body: JSON.stringify({
      projectId: params.projectId,
      dataUrl: params.dataUrl,
      roof_area_m2: params.roof_area_m2,
      usable_area_m2: params.usable_area_m2,
      panel_count: params.panel_count,
    }),
  });
}

/** Persist 3D export to CRM; does not replace the 2D layout URL. */
export async function saveRoofLayout3dImage(params: {
  projectId: string;
  dataUrl: string;
  /** When true (e.g. Save to Proposal with 3D), proposal PDF uses the 3D image. */
  setPreferForProposal?: boolean;
  roof_area_m2?: number;
  usable_area_m2?: number;
  panel_count?: number;
}): Promise<{ layout_image_3d_url: string; prefer_3d_for_proposal: boolean }> {
  return apiFetch<{ layout_image_3d_url: string; prefer_3d_for_proposal: boolean }>(
    '/api/roof/save-3d-layout-image',
    {
      method: 'POST',
      body: JSON.stringify({
        projectId: params.projectId,
        dataUrl: params.dataUrl,
        set_prefer_for_proposal: params.setPreferForProposal === true,
        roof_area_m2: params.roof_area_m2,
        usable_area_m2: params.usable_area_m2,
        panel_count: params.panel_count,
      }),
    },
  );
}

export async function fetchManualRoofLayout(projectId: string): Promise<{
  roof_area_m2: number;
  usable_area_m2: number;
  panel_count: number;
  layout_image_url: string;
  layout_image_3d_url?: string;
  prefer_3d_for_proposal?: boolean;
  savedAt?: string;
}> {
  return apiFetch(`/api/roof/manual-layout/${encodeURIComponent(projectId)}`);
}

export async function setRoofLayoutEmbedPreference(
  projectId: string,
  prefer3d: boolean,
): Promise<{ ok: boolean; prefer_3d_for_proposal: boolean }> {
  return apiFetch('/api/roof/set-layout-embed-preference', {
    method: 'POST',
    body: JSON.stringify({ projectId, prefer_3d_for_proposal: prefer3d }),
  });
}

// Minimal CRM project payload needed for AI layout
export interface CrmProjectForAiLayout {
  id: string;
  systemCapacity?: number | null;
  panelCapacityW?: number | null;
  customer: {
    id: string;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export async function fetchCrmProjectForAiLayout(projectId: string): Promise<CrmProjectForAiLayout> {
  // Reuse existing authenticated /api/projects/:id endpoint
  return apiFetch<CrmProjectForAiLayout>(`/api/projects/${projectId}`);
}

// ─────────────────────────────────────────────
// Proposal Engine – CRM Projects
// ─────────────────────────────────────────────

import type {
  CostingArtifact,
  BomArtifact,
  RoiArtifact,
  ProposalArtifact,
  CustomerRecord,
  CustomerMaster,
} from './customerStore';
import { deriveProposalStatusFromArtifacts, formatEmailForDisplay } from './customerStore';

export interface ProposalEngineProjectFromApi {
  id: string;
  slNo?: number | null;
  projectStatus?: string | null;
  projectStage?: string | null;
  /** Panel wattage (W), from CRM project when available */
  panelCapacityW?: number | null;
  /** Proposal Engine status computed by backend for selected projects. */
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

/** Selected projects list (Sales: own selections; Ops/Finance/Management/Admin: all selections). */
export async function fetchProposalEngineProjects(limit?: number): Promise<ProposalEngineProjectFromApi[]> {
  const qs = typeof limit === 'number' && Number.isFinite(limit)
    ? `?limit=${Math.max(1, Math.floor(limit))}`
    : '';
  return apiFetch<ProposalEngineProjectFromApi[]>(`/api/proposal-engine/projects${qs}`);
}

/** Eligible CRM projects that can be selected into Proposal Engine. */
export async function fetchProposalEngineEligibleProjects(): Promise<ProposalEngineProjectFromApi[]> {
  return apiFetch<ProposalEngineProjectFromApi[]>('/api/proposal-engine/projects/eligible');
}

/** Mark a CRM project as selected into Proposal Engine (Admin or owning Sales). */
export async function selectProposalEngineProject(projectId: string): Promise<void> {
  await apiFetch(`/api/proposal-engine/projects/${projectId}/select`, { method: 'POST' });
}

/** Admin-only: clear (hide) all PROPOSAL/CONFIRMED projects from Proposal Engine. Does not touch frontend templates. */
export async function adminClearProposalEngineList(): Promise<{ clearedProjects: number }> {
  return apiFetch<{ clearedProjects: number }>('/api/proposal-engine/admin/clear', {
    method: 'POST',
  });
}

/** Admin-only: restore all projects hidden via global removal marker. */
export async function adminRestoreProposalEngineHidden(): Promise<{ restoredProjects: number }> {
  return apiFetch<{ restoredProjects: number }>('/api/proposal-engine/admin/unhide-all', {
    method: 'POST',
  });
}

// ─────────────────────────────────────────────
// Proposal Engine – Artifact sync helpers
// NOTE: These are best-effort fire-and-forget helpers. The UI continues to
// rely on localStorage / customerStore as the primary UX state. Backend sync
// errors are logged but do not block local saves.
// ─────────────────────────────────────────────

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
    }
  });
}

export async function syncProjectBom(
  projectId: string,
  artifact: BomArtifact,
): Promise<void> {
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
    }
  });
}

export async function syncProjectRoi(
  projectId: string,
  artifact: RoiArtifact,
): Promise<void> {
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
    }
  });
}

/** Remove project from Proposal Engine for everyone (Admin or owning Sales). Deletes all PE artifacts server-side. */
export async function deleteProjectFromProposalEngine(projectId: string): Promise<void> {
  await apiFetch(`/api/proposal-engine/projects/${projectId}`, {
    method: 'DELETE',
  });
}

/** Clear only the Proposal artifact for a project (Admin or owning Sales). */
export async function clearProjectProposalArtifact(projectId: string): Promise<void> {
  await apiFetch(`/api/proposal-engine/projects/${projectId}/proposal`, {
    method: 'DELETE',
  });
}

// ─────────────────────────────────────────────
// Proposal Engine – Shared Costing Templates
// ─────────────────────────────────────────────

export interface CostingTemplateDto {
  id: string;
  name: string;
  description?: string | null;
  items: any[];
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
  items: any[];
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

// ─────────────────────────────────────────────────────────────────────────────
// Share proposal as link
// ─────────────────────────────────────────────────────────────────────────────

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

/** Fetch shared proposal by token (public; no auth). */
export async function getSharedProposal(
  token: string,
  password?: string,
): Promise<{ html: string; refNumber?: string; expiresAt: string }> {
  const base = API_BASE_URL || '';
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
    }
  });
}

// ─────────────────────────────────────────────
// Read-back: fetch project + artifacts from CRM backend
// Used to hydrate the PE UI when opening a project (e.g. from another device).
// ─────────────────────────────────────────────

/** Backend GET /api/proposal-engine/projects/:id response shape */
export interface ProposalEngineProjectDetailResponse {
  project: ProposalEngineProjectFromApi;
  artifacts: {
    costing: ApiCostingArtifact | null;
    bom: ApiBomArtifact | null;
    roi: ApiRoiArtifact | null;
    proposal: ApiProposalArtifact | null;
  };
}

interface ApiCostingArtifact {
  sheetName: string;
  items: unknown;
  showGst: boolean;
  marginPct: number;
  grandTotal: number;
  systemSizeKw: number;
  savedAt: string;
}

interface ApiBomArtifact {
  rows: unknown;
  savedAt: string;
}

interface ApiRoiArtifact {
  result: unknown;
  savedAt: string;
}

interface ApiProposalArtifact {
  refNumber: string;
  generatedAt: string;
  bomComments?: Record<string, string> | null;
  editedHtml?: string | null;
  textOverrides?: Record<string, string | undefined> | null;
  proposalView?: unknown;
  summary?: string | null;
  includeRoofLayout?: boolean | null;
  roofLayout?: {
    roof_area_m2: number;
    usable_area_m2: number;
    panel_count: number;
    layout_image_url: string;
    layout_image_3d_url?: string;
    prefer_3d_for_proposal?: boolean;
    savedAt?: string;
  } | null;
  savedAt: string;
}

export async function fetchProjectWithArtifacts(
  projectId: string,
): Promise<ProposalEngineProjectDetailResponse> {
  return apiFetch<ProposalEngineProjectDetailResponse>(
    `/api/proposal-engine/projects/${projectId}`,
  );
}

/** Map backend artifacts to frontend CustomerRecord artifact shape */
export function mapApiArtifactsToRecord(artifacts: ProposalEngineProjectDetailResponse['artifacts']): {
  costing: CostingArtifact | null;
  bom: BomArtifact | null;
  roi: RoiArtifact | null;
  proposal: ProposalArtifact | null;
} {
  return {
    costing: artifacts.costing
      ? {
          sheetName: artifacts.costing.sheetName,
          savedAt: artifacts.costing.savedAt,
          items: Array.isArray(artifacts.costing.items) ? artifacts.costing.items as CostingArtifact['items'] : [],
          showGst: artifacts.costing.showGst,
          marginPercent: artifacts.costing.marginPct,
          grandTotal: artifacts.costing.grandTotal,
          totalGst: 0,
          systemSizeKw: artifacts.costing.systemSizeKw ?? 0,
        }
      : null,
    bom: artifacts.bom
      ? {
          savedAt: artifacts.bom.savedAt,
          rows: Array.isArray(artifacts.bom.rows) ? artifacts.bom.rows as BomArtifact['rows'] : [],
        }
      : null,
    roi: artifacts.roi
      ? {
          savedAt: artifacts.roi.savedAt,
          result: artifacts.roi.result as RoiArtifact['result'],
        }
      : null,
    proposal: artifacts.proposal
      ? {
          refNumber: artifacts.proposal.refNumber,
          generatedAt: typeof artifacts.proposal.generatedAt === 'string'
            ? artifacts.proposal.generatedAt
            : new Date(artifacts.proposal.generatedAt).toISOString(),
          summary: artifacts.proposal.summary ?? '',
          bomComments: artifacts.proposal.bomComments ?? undefined,
          editedHtml: artifacts.proposal.editedHtml ?? undefined,
          textOverrides: artifacts.proposal.textOverrides ?? undefined,
          proposalView: artifacts.proposal.proposalView ?? undefined,
          includeRoofLayout: !!artifacts.proposal.includeRoofLayout,
          roofLayout: artifacts.proposal.roofLayout
            ? {
                roof_area_m2: artifacts.proposal.roofLayout.roof_area_m2,
                usable_area_m2: artifacts.proposal.roofLayout.usable_area_m2,
                panel_count: artifacts.proposal.roofLayout.panel_count,
                layout_image_url: artifacts.proposal.roofLayout.layout_image_url,
                layout_image_3d_url: artifacts.proposal.roofLayout.layout_image_3d_url,
                prefer_3d_for_proposal: artifacts.proposal.roofLayout.prefer_3d_for_proposal,
              }
            : null,
        }
      : null,
  };
}

// ─────────────────────────────────────────────
// Merge CRM project + artifacts into local CustomerRecord (cross-device / fresh stage)
// ─────────────────────────────────────────────

function derivePeCustomerDisplayName(c: ProposalEngineProjectFromApi['customer'] | null | undefined): string {
  if (!c) return '';
  if (c.customerName && c.customerName.trim()) return c.customerName.trim();
  const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  const companyName = (c as { companyName?: string }).companyName;
  if (companyName && companyName.trim()) return companyName.trim();
  return '';
}

function derivePeContactNumber(c: ProposalEngineProjectFromApi['customer'] | null | undefined): string {
  if (!c) return '';
  if (c.contactNumbers && c.contactNumbers.trim()) {
    try {
      const parsed = JSON.parse(c.contactNumbers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return String(parsed.join(', ')).trim();
      }
      return c.contactNumbers.trim();
    } catch {
      return c.contactNumbers.trim();
    }
  }
  return (c.phone ?? '').trim();
}

/**
 * Apply GET /api/proposal-engine/projects/:id onto a local record so CRM fields (especially
 * `projectStage`) and server artifacts stay in sync when the user changes the project in CRM.
 */
export function applyProposalEngineProjectDetail(
  existing: CustomerRecord,
  detail: ProposalEngineProjectDetailResponse,
): CustomerRecord {
  const p = detail.project as ProposalEngineProjectFromApi;
  const cust = p.customer ?? ({} as NonNullable<ProposalEngineProjectFromApi['customer']>);
  const projectStageRaw = p.projectStatus ?? p.projectStage;
  const projectStage =
    projectStageRaw != null && String(projectStageRaw).trim() !== ''
      ? String(projectStageRaw).trim().toUpperCase()
      : existing.master.projectStage;

  const displayName = derivePeCustomerDisplayName(p.customer);
  const siteAddress =
    (p.siteAddress ?? '').trim() ||
    [cust.addressLine1, cust.addressLine2, cust.city, cust.state, cust.pinCode]
      .filter(Boolean)
      .map((part) => String(part).trim())
      .join(', ');

  const master: CustomerMaster = {
    ...existing.master,
    name: displayName || existing.master.name,
    location: siteAddress || (cust.city ?? '').trim() || existing.master.location,
    contactPerson: (cust.contactPerson ?? '').trim() || existing.master.contactPerson,
    phone: derivePeContactNumber(p.customer) || existing.master.phone,
    email: formatEmailForDisplay(cust.email ?? '') || existing.master.email,
    crmCustomerId: cust.id || existing.master.crmCustomerId,
    crmProjectId: p.id || existing.master.crmProjectId,
    systemSizeKw: typeof p.systemCapacity === 'number' ? p.systemCapacity : existing.master.systemSizeKw,
    customerNumber: (cust.customerId ?? '').trim() || existing.master.customerNumber,
    projectNumber: typeof p.slNo === 'number' ? p.slNo : existing.master.projectNumber,
    consumerNumber: (cust.consumerNumber ?? '').trim() || existing.master.consumerNumber,
    segment: ((cust.customerType ?? p.type) ?? '').trim() || existing.master.segment,
    salespersonName: (p.salesperson?.name ?? '').trim() || existing.master.salespersonName,
    projectStage: projectStage ?? existing.master.projectStage,
    panelType: (p.panelType ?? '').trim() || existing.master.panelType,
    latitude: typeof cust.latitude === 'number' ? cust.latitude : existing.master.latitude,
    longitude: typeof cust.longitude === 'number' ? cust.longitude : existing.master.longitude,
    panelWattage: typeof p.panelCapacityW === 'number' ? p.panelCapacityW : existing.master.panelWattage,
  };

  const fromApi = mapApiArtifactsToRecord(detail.artifacts);
  const merged: CustomerRecord = {
    ...existing,
    updatedAt: new Date().toISOString(),
    master,
    costing: fromApi.costing ?? existing.costing,
    bom: fromApi.bom ?? existing.bom,
    roi: fromApi.roi ?? existing.roi,
    proposal: fromApi.proposal ?? existing.proposal,
  };
  return {
    ...merged,
    status: deriveProposalStatusFromArtifacts(merged),
  };
}

