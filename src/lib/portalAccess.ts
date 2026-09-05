import { supabase } from './supabase';

export type PortalAccessKey = 'client' | 'operator' | 'connector' | 'admin' | 'owner' | 'creation';

export function getPortalForPath(pathname: string, activeWorkspace: Exclude<PortalAccessKey, 'creation'> | null): Exclude<PortalAccessKey, 'creation'> {
  if (pathname === '/portal') return 'client';
  if (pathname.startsWith('/portal/owner')) return 'owner';
  if (pathname.startsWith('/portal/admin')) return 'admin';
  if (pathname.startsWith('/portal/connector')) return 'connector';
  if (pathname.startsWith('/portal/operator')) return 'operator';
  return activeWorkspace ?? 'client';
}

export async function hasPortalAccess(portal: PortalAccessKey): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_portal_access', { p_portal: portal });
  if (error) {
    console.error('Portal access verification failed:', error.message);
    return false;
  }
  return data === true;
}

export async function isPortalPasswordConfigured(portal: PortalAccessKey): Promise<boolean> {
  const { data, error } = await supabase.rpc('portal_access_password_configured', { p_portal: portal });
  if (error) {
    console.error('Portal password configuration check failed:', error.message);
    return false;
  }
  return data === true;
}

export async function verifyPortalPassword(portal: PortalAccessKey, password: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_portal_access_password', {
    p_portal: portal,
    p_password: password,
  });
  if (error) {
    console.error('Portal password verification failed:', error.message);
    return false;
  }
  return data === true;
}

export async function clearPortalAccess(portal?: PortalAccessKey): Promise<void> {
  const { error } = await supabase.rpc('clear_portal_access', {
    p_portal: portal ?? null,
  });
  if (error) console.warn('Portal unlock cleanup failed:', error.message);
}
