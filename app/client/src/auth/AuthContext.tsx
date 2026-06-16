/**
 * Auth context: holds the current session, exposes signIn / signOut, and
 * persists to localStorage (token, role, profileId, userDetailsData) exactly
 * as the original app did (spec _meta.authObserved.tokenStorage).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  login as apiLogin,
  type LoginResponse,
} from '../lib/api';
import {
  clearSession,
  getStoredSession,
  persistSession,
  type AuthSession,
  type UserDetails,
} from '../lib/auth-storage';

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  role: string | null;
  /** Throws on failure (caller renders the inline error). */
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Pull token/role/profileId/user out of the (loosely typed) login response. */
function sessionFromLogin(resp: LoginResponse): AuthSession {
  const user: UserDetails | null = resp.user ?? null;
  const role = resp.role ?? user?.role ?? null;
  const profileId =
    resp.profileId ??
    (user?.profileId as string | undefined) ??
    (user?.id != null ? String(user.id) : null);

  return {
    token: resp.token,
    role,
    profileId,
    userDetails: user,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredSession(),
  );

  const signIn = useCallback(async (username: string, password: string) => {
    const resp = await apiLogin(username, password);
    if (!resp?.token) {
      throw new Error('Login did not return a token.');
    }
    const next = sessionFromLogin(resp);
    persistSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      role: session?.role ?? null,
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}
