import type { User } from '@bolpay/shared';

const TOKEN_KEY = 'bolpay.token';
const USER_KEY = 'bolpay.user';

/** A persisted BolPay session: JWT plus the authenticated user. */
export interface StoredSession {
  token: string;
  user: User;
}

/** Read the saved session from localStorage, or null if absent/corrupt. */
export function loadSession(): StoredSession | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) as User };
  } catch {
    return null;
  }
}

/** Persist the session (token and user) to localStorage. */
export function saveSession(session: StoredSession) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

/** Remove the stored session (token and user) from localStorage. */
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Return the stored JWT, or null when there is no session. */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
