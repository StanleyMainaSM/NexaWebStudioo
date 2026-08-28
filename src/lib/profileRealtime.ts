import { useEffect } from 'react';
import { supabase } from './supabase';

/**
 * Keeps profile changes synchronized for any authenticated portal surface.
 * Consumers receive the complete updated profile row so local state can be
 * replaced without relying on a page refresh or conversation navigation.
 */
export function useProfileRealtime(onProfileChange: (profile: { id: string; full_name?: string | null; email?: string | null; avatar_url?: string | null }) => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`avelixa-profile-sync-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, ({ new: profile }) => {
        onProfileChange(profile as { id: string; full_name?: string | null; email?: string | null; avatar_url?: string | null });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onProfileChange]);
}
