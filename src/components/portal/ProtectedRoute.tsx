import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
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
   * Wait until authentication and role
   * resolution have both completed.
   */
  if (
    loading ||
    (user && rolesLoading)
  ) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
      </div>
    );
  }

  /*
   * No authenticated session.
   */
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  /*
   * Authentication-only route.
   *
   * This is used by the main client portal.
   */
  if (
    !requiredRoles ||
    requiredRoles.length === 0
  ) {
    return children ? (
      <>{children}</>
    ) : (
      <Outlet />
    );
  }

  /*
   * Normalize both the user's roles and
   * the roles required by the route.
   */
  const normalizedUserRoles =
    roles
      .map((role) =>
        String(role)
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);

  const normalizedRequiredRoles =
    requiredRoles
      .map((role) =>
        String(role)
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);

  /*
   * Role separation remains strict.
   *
   * A user only receives access when one of
   * their actual assigned roles matches the
   * role required by the route.
   *
   * Owner is NOT automatically treated as:
   * - admin
   * - operator
   * - connector
   * - client
   *
   * Routes must explicitly grant Owner access
   * where appropriate.
   */
  const hasRequiredRole =
    normalizedRequiredRoles.some(
      (role) =>
        normalizedUserRoles.includes(role)
    );

  if (!hasRequiredRole) {
    /*
     * The user is authenticated but does not
     * have permission for this route.
     *
     * Send them to the main portal instead
     * of exposing another role's dashboard.
     */
    return (
      <Navigate
        to="/portal"
        replace
      />
    );
  }

  return children ? (
    <>{children}</>
  ) : (
    <Outlet />
  );
}
