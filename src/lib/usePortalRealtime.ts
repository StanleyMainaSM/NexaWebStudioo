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
      timer = setTimeout(() => { setRefreshKey(current => current + 1); timer = null; }, 100);
    };
    const channel = supabase.channel('avelixa-portal-realtime');
    REALTIME_TABLES.forEach(table => channel.on('postgres_changes', { event: '*', schema: 'public', table }, requestRefresh));
    channel.subscribe(status => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn(`Avelixa realtime channel ${status.toLowerCase()}.`); });
    return () => { if (timer) clearTimeout(timer); void supabase.removeChannel(channel); };
  }, []);
  return refreshKey;
}

/** One authoritative presence heartbeat for every authenticated portal. */
export function useGlobalCommunicationPresence(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let timer: number | null = null;
    let offlineSent = false;

    const markOnline = async () => {
      if (disposed || document.visibilityState !== 'visible' || !navigator.onLine) return;
      offlineSent = false;
      const { error } = await supabase.rpc('communication_set_presence', { p_online: true });
      if (error && !disposed) console.warn('Avelixa presence heartbeat failed:', error.message);
    };

    const markOffline = () => {
      if (disposed || offlineSent) return;
      offlineSent = true;
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
      void supabase.rpc('communication_set_presence', { p_online: false });
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        offlineSent = false;
        void markOnline();
      } else {
        markOffline();
      }
    };
    const onOnline = () => { offlineSent = false; void markOnline(); };
    const onOffline = () => markOffline();
    const onPageShow = () => { offlineSent = false; void markOnline(); };
    const onPageHide = () => markOffline();

    void markOnline();
    timer = window.setInterval(() => void markOnline(), 15000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', onPageHide);
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      disposed = true;
      if (!offlineSent) void supabase.rpc('communication_set_presence', { p_online: false });
    };
  }, [userId]);
}
