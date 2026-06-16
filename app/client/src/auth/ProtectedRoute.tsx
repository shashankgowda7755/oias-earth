import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Gate for authenticated routes. Unauthenticated users are redirected to "/"
 * (the login screen). `replace` so the protected URL doesn't pollute history.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
