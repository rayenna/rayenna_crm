import { reportStorageFailure } from '../safeLocalStorage';

const TOKEN_KEY = 'pe_jwt';
const USER_ID_KEY = 'pe_user_id';
const USER_ROLE_KEY = 'pe_user_role';
const USER_NAME_KEY = 'pe_user_name';

export function getToken(): string | null {
  try {
    const sessionToken = window.sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) return sessionToken;

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

export function canEditProposalArtifacts(): boolean {
  const role = getCurrentUserRole();
  return role != null && ['ADMIN', 'SALES'].includes(String(role).toUpperCase());
}

export function canDeleteProposalEngineArtifacts(): boolean {
  const role = getCurrentUserRole();
  return role != null && String(role).toUpperCase() === 'ADMIN';
}

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

export function handleUnauthorized(): void {
  clearToken();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}
