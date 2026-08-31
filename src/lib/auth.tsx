import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useGlobalCommunicationPresence } from './usePortalRealtime';

export type PortalWorkspace = 'client' | 'connector' | 'operator' | 'admin' | 'owner';
export type AuthProfile = { id: string; email: string | null; full_name: string | null; avatar_url: string | null };

type AuthContextType = {
  user: User | null;
  roles: string[];
  profile: AuthProfile | null;
  activeWorkspace: PortalWorkspace | null;
  setActiveWorkspace: (workspace: PortalWorkspace | null) => void;
  loading: boolean;
  rolesLoading: boolean;
};

const WORKSPACE_STORAGE_KEY = 'avelixa.activeWorkspace';
const WORKSPACES: PortalWorkspace[] = ['client', 'connector', 'operator', 'admin', 'owner'];
const AuthContext = createContext<AuthContextType>({ user: null, roles: [], profile: null, activeWorkspace: null, setActiveWorkspace: () => undefined, loading: true, rolesLoading: true });

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

function isWorkspace(value: string | null): value is PortalWorkspace {
  return !!value && WORKSPACES.includes(value as PortalWorkspace);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [activeWorkspace, setActiveWorkspaceState] = useState<PortalWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const mountedRef = useRef(true);
  const rolesRequestRef = useRef(0);

  useGlobalCommunicationPresence(user?.id);

  const setActiveWorkspace = (workspace: PortalWorkspace | null) => {
    if (!workspace) {
      setActiveWorkspaceState(null);
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(WORKSPACE_STORAGE_KEY);
      return;
    }
    if (!roles.includes(workspace)) return;
    setActiveWorkspaceState(workspace);
    if (typeof window !== 'undefined') window.sessionStorage.setItem(WORKSPACE_STORAGE_KEY, workspace);
  };

  const fetchRoles = async () => {
    const requestId = ++rolesRequestRef.current;
    if (!mountedRef.current) return;
    setRolesLoading(true);
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) {
        if (mountedRef.current && requestId === rolesRequestRef.current) { setRoles([]); setProfile(null); setActiveWorkspaceState(null); }
        return;
      }
      const [{ data: roleData, error: roleError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase.rpc('get_my_roles'),
        supabase.from('profiles').select('id,email,full_name,avatar_url').eq('id', currentUser.id).maybeSingle(),
      ]);
      if (roleError) throw roleError;
      if (profileError) console.warn('Could not load user profile:', profileError.message);
      if (!mountedRef.current || requestId !== rolesRequestRef.current) return;
      const normalized = normalizeRoles(roleData);
      setRoles(normalized);
      setProfile(profileData ? profileData as AuthProfile : null);
      const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem(WORKSPACE_STORAGE_KEY) : null;
      const nextWorkspace = isWorkspace(stored) && normalized.includes(stored) ? stored : getPrimaryPortalRole(normalized) as PortalWorkspace | null;
      setActiveWorkspaceState(nextWorkspace);
      if (nextWorkspace && typeof window !== 'undefined') window.sessionStorage.setItem(WORKSPACE_STORAGE_KEY, nextWorkspace);
    } catch (error) {
      console.error('Error loading user roles/profile:', error);
      if (mountedRef.current && requestId === rolesRequestRef.current) { setRoles([]); setProfile(null); }
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
        else { setRoles([]); setProfile(null); setActiveWorkspaceState(null); setRolesLoading(false); }
      } catch (error) {
        console.error('Authentication initialization error:', error);
        if (!cancelled && mountedRef.current) { setUser(null); setRoles([]); setProfile(null); setActiveWorkspaceState(null); setLoading(false); setRolesLoading(false); }
      }
    };
    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || !mountedRef.current) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) { setRoles([]); setProfile(null); setActiveWorkspaceState(null); setRolesLoading(false); return; }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        queueMicrotask(() => { if (!cancelled && mountedRef.current) void fetchRoles(); });
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      rolesRequestRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const channel = supabase.channel(`avelixa-profile-${user.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, ({ new: row }) => {
      if (alive) setProfile(row as AuthProfile);
    }).subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [user?.id]);

  return <AuthContext.Provider value={{ user, roles, profile, activeWorkspace, setActiveWorkspace, loading, rolesLoading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
