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
        const { data, error } = await supabase.from('profiles').select('is_active').eq('id', user.id).maybeSingle();
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
        setConnectorAccessAllowed(Boolean(data?.is_active && data?.terms_accepted_at && data?.terms_version));
      } catch (error) {
        console.error('Connector access check failed:', error);
        if (mounted) setConnectorAccessAllowed(false);
      } finally {
        if (mounted) setConnectorAccessLoading(false);
      }
    };
    void checkConnectorAccess();
    return () => { mounted = false; };
  }, [requiresConnectorTerms, user?.id, memberActive]);

  if (loading || rolesLoading || memberAccessLoading || connectorAccessLoading) {
    return <div className="min-h-screen bg-ink-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-accent-400 animate-spin" /> </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!memberActive) {
    return <Navigate to="/login" replace state={{ from: location.pathname, inactive: true }} />;
  }

  const normalizedUserRoles = roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean);
  const normalizedRequiredRoles = (requiredRoles ?? []).map((role) => String(role).trim().toLowerCase()).filter(Boolean);
  const hasRequiredRole = normalizedRequiredRoles.length === 0 || normalizedRequiredRoles.some((role) => normalizedUserRoles.includes(role));

  if (!hasRequiredRole) return <Navigate to="/portal" replace />;
  if (requiresConnectorTerms && !connectorAccessAllowed) return <Navigate to="/portal/connector/terms" replace />;

  const content = children ? <>{children}</> : <Outlet />;

  if (accessGate === 'creation') {
    return <CreationAccessGate>{content}</CreationAccessGate>;
  }

  return content;
}
