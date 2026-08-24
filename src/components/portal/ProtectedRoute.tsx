import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({
  children,
  requiredRoles,
}: ProtectedRouteProps) {
  const {
    user,
    loading,
    roles,
    rolesLoading,
  } = useAuth();

  const location = useLocation();

  /*
   * Wait for both authentication and role loading to finish.
   * This prevents an authenticated user from being redirected
   * while their roles are still being retrieved.
   */
  if (loading || (user && rolesLoading)) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
      </div>
    );
  }

  /*
   * No authenticated Supabase session.
   */
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  /*
   * If this route does not specify roles, authentication alone
   * is sufficient.
   */
  if (!requiredRoles || requiredRoles.length === 0) {
    return children ? <>{children}</> : <Outlet />;
  }

  /*
   * Normalize the role values before comparing them.
   */
  const normalizedUserRoles = roles
    .map((role) =>
      String(role).trim().toLowerCase()
    )
    .filter(Boolean);

  const normalizedRequiredRoles = requiredRoles
    .map((role) =>
      String(role).trim().toLowerCase()
    )
    .filter(Boolean);

  /*
   * IMPORTANT:
   *
   * Roles are intentionally independent.
   *
   * Being an Owner does NOT automatically make the user an
   * Operator, Connector, Admin, or Client for role-specific
   * routes.
   *
   * If a route should allow Owner access, that route explicitly
   * includes "owner" in requiredRoles.
   */
  const hasRequiredRole =
    normalizedRequiredRoles.some((role) =>
      normalizedUserRoles.includes(role)
    );

  if (!hasRequiredRole) {
    return <Navigate to="/portal" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
