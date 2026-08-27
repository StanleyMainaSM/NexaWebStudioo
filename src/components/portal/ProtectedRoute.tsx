import { useEffect, useState } from 'react';
import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRoles?: string[];
  requiresConnectorTerms?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredRoles,
  requiresConnectorTerms = false,
}: ProtectedRouteProps) {
  const { user, loading, roles, rolesLoading } = useAuth();
  const location = useLocation();
  const [connectorAccessLoading, setConnectorAccessLoading] = useState(requiresConnectorTerms);
  const [connectorAccessAllowed, setConnectorAccessAllowed] = useState(!requiresConnectorTerms);

  useEffect(() => {
    if (!requiresConnectorTerms || !user) {
      setConnectorAccessLoading(false);
      setConnectorAccessAllowed(!requiresConnectorTerms);
      return;
    }

    let mounted = true;

    const checkConnectorAccess = async () => {
      setConnectorAccessLoading(true);

      try {
        const { data, error } = await supabase
          .from('connector_profiles')
          .select('is_active, terms_accepted_at, terms_version')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!mounted) return;

        setConnectorAccessAllowed(Boolean(
          data?.is_active && data?.terms_accepted_at && data?.terms_version,
        ));
      } catch (error) {
        console.error('Connector access check failed:', error);
        if (mounted) setConnectorAccessAllowed(false);
      } finally {
        if (mounted) setConnectorAccessLoading(false);
      }
    };

    void checkConnectorAccess();

    return () => {
      mounted = false;
    };
  }, [requiresConnectorTerms, user?.id]);

  if (loading || (user && rolesLoading) || connectorAccessLoading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!requiredRoles || requiredRoles.length === 0) {
    return children ? <>{children}</> : <Outlet />;
  }

  const normalizedUserRoles = roles
    .map((role) => String(role).trim().toLowerCase())
    .filter(Boolean);

  const normalizedRequiredRoles = requiredRoles
    .map((role) => String(role).trim().toLowerCase())
    .filter(Boolean);

  const hasRequiredRole = normalizedRequiredRoles.some((role) =>
    normalizedUserRoles.includes(role),
  );

  if (!hasRequiredRole) {
    return <Navigate to="/portal" replace />;
  }

  if (requiresConnectorTerms && !connectorAccessAllowed) {
    return <Navigate to="/portal/connector/terms" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
