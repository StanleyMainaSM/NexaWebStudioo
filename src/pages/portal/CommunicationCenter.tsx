import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, MessageSquarePlus, Phone, Search, Send, ShieldCheck, UserRound, Video, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import CallOverlayV2, { ActiveCall } from '../../components/portal/CallOverlayV2';

type AdminConversation = {
  kind: 'admin';
  id: string;
  user_id: string;
  admin_id: string;
  subject: string | null;
  status: string;
  updated_at: string;
  otherName: string;
  otherEmail: string | null;
};

type DirectConversation = {
  kind: 'direct';
  id: string;
  otherUserId: string;
  otherName: string;
  otherEmail: string | null;
  otherRole: string | null;
  updated_at: string;
};

type Conversation = AdminConversation | DirectConversation;

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
  kind: 'admin' | 'direct';
};

type Recipient = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role_context: string | null;
  connector_id: string | null;
};

function errorText(error: unknown) {
  if (!error) return 'Unknown database error.';
  if (typeof error === 'object' && error !== null) {
    const value = error as { message?: string; details?: string; hint?: string; code?: string };
    return [value.message, value.details, value.hint ? `Hint: ${value.hint}` : undefined, value.code ? `Code: ${value.code}` : undefined].filter(Boolean).join(' • ');
  }
  return String(error);
}

