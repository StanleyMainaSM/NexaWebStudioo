import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import CallOverlayV2, { ActiveCall } from './CallOverlayV2';

type IncomingRow = { id: string; call_id?: string; caller_id: string; callee_id: string; call_type: 'voice' | 'video'; status: string; created_at?: string; direct_conversation_id?: string | null; admin_conversation_id?: string | null };
type ProfileRow = { full_name?: string | null; email?: string | null; avatar_url?: string | null };
const nameOf = (p?: ProfileRow) => p?.full_name?.trim() || p?.email?.trim() || 'Avelixa User';
const MAX_RINGING_AGE_MS = 30_000;

export default function GlobalCallListener() {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const open = async (raw: IncomingRow, userId: string) => {
      const id = raw.id || raw.call_id;
      if (!id || !alive || raw.status !== 'ringing' || raw.callee_id !== userId || activeId.current === id) return;
      if (raw.created_at && Date.now() - new Date(raw.created_at).getTime() > MAX_RINGING_AGE_MS) return;
      activeId.current = id;
      const { data } = await supabase.from('profiles').select('full_name,email,avatar_url').eq('id', raw.caller_id).maybeSingle();
      if (!alive || activeId.current !== id) return;
      setCall({ id, callType: raw.call_type, callerId: raw.caller_id, calleeId: raw.callee_id, remoteName: nameOf(data as ProfileRow | undefined), isIncoming: true, directConversationId: raw.direct_conversation_id || null, adminConversationId: raw.admin_conversation_id || null });
    };

    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user || !alive) return;

      channel = supabase.channel(`user_calls:${user.id}`, { config: { private: true } });
      channel.on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        const row = payload as IncomingRow;
        void open({ ...row, id: row.call_id || row.id, created_at: row.created_at || new Date().toISOString() }, user.id);
      });
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions', filter: `callee_id=eq.${user.id}` }, ({ new: inserted }: any) => void open(inserted as IncomingRow, user.id));
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `callee_id=eq.${user.id}` }, ({ new: updated }: any) => {
        if (updated.id === activeId.current && updated.status !== 'ringing') { activeId.current = null; setCall(null); }
      });
      channel.subscribe();
    };

    void init();
    return () => { alive = false; activeId.current = null; if (channel) void supabase.removeChannel(channel); };
  }, []);

  if (!call) return null;
  return <CallOverlayV2 call={call} onClose={() => { activeId.current = null; setCall(null); }} />;
}
