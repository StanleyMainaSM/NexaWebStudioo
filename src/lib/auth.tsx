import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useGlobalCommunicationPresence } from './usePortalRealtime';

type AuthContextType = { user: User | null; roles: string[]; loading: boolean; rolesLoading: boolean };
const AuthContext = createContext<AuthContextType>({ user: null, roles: [], loading: true, rolesLoading: true });

function normalizeRoles(roleValues: unknown): string[] {
  if (!Array.isArray(roleValues)) return [];
  const normalized = roleValues.map((item: unknown) => {
    if (typeof item === 'object' && item !== null && 'role' in item) {
      const role = (item as { role?: unknown }).role;
      return typeof role === 'string' ? role.trim().toLowerCase() : '';
    }
    return typeof item === 'string' ? item.trim().toLowerCase() : '';
  }).filter((role): role is string => typeof role === 'string' && role.length > 0);
  return Array.from(new Set(normalized));
}

export function getPrimaryPortalRole(roles: string[]): string | null {
  const normalizedRoles = normalizeRoles(roles);
  return ['owner', 'admin', 'connector', 'operator', 'client'].find(role => normalizedRoles.includes(role)) ?? null;
}

export function getPortalPathForRole(role: string | null): string {
  switch (String(role ?? '').trim().toLowerCase()) {
    case 'owner': return '/portal/owner';
    case 'admin': return '/portal/admin';
    case 'connector': return '/portal/connector';
    case 'operator': return '/portal/operator';
    case 'client':
    default: return '/portal';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const mountedRef = useRef(true);
  const rolesRequestRef = useRef(0);

  useGlobalCommunicationPresence(user?.id);

  const fetchRoles = async () => {
    const requestId = ++rolesRequestRef.current;
    if (!mountedRef.current) return;
    setRolesLoading(true);
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) {
        if (mountedRef.current && requestId === rolesRequestRef.current) setRoles([]);
        return;
      }
      const { data, error } = await supabase.rpc('get_my_roles');
      if (error) throw error;
      if (!mountedRef.current || requestId !== rolesRequestRef.current) return;
      setRoles(normalizeRoles(data));
    } catch (error) {
      console.error('Error loading user roles:', error);
      if (mountedRef.current && requestId === rolesRequestRef.current) setRoles([]);
    } finally {
      if (mountedRef.current && requestId === rolesRequestRef.current) setRolesLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (cancelled || !mountedRef.current) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(false);
        if (currentUser) await fetchRoles();
        else { setRoles([]); setRolesLoading(false); }
      } catch (error) {
        console.error('Authentication initialization error:', error);
        if (!cancelled && mountedRef.current) { setUser(null); setRoles([]); setLoading(false); setRolesLoading(false); }
      }
    };
    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || !mountedRef.current) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) { setRoles([]); setRolesLoading(false); return; }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setTimeout(() => { if (!cancelled && mountedRef.current) void fetchRoles(); }, 0);
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      rolesRequestRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, roles, loading, rolesLoading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
