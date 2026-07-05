import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '@bolpay/shared';
import { useAuth } from './AuthContext';

/** Redirects to /login when there is no BolPay session. */
export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Restricts a subtree to specific roles (admins always pass). */
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'administrator' && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
