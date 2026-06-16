/**
 * localStorage keys + typed accessors for the auth session.
 *
 * The original app stored: token, role, profileId, userDetailsData (JSON),
 * forestUniqueId, ForestID (spec _meta.authObserved.tokenStorage). We persist
 * the same core set. forestUniqueId / ForestID are only meaningful inside the
 * forest module, so module agents may write them via setSessionItem.
 */

export const STORAGE_KEYS = {
  token: 'token',
  role: 'role',
  profileId: 'profileId',
  userDetails: 'userDetailsData',
} as const;

export interface UserDetails {
  // Login response user object shape is an OPEN QUESTION (spec openQuestions[1]):
  // token is confirmed, the user object fields are not captured. We keep this
  // permissive and only rely on fields when present.
  id?: string | number;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  role?: string;
  profileId?: string;
  [key: string]: unknown;
}

export interface AuthSession {
  token: string;
  role: string | null;
  profileId: string | null;
  userDetails: UserDetails | null;
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function getStoredSession(): AuthSession | null {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (!token) return null;

  let userDetails: UserDetails | null = null;
  const raw = localStorage.getItem(STORAGE_KEYS.userDetails);
  if (raw) {
    try {
      userDetails = JSON.parse(raw) as UserDetails;
    } catch {
      userDetails = null;
    }
  }

  return {
    token,
    role: localStorage.getItem(STORAGE_KEYS.role),
    profileId: localStorage.getItem(STORAGE_KEYS.profileId),
    userDetails,
  };
}

export function persistSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEYS.token, session.token);
  if (session.role != null) localStorage.setItem(STORAGE_KEYS.role, session.role);
  if (session.profileId != null) localStorage.setItem(STORAGE_KEYS.profileId, session.profileId);
  if (session.userDetails != null) {
    localStorage.setItem(STORAGE_KEYS.userDetails, JSON.stringify(session.userDetails));
  }
}

export function clearSession(): void {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  // Forest-scoped extras the original app also set.
  localStorage.removeItem('forestUniqueId');
  localStorage.removeItem('ForestID');
}
