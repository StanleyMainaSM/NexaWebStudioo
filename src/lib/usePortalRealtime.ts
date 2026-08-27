import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const REALTIME_TABLES = [
  'projects',
  'project_tasks',
  'invoices',
  'payments',
  'finance_transactions',
  'payouts',
  'expenses',
  'project_files',
  'reviews',
  'connector_applications',
  'leads',
  'commissions',
  'notifications',
  'messages',
  'profiles',
  'user_roles',
  'activity_log',
  'maintenance_subscriptions',
  'portfolio_items',
  'settings',
] as const;

/**
 * Keeps the currently mounted portal view synchronized with Supabase.
 * Existing page-level fetches remain the source of truth; a realtime event
 * remounts the active route so those existing fetches run again.
 */
export function usePortalRealtimeRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const requestRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setRefreshKey((current) => current + 1);
        timer = null;
      }, 100);
    };

    const channel = supabase.channel('avelixa-portal-realtime');

    REALTIME_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        requestRefresh,
      );
    });

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`Avelixa realtime channel ${status.toLowerCase()}.`);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  return refreshKey;
}
