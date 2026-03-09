import * as Sentry from '@sentry/react';

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
      window.sessionStorage.setItem(TOKEN_KEY, legacyToken);
      window.localStorage.removeItem(TOKEN_KEY);
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
  } catch {
    // ignore quota / storage errors
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
  } catch {
    // ignore
  }
}

export function setUserRole(role: string): void {
  try {
    window.sessionStorage.setItem(USER_ROLE_KEY, role);
  } catch {
    // ignore
  }
}

export function setUserName(name: string): void {
  try {
    window.sessionStorage.setItem(USER_NAME_KEY, name);
  } catch {
    // ignore
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
  if (!text) {
    // No body
    return undefined as TResponse;
  }

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    // Non-JSON response
    return text as unknown as TResponse;
  }
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

// ─────────────────────────────────────────────
// Proposal Engine – CRM Projects
// ─────────────────────────────────────────────

import type {
  CostingArtifact,
  BomArtifact,
  RoiArtifact,
  ProposalArtifact,
} from './customerStore';

export interface ProposalEngineProjectFromApi {
  id: string;
  slNo?: number | null;
  projectStatus?: string | null;
  projectStage?: string | null;
  /** Proposal Engine status computed by backend for selected projects. */
  peStatus?: 'draft' | 'proposal-ready' | string;
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
  };
}

/** Selected projects list (Sales: own selections; Ops/Finance/Management/Admin: all selections). */
export async function fetchProposalEngineProjects(): Promise<ProposalEngineProjectFromApi[]> {
  return apiFetch<ProposalEngineProjectFromApi[]>('/api/proposal-engine/projects');
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

export async function syncProjectCosting(
  projectId: string,
  artifact: CostingArtifact,
): Promise<void> {
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
      Sentry.captureException(err, { tags: { sync: 'costing' } });
    }
  }
}

export async function syncProjectBom(
  projectId: string,
  artifact: BomArtifact,
): Promise<void> {
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
      Sentry.captureException(err, { tags: { sync: 'bom' } });
    }
  }
}

export async function syncProjectRoi(
  projectId: string,
  artifact: RoiArtifact,
): Promise<void> {
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
      Sentry.captureException(err, { tags: { sync: 'roi' } });
    }
  }
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

export async function syncProjectProposal(
  projectId: string,
  artifact: ProposalArtifact,
): Promise<void> {
  try {
    await apiFetch(`/api/proposal-engine/projects/${projectId}/proposal`, {
      method: 'PUT',
      body: JSON.stringify({
        refNumber: artifact.refNumber,
        generatedAt: artifact.generatedAt,
        bomComments: artifact.bomComments ?? null,
        editedHtml: artifact.editedHtml ?? null,
        textOverrides: artifact.textOverrides ?? null,
        summary: artifact.summary ?? null,
      }),
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Failed to sync proposal artifact to CRM backend:', err);
    } else {
      Sentry.captureException(err, { tags: { sync: 'proposal' } });
    }
  }
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
  summary?: string | null;
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
        }
      : null,
  };
}

