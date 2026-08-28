import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const REALTIME_TABLES = [
  'projects', 'project_tasks', 'invoices', 'payments', 'finance_transactions', 'payouts', 'expenses',
  'project_files', 'reviews', 'connector_applications', 'leads', 'commissions', 'notifications',
  'messages', 'profiles', 'user_roles', 'activity_log', 'maintenance_subscriptions', 'portfolio_items', 'settings',
] as const;

export function usePortalRealtimeRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const requestRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setRefreshKey(current => current + 1);
        timer = null;
      }, 100);
    };
    const channel = supabase.channel('avelixa-portal-realtime');
    REALTIME_TABLES.forEach(table => channel.on('postgres_changes', { event: '*', schema: 'public', table }, requestRefresh));
    channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn(`Avelixa realtime channel ${status.toLowerCase()}.`);
    });
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  return refreshKey;
}

/** Global communication heartbeat. It runs for the entire authenticated portal, not only /messages. */
export function useGlobalCommunicationPresence(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const setOnline = () => { if (alive) void supabase.rpc('communication_set_presence', { p_online: true }); };
    const setOffline = () => { if (alive) void supabase.rpc('communication_set_presence', { p_online: false }); };
    setOnline();
    const heartbeat = window.setInterval(setOnline, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') setOnline();
      else setOffline();
    };
    const handlePageHide = () => setOffline();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      alive = false;
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      void supabase.rpc('communication_set_presence', { p_online: false });
    };
  }, [userId]);
}
