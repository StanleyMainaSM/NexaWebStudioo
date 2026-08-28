import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import CallOverlayV2, { ActiveCall } from './CallOverlayV2';

type IncomingRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'voice' | 'video';
  status: string;
  direct_conversation_id?: string | null;
  admin_conversation_id?: string | null;
};

type ProfileRow = { full_name?: string | null; email?: string | null; avatar_url?: string | null };
const nameOf = (p?: ProfileRow) => p?.full_name?.trim() || p?.email?.trim() || 'Avelixa User';

export default function GlobalCallListener() {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const open = async (row: IncomingRow, userId: string) => {
      if (!alive || row.status !== 'ringing' || row.callee_id !== userId || activeId.current === row.id) return;
      activeId.current = row.id;
      const { data } = await supabase.from('profiles').select('full_name,email,avatar_url').eq('id', row.caller_id).maybeSingle();
      if (!alive) return;
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

      const { data: existing } = await supabase
        .from('call_sessions')
        .select('id,caller_id,callee_id,call_type,status,direct_conversation_id,admin_conversation_id')
        .eq('callee_id', user.id)
        .eq('status', 'ringing')
        .order('created_at', { ascending: false })
        .limit(1);
      const row = (existing || [])[0] as IncomingRow | undefined;
      if (row) await open(row, user.id);

      channel = supabase
        .channel(`user_calls:${user.id}`, { config: { private: true } })
        .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
          if (payload?.call_id && payload?.callee_id === user.id) {
            void open(payload as IncomingRow, user.id);
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions', filter: `callee_id=eq.${user.id}` }, ({ new: inserted }: any) => {
          void open(inserted as IncomingRow, user.id);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `callee_id=eq.${user.id}` }, ({ new: updated }: any) => {
          if (updated.id === activeId.current && updated.status !== 'ringing') {
            activeId.current = null;
            setCall(null);
          }
        })
        .subscribe();
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
