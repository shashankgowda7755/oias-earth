import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Gate for authenticated routes. Unauthenticated users are redirected to "/"
 * (the login screen). `replace` so the protected URL doesn't pollute history.
 */
export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  // Role-gated route (e.g. the admin dashboard): a disallowed role (Planter) is
  // sent to the field app, never the admin surface.
  if (roles && !roles.includes(role ?? '')) {
    return <Navigate to="/field" replace />;
  }
  return <>{children}</>;
}
