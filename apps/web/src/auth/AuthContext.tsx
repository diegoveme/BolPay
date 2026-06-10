/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePollar } from '@pollar/react';
import type { AuthResponse, LoginRequest, User } from '@bolpay/shared';
import { api } from '@/lib/api';
import {
  clearSession,
  loadSession,
  saveSession,
  type StoredSession,
} from '@/lib/session';

interface AuthContextValue {
  /** BolPay session (JWT + user). Null until /auth/login succeeds. */
  session: StoredSession | null;
  user: User | null;
  /** Exchange the Pollar identity for a BolPay session. */
  loginToBackend: (payload: LoginRequest) => Promise<User>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => loadSession());
  const pollar = usePollar();

  const loginToBackend = useCallback(async (payload: LoginRequest) => {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    const next = { token: data.accessToken, user: data.user };
    saveSession(next);
    setSession(next);
    return data.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get<User>('/auth/me');
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user: data };
      saveSession(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    // Also drop the Pollar session so the next login starts clean.
    try {
      pollar.logout();
    } catch {
      /* pollar session may already be gone */
    }
  }, [pollar]);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loginToBackend, refreshUser, logout }),
    [session, loginToBackend, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
