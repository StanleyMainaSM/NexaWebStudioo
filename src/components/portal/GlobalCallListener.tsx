import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import CallOverlayV2, { ActiveCall } from './CallOverlayV2';

type IncomingRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'voice' | 'video';
  status: string;
  created_at?: string;
  direct_conversation_id?: string | null;
  admin_conversation_id?: string | null;
};

type ProfileRow = { full_name?: string | null; email?: string | null; avatar_url?: string | null };
const nameOf = (p?: ProfileRow) => p?.full_name?.trim() || p?.email?.trim() || 'Avelixa User';
const isFreshRingingCall = (row: IncomingRow) => {
  if (row.status !== 'ringing') return false;
  if (!row.created_at) return true;
  return Date.now() - new Date(row.created_at).getTime() <= 30000;
};

export default function GlobalCallListener() {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const open = async (row: IncomingRow, userId: string) => {
      if (!alive || !isFreshRingingCall(row) || row.callee_id !== userId || activeId.current === row.id) return;
      activeId.current = row.id;
      const { data } = await supabase.from('profiles').select('full_name,email,avatar_url').eq('id', row.caller_id).maybeSingle();
      if (!alive || activeId.current !== row.id) return;
      setCall({
        id: row.id,
        callType: row.call_type,
        callerId: row.caller_id,
        calleeId: row.callee_id,
        remoteName: nameOf(data as ProfileRow | undefined),
        isIncoming: true,
        directConversationId: row.direct_conversation_id || null,
        adminConversationId: row.admin_conversation_id || null,
      });
    };

    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user || !alive) return;

      try { await supabase.realtime.setAuth(); } catch (error) { console.error('Avelixa Realtime auth bootstrap failed:', error); return; }

      channel = supabase
        .channel(`user_calls:${user.id}`, { config: { private: true } })
        .on('broadcast', { event: 'incoming_call' }, ({ payload }: any) => {
          const row = payload?.call_session as IncomingRow | undefined;
          if (row) void open(row, user.id);
        })
        .subscribe(async (status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Avelixa incoming-call Realtime error:', err);
            return;
          }
          if (status === 'SUBSCRIBED' && alive) {
            // One-shot catch-up closes the narrow race where a ringing call is
            // inserted immediately before the browser finishes subscribing.
            const { data, error } = await supabase
              .from('call_sessions')
              .select('id,caller_id,callee_id,call_type,status,created_at,direct_conversation_id,admin_conversation_id')
              .eq('callee_id', user.id)
              .eq('status', 'ringing')
              .gte('created_at', new Date(Date.now() - 30000).toISOString())
              .order('created_at', { ascending: false })
              .limit(3);
            if (error) console.error('Avelixa incoming-call catch-up failed:', error);
            else for (const row of (data || []) as IncomingRow[]) void open(row, user.id);
          }
        });
    };

    void init();
    return () => {
      alive = false;
      activeId.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  if (!call) return null;
  return <CallOverlayV2 call={call} onClose={() => { activeId.current = null; setCall(null); }} />;
}