function displayName(name: string | null | undefined, email: string | null | undefined, fallback: string) {
  return name?.trim() || email?.trim() || fallback;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CommunicationCenter() {
  const { user, roles } = useAuth();
  const normalizedRoles = roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean);
  const isManagement = normalizedRoles.includes('owner') || normalizedRoles.includes('admin');

  const [adminConversations, setAdminConversations] = useState<AdminConversation[]>([]);
  const [directConversations, setDirectConversations] = useState<DirectConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [searchingRecipient, setSearchingRecipient] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const allConversations = useMemo<Conversation[]>(() => [...adminConversations, ...directConversations].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [adminConversations, directConversations]);
  const selected = allConversations.find((conversation) => conversation.id === selectedId) || null;

  const loadAdminConversations = async () => {
    if (!user) return;
    if (!isManagement) {
      const { data: conversationId, error: rpcError } = await supabase.rpc('get_or_create_admin_portal_conversation');
      if (rpcError) throw rpcError;
      if (!conversationId) throw new Error('Avelixa could not create the Admin conversation.');
      const { data, error: conversationError } = await supabase.from('admin_conversations').select('id,user_id,admin_id,subject,status,updated_at').eq('id', conversationId).maybeSingle();
      if (conversationError) throw conversationError;
      if (data) setAdminConversations([{ ...data, kind: 'admin', otherName: 'Avelixa Admin', otherEmail: null }]);
      return;
    }

    const { data, error: conversationError } = await supabase.from('admin_conversations').select('id,user_id,admin_id,subject,status,updated_at').order('updated_at', { ascending: false });
    if (conversationError) throw conversationError;
    const rows = (data || []) as Array<Omit<AdminConversation, 'kind' | 'otherName' | 'otherEmail'>>;
    const ids = Array.from(new Set(rows.map((row) => row.user_id)));
    let profiles: Array<{ id: string; full_name: string | null; email: string | null }> = [];
    if (ids.length) {
      const { data: profileRows } = await supabase.from('profiles').select('id,full_name,email').in('id', ids);
      profiles = profileRows || [];
    }
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    setAdminConversations(rows.map((row) => ({ ...row, kind: 'admin', otherName: displayName(profileMap.get(row.user_id)?.full_name, profileMap.get(row.user_id)?.email, 'Avelixa User'), otherEmail: profileMap.get(row.user_id)?.email || null })));
  };

  const loadDirectConversations = async () => {
    const { data, error: directError } = await supabase.rpc('list_direct_conversations');
    if (directError) throw directError;
    setDirectConversations(((data || []) as Array<{ conversation_id: string; other_user_id: string; other_full_name: string | null; other_email: string | null; other_role: string | null; updated_at: string }>).map((row) => ({
      kind: 'direct', id: row.conversation_id, otherUserId: row.other_user_id, otherName: displayName(row.other_full_name, row.other_email, 'Avelixa User'), otherEmail: row.other_email, otherRole: row.other_role, updated_at: row.updated_at,
    })));
  };

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadAdminConversations(), loadDirectConversations()]);
    } catch (loadError) {
      setError(`Messages could not be loaded: ${errorText(loadError)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) void loadConversations(); }, [user, isManagement]);

  useEffect(() => {
    if (!selectedId && allConversations.length) {
      setSelectedId(allConversations[0].id);
      return;
    }
    if (selectedId && !allConversations.some((conversation) => conversation.id === selectedId)) setSelectedId(allConversations[0]?.id || null);
  }, [allConversations, selectedId]);

  useEffect(() => {
    if (!user || !selected) { setMessages([]); return; }
    let mounted = true;
    const load = async () => {
      setLoadingMessages(true);
      setError(null);
      try {
        if (selected.kind === 'admin') {
          const { data, error: messageError } = await supabase.from('admin_messages').select('id,conversation_id,sender_id,recipient_id,content,read_at,created_at').eq('conversation_id', selected.id).order('created_at', { ascending: true });
          if (messageError) throw messageError;
          if (mounted) setMessages(((data || []) as Omit<ChatMessage, 'kind'>[]).map((message) => ({ ...message, kind: 'admin' })));
        } else {
          const { data, error: messageError } = await supabase.from('direct_messages').select('id,conversation_id,sender_id,content,read_at,created_at').eq('conversation_id', selected.id).order('created_at', { ascending: true });
          if (messageError) throw messageError;
          if (mounted) setMessages(((data || []) as Array<Omit<ChatMessage, 'kind' | 'recipient_id'>>).map((message) => ({ ...message, kind: 'direct', recipient_id: null })));
        }
      } catch (loadError) {
        if (mounted) setError(`Messages could not be loaded: ${errorText(loadError)}`);
      } finally { if (mounted) setLoadingMessages(false); }
    };
    void load();
    return () => { mounted = false; };
  }, [selectedId, selected?.kind]);

  useEffect(() => {
    if (!user || !selected) return;
    const adminChannel = selected.kind === 'admin'
      ? supabase.channel(`admin-message-${selected.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_messages', filter: `conversation_id=eq.${selected.id}` }, ({ new: row }) => setMessages((current) => current.some((message) => message.id === row.id) ? current : [...current, { ...(row as Omit<ChatMessage, 'kind'>), kind: 'admin' }]))
      : null;
    const directChannel = selected.kind === 'direct'
      ? supabase.channel(`direct-message-${selected.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${selected.id}` }, ({ new: row }) => setMessages((current) => current.some((message) => message.id === row.id) ? current : [...current, { ...(row as Omit<ChatMessage, 'kind' | 'recipient_id'>), kind: 'direct', recipient_id: null }]))
      : null;
    if (adminChannel) void adminChannel.subscribe();
    if (directChannel) void directChannel.subscribe();
    return () => { if (adminChannel) void supabase.removeChannel(adminChannel); if (directChannel) void supabase.removeChannel(directChannel); };
  }, [user, selected?.id, selected?.kind]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const listen = async () => {
      await supabase.realtime.setAuth();
      const channel = supabase.channel(`user_calls:${user.id}`, { config: { private: true } });
      channel.on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        if (!mounted || activeCall) return;
        const value = payload as ActiveCall;
        setActiveCall({ ...value, isIncoming: true });
      });
      await channel.subscribe();
      return channel;
    };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void listen().then((created) => { channel = created; }).catch((listenError) => console.warn('Avelixa incoming call listener failed:', listenError));
    return () => { mounted = false; if (channel) void supabase.removeChannel(channel); };
  }, [user, activeCall]);

  const findRecipient = async (event: FormEvent) => {
    event.preventDefault();
    setSearchingRecipient(true); setError(null); setSuccess(null); setRecipient(null);
    try {
      const { data, error: lookupError } = await supabase.rpc('find_communication_recipient', { p_identifier: identifier.trim() });
      if (lookupError) throw lookupError;
      const match = (data || [])[0] as Recipient | undefined;
      if (!match) throw new Error('No active Avelixa user was found for that ID. Connector IDs use the format AVL-0000.');
      setRecipient(match);
    } catch (lookupError) { setError(errorText(lookupError)); }
    finally { setSearchingRecipient(false); }
  };

  const addConversation = async () => {
    if (!recipient) return;
    setCreatingConversation(true); setError(null); setSuccess(null);
    try {
      const { data, error: createError } = await supabase.rpc('get_or_create_direct_conversation', { p_recipient_id: recipient.user_id });
      if (createError) throw createError;
      await loadDirectConversations();
      setSelectedId(data as string);
      setIdentifier(''); setRecipient(null);
      setSuccess(`Conversation with ${displayName(recipient.full_name, recipient.email, 'Avelixa User')} is ready.`);
    } catch (createError) { setError(errorText(createError)); }
    finally { setCreatingConversation(false); }
  };

  const markRead = async () => {
    if (!user || !selected) return;
    const unread = messages.filter((message) => message.read_at === null && message.sender_id !== user.id);
    if (!unread.length) return;
    const ids = unread.map((message) => message.id);
    const now = new Date().toISOString();
    if (selected.kind === 'admin') await supabase.from('admin_messages').update({ read_at: now }).in('id', ids);
    else await supabase.from('direct_messages').update({ read_at: now }).in('id', ids);
    setMessages((current) => current.map((message) => ids.includes(message.id) ? { ...message, read_at: now } : message));
  };

  useEffect(() => { void markRead(); }, [selectedId, messages.length]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !selected || !messageText.trim() || sending) return;
    setSending(true); setError(null);
    const content = messageText.trim();
    try {
      if (selected.kind === 'admin') {
        const recipientId = selected.user_id === user.id ? selected.admin_id : selected.user_id;
        const { data, error: insertError } = await supabase.from('admin_messages').insert({ conversation_id: selected.id, sender_id: user.id, recipient_id: recipientId, content }).select('id,conversation_id,sender_id,recipient_id,content,read_at,created_at').single();
        if (insertError) throw insertError;
        setMessages((current) => [...current, { ...(data as Omit<ChatMessage, 'kind'>), kind: 'admin' }]);
      } else {
        const { data, error: insertError } = await supabase.from('direct_messages').insert({ conversation_id: selected.id, sender_id: user.id, content }).select('id,conversation_id,sender_id,content,read_at,created_at').single();
        if (insertError) throw insertError;
        setMessages((current) => [...current, { ...(data as Omit<ChatMessage, 'kind' | 'recipient_id'>), kind: 'direct', recipient_id: null }]);
        await loadDirectConversations();
      }
      setMessageText('');
    } catch (sendError) { setError(`Message could not be sent: ${errorText(sendError)}`); }
    finally { setSending(false); }
  };

  const startCall = async (callType: 'voice' | 'video') => {
    if (!user || !selected || activeCall) return;
    const calleeId = selected.kind === 'admin' ? (selected.user_id === user.id ? selected.admin_id : selected.user_id) : selected.otherUserId;
    const remoteName = selected.kind === 'admin' ? (isManagement ? selected.otherName : 'Avelixa Admin') : selected.otherName;
    const payload = selected.kind === 'admin' ? { admin_conversation_id: selected.id, direct_conversation_id: null } : { admin_conversation_id: null, direct_conversation_id: selected.id };
    const { data: session, error: callError } = await supabase.from('call_sessions').insert({ ...payload, caller_id: user.id, callee_id: calleeId, call_type: callType, status: 'ringing' }).select('id').single();
    if (callError) { setError(`Could not start call: ${errorText(callError)}`); return; }
    const call: ActiveCall = { id: session.id, callType, callerId: user.id, calleeId, remoteName, isIncoming: false, directConversationId: selected.kind === 'direct' ? selected.id : null, adminConversationId: selected.kind === 'admin' ? selected.id : null };
    try {
      await supabase.realtime.setAuth();
      const signal = supabase.channel(`user_calls:${calleeId}`, { config: { private: true, broadcast: { ack: true } } });
      signal.on('broadcast', { event: 'noop' }, () => undefined);
      const subscription = await signal.subscribe();
      if (subscription !== 'SUBSCRIBED') throw new Error('Could not reach the recipient.');
      await signal.send({ type: 'broadcast', event: 'incoming_call', payload: { ...call, isIncoming: true, call_id: call.id } });
      await supabase.removeChannel(signal);
      setActiveCall(call);
    } catch (signalError) {
      await supabase.from('call_sessions').update({ status: 'failed', ended_at: new Date().toISOString() }).eq('id', session.id);
      setError(`Could not notify the recipient: ${errorText(signalError)}`);
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-accent-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><div className="text-xs uppercase tracking-[0.2em] text-accent-400">Communication</div><h1 className="mt-2 text-3xl font-semibold text-white">Messages & Calls</h1><p className="mt-2 max-w-2xl text-sm text-gray-400">Your Avelixa Admin conversation is always available. Add another authorized Avelixa user when you need to communicate directly.</p></div>
        <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 px-4 py-3 text-xs text-accent-300"><ShieldCheck className="mr-2 inline h-4 w-4" />Authenticated Avelixa communication</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <form onSubmit={findRecipient} className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Start another conversation</label><div className="flex gap-2"><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Connector ID or Avelixa user ID" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/40" /><button type="submit" disabled={searchingRecipient || !identifier.trim()} className="rounded-xl bg-accent-500 px-3 text-white disabled:opacity-40"><Search className="h-4 w-4" /></button></div></form>
          {recipient && <div className="mt-3 rounded-2xl border border-accent-500/20 bg-accent-500/5 p-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500/10 text-accent-300"><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{displayName(recipient.full_name, recipient.email, 'Avelixa User')}</div><div className="text-xs text-gray-500">{recipient.role_context || 'Avelixa user'}{recipient.connector_id ? ` • ${recipient.connector_id}` : ''}</div></div></div><button type="button" onClick={() => void addConversation()} disabled={creatingConversation} className="mt-3 w-full rounded-xl bg-accent-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{creatingConversation ? 'Opening…' : 'Open conversation'}</button></div>}
          {success && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{success}</div>}
          {error && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

          <div className="mt-5 space-y-2">{allConversations.map((conversation) => { const active = conversation.id === selectedId; const name = conversation.kind === 'admin' ? conversation.otherName : conversation.otherName; return <button key={`${conversation.kind}:${conversation.id}`} type="button" onClick={() => setSelectedId(conversation.id)} className={`w-full rounded-2xl border p-3 text-left transition ${active ? 'border-accent-500/30 bg-accent-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5'}`}><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink-950 text-accent-300">{conversation.kind === 'admin' ? <ShieldCheck className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{name}</div><div className="truncate text-xs text-gray-500">{conversation.kind === 'admin' ? 'Admin support' : conversation.otherRole || 'Direct conversation'}</div></div></div></button>; })}</div>
        </section>

        <section className="min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          {!selected ? <div className="flex h-[620px] flex-col items-center justify-center text-center"><MessageSquarePlus className="h-10 w-10 text-gray-700" /><div className="mt-4 text-sm font-semibold text-gray-300">Select a conversation</div><div className="mt-2 max-w-sm text-xs text-gray-600">Your Admin conversation will appear automatically. You can also add another authorized Avelixa user by ID.</div></div> : <>
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><div className="text-sm font-semibold text-white">{selected.otherName}</div><div className="mt-1 text-xs text-gray-500">{selected.kind === 'admin' ? 'Avelixa Admin Support' : `${selected.otherRole || 'Avelixa User'} • Direct conversation`}</div></div><div className="flex items-center gap-2"><button type="button" onClick={() => void startCall('voice')} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:border-accent-500/30 hover:text-accent-300" aria-label="Start voice call"><Phone className="h-4 w-4" /></button><button type="button" onClick={() => void startCall('video')} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:border-accent-500/30 hover:text-accent-300" aria-label="Start video call"><Video className="h-4 w-4" /></button></div></div>
            <div className="h-[480px] overflow-y-auto p-5"><div className="space-y-3">{loadingMessages ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent-400" /></div> : messages.length === 0 ? <div className="py-16 text-center text-sm text-gray-600">No messages yet. Start the conversation.</div> : messages.map((message) => { const mine = message.sender_id === user?.id; return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${mine ? 'bg-accent-500 text-white' : 'border border-white/10 bg-ink-950 text-gray-200'}`}><div className="whitespace-pre-wrap text-sm">{message.content}</div><div className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-gray-600'}`}>{formatTime(message.created_at)}{mine && message.read_at ? ' • Read' : ''}</div></div></div>; })}</div></div>
            <form onSubmit={sendMessage} className="border-t border-white/10 p-4"><div className="flex gap-3"><textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} rows={2} placeholder="Write a message…" className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/10 bg-ink-950 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/40" /><button type="submit" disabled={sending || !messageText.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-2xl bg-accent-500 text-white disabled:opacity-40" aria-label="Send message">{sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button></div></form>
          </>}
        </section>
      </div>

      {activeCall && <CallOverlayV2 call={activeCall} onClose={() => setActiveCall(null)} />}
    </div>
  );
}
