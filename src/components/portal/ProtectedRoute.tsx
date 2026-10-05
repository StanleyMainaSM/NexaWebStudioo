import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import CreationAccessGate from './CreationAccessGate';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children?: ReactNode;
  requiredRoles?: string[];
  requiresConnectorTerms?: boolean;
  accessGate?: 'creation' | 'none';
}

const CONNECTOR_TERMS_CHECK_ATTEMPTS = 3;
const CONNECTOR_TERMS_RETRY_DELAY_MS = 500;

export default function ProtectedRoute({
  children,
  requiredRoles,
  requiresConnectorTerms = false,
  accessGate = 'none',
}: ProtectedRouteProps) {
  const { user, loading, roles, rolesLoading } = useAuth();
  const location = useLocation();
  const [memberAccessLoading, setMemberAccessLoading] = useState(true);
  const [memberActive, setMemberActive] = useState(false);
  const [connectorAccessLoading, setConnectorAccessLoading] = useState(requiresConnectorTerms);
  const [connectorAccessAllowed, setConnectorAccessAllowed] = useState(!requiresConnectorTerms);
  const [connectorAccessCheckKey, setConnectorAccessCheckKey] = useState(0);

  useEffect(() => {
    if (!user) {
      setMemberAccessLoading(false);
      setMemberActive(false);
      return;
    }

    let mounted = true;
    const checkMemberAccess = async () => {
      setMemberAccessLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (mounted) setMemberActive(data?.is_active !== false);
      } catch (error) {
        console.error('Member access check failed:', error);
        if (mounted) setMemberActive(false);
      } finally {
        if (mounted) setMemberAccessLoading(false);
      }
    };

    void checkMemberAccess();
    return () => { mounted = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!requiresConnectorTerms || !user || !memberActive) {
      setConnectorAccessLoading(false);
      setConnectorAccessAllowed(!requiresConnectorTerms && memberActive);
      return;
    }

    let mounted = true;
    let retryTimer: number | null = null;

    const checkConnectorTerms = async () => {
      setConnectorAccessLoading(true);

      for (let attempt = 1; attempt <= CONNECTOR_TERMS_CHECK_ATTEMPTS; attempt += 1) {
        if (!mounted) return;

        try {
          const { data, error } = await supabase
            .from('connector_profiles')
            .select('is_active, terms_accepted_at, terms_version')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;

          const accepted = Boolean(
            data?.is_active &&
            data?.terms_accepted_at &&
            data?.terms_version
          );

          if (accepted) {
            if (mounted) {
              setConnectorAccessAllowed(true);
              setConnectorAccessLoading(false);
            }
            return;
          }

          // A newly authenticated Supabase session can briefly settle before
          // the first authenticated table read is consistent. Confirm a
          // missing acceptance more than once before redirecting.
          if (attempt < CONNECTOR_TERMS_CHECK_ATTEMPTS) {
            await new Promise<void>((resolve) => {
              retryTimer = window.setTimeout(resolve, CONNECTOR_TERMS_RETRY_DELAY_MS);
            });
            continue;
          }

          if (mounted) {
            setConnectorAccessAllowed(false);
            setConnectorAccessLoading(false);
          }
          return;
        } catch (error) {
          console.error('Connector terms check failed:', error);

          if (attempt < CONNECTOR_TERMS_CHECK_ATTEMPTS) {
            await new Promise<void>((resolve) => {
              retryTimer = window.setTimeout(resolve, CONNECTOR_TERMS_RETRY_DELAY_MS);
            });
            continue;
          }

          // Do not redirect to Terms merely because a database/auth check
          // failed. Keep the route in a loading state and retry shortly.
          if (mounted) {
            setConnectorAccessLoading(true);
            retryTimer = window.setTimeout(() => {
              if (mounted) setConnectorAccessCheckKey((current) => current + 1);
            }, 1000);
          }
          return;
        }
      }
    };

    void checkConnectorTerms();

    return () => {
      mounted = false;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [requiresConnectorTerms, user?.id, memberActive, connectorAccessCheckKey]);

  if (loading || rolesLoading || memberAccessLoading || connectorAccessLoading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!memberActive) {
    return <Navigate to="/login" replace state={{ from: location.pathname, inactive: true }} />;
  }

  const normalizedUserRoles = roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean);
  const normalizedRequiredRoles = (requiredRoles ?? [])
    .map((role) => String(role).trim().toLowerCase())
    .filter(Boolean);
  const hasRequiredRole =
    normalizedRequiredRoles.length === 0 ||
    normalizedRequiredRoles.some((role) => normalizedUserRoles.includes(role));

  if (!hasRequiredRole) return <Navigate to="/portal" replace />;
  if (requiresConnectorTerms && !connectorAccessAllowed) {
    return <Navigate to="/portal/connector/terms" replace />;
  }

  const content = children ? <>{children}</> : <Outlet />;

  if (accessGate === 'creation') {
    return <CreationAccessGate>{content}</CreationAccessGate>;
  }

  return content;
}
