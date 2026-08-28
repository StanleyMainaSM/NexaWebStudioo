import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import CallOverlayV2, { ActiveCall } from '../../components/portal/CallOverlayV2';

type CallRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'voice' | 'video';
  status: string;
  direct_conversation_id: string | null;
  admin_conversation_id: string | null;
};

type Profile = { id: string; full_name: string | null; email: string | null };

const nameOf = (p?: Profile | null) => p?.full_name?.trim() || p?.email || 'Avelixa User';

export default function GlobalCallManager() {
  const { user } = useAuth();
  const [call, setCall] = useState<ActiveCall | null>(null);
  const currentId = useRef<string | null>(null);
  const alive = useRef(true);

  const openCall = async (row: CallRow) => {
    if (!user || !alive.current) return;
    if (row.status !== 'ringing' && row.status !== 'accepted') return;
    if (currentId.current && currentId.current !== row.id) return;
    currentId.current = row.id;
    const remoteId = row.caller_id === user.id ? row.callee_id : row.caller_id;
    const { data } = await supabase.from('profiles').select('id,full_name,email').eq('id', remoteId).maybeSingle();
    if (!alive.current) return;
    setCall({
      id: row.id,
      callType: row.call_type,
      callerId: row.caller_id,
      calleeId: row.callee_id,
      remoteName: nameOf(data as Profile | null),
      isIncoming: row.callee_id === user.id,
      directConversationId: row.direct_conversation_id,
      adminConversationId: row.admin_conversation_id,
    });
  };

  const closeCall = () => {
    currentId.current = null;
    setCall(null);
  };

  useEffect(() => {
    alive.current = true;
    if (!user?.id) return () => { alive.current = false; };

    const findActive = async () => {
      const { data } = await supabase
        .from('call_sessions')
        .select('id,caller_id,callee_id,call_type,status,direct_conversation_id,admin_conversation_id')
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .in('status', ['ringing', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1);
      if (alive.current && data?.[0]) await openCall(data[0] as CallRow);
    };

    void findActive();

    const channel = supabase
      .channel(`avelixa-global-calls-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions' }, ({ new: row }: any) => {
        if (row.caller_id === user.id || row.callee_id === user.id) void openCall(row as CallRow);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions' }, ({ new: row }: any) => {
        if (row.caller_id !== user.id && row.callee_id !== user.id) return;
        if (['ended', 'declined', 'failed'].includes(row.status)) {
          if (currentId.current === row.id) closeCall();
          return;
        }
        if (row.status === 'accepted' || row.status === 'ringing') void openCall(row as CallRow);
      })
      .subscribe();

    const timer = window.setInterval(() => void findActive(), 1500);
    return () => {
      alive.current = false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return call ? <CallOverlayV2 call={call} onClose={closeCall} /> : null;
}
