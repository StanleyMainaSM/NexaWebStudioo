import { supabase } from './supabase';

export type PortalAccessKey = 'client' | 'operator' | 'connector' | 'admin' | 'owner';

export async function hasPortalAccess(portal: PortalAccessKey): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_portal_access', { p_portal: portal });
  if (error) {
    console.error('Portal access verification failed:', error.message);
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
