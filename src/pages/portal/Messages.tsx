import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import CallOverlayV2, { ActiveCall } from '../../components/portal/CallOverlayV2';
import { ArrowLeft, Ban, BellOff, Check, CheckCheck, Clipboard, Download, Loader2, MessageCirclePlus, MessageSquare, MoreVertical, Phone, PhoneOff, Plus, Search, Send, Trash2, UserPlus, Video, X, Volume2, ImagePlus } from 'lucide-react';

type Person = { user_id: string; full_name: string | null; email: string | null; role_context: string | null; connector_id: string | null; is_online: boolean; last_seen_at: string | null; avatar_url?: string | null };
type Conversation = { conversation_id: string; other_user_id: string; other_full_name: string | null; other_email: string | null; other_role: string | null; updated_at: string };
type Message = { id: string; conversation_id: string; sender_id: string; content: string; read_at: string | null; created_at: string };
type CallSession = { id: string; direct_conversation_id: string | null; caller_id: string; callee_id: string; call_type: 'voice' | 'video'; status: string; duration_seconds: number | null; created_at: string; started_at: string | null; ended_at: string | null };
type TimelineItem = { kind: 'message' | 'call'; at: string; message?: Message; call?: CallSession };

const nameOf = (p?: { full_name: string | null; email: string | null } | null) => p?.full_name?.trim() || p?.email || 'Avelixa User';
const timeOf = (v: string) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dateOf = (v: string) => new Date(v).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
const errText = (e: unknown) => { if (e && typeof e === 'object') { const x = e as { message?: string; details?: string; code?: string }; return [x.message, x.details, x.code ? `Code: ${x.code}` : ''].filter(Boolean).join(' • '); } return String(e || 'Something went wrong.'); };

function Avatar({ person, size = 'h-11 w-11' }: { person?: Person | null; size?: string }) {
  const initial = nameOf(person).charAt(0).toUpperCase();
  return <div className={`${size} relative shrink-0 overflow-hidden rounded-full border border-white/10 bg-accent-500/10 flex items-center justify-center text-accent-300 font-semibold`}>{person?.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}{person?.is_online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink-950 bg-emerald-400" />}</div>;
}

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [contacts, setContacts] = useState<Person[]>([]);
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState('');
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typing, setTyping] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const paneRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<number | null>(null);
  const firstLoad = useRef(true);

  const selectedConversation = conversations.find(c => c.conversation_id === selectedId) || null;
  const selectedPersonFromDirectory = selectedPerson || people.find(p => p.user_id === selectedConversation?.other_user_id) || null;

  const refreshDirectory = async () => {
    if (!user) return;
    const [{ data: convoRows, error: convoError }, { data: contactRows, error: contactError }] = await Promise.all([supabase.rpc('list_direct_conversations'), supabase.rpc('list_communication_contacts')]);
    if (convoError) throw convoError;
    if (contactError) throw contactError;
    const convos = (convoRows || []) as Conversation[];
    setConversations(convos);
    const saved = (contactRows || []) as Person[];
    setContacts(saved);
    const ids = Array.from(new Set(convos.map(c => c.other_user_id).concat(saved.map(c => c.user_id))));
    if (ids.length) {
      const [{ data: profiles }, { data: presence }] = await Promise.all([supabase.from('profiles').select('id,full_name,email,avatar_url').in('id', ids), supabase.from('user_presence').select('user_id,is_online,last_seen_at').in('user_id', ids)]);
      const pm = new Map((profiles || []).map((p: { id: string; full_name: string | null; email: string | null; avatar_url?: string | null }) => [p.id, p]));
      const um = new Map((presence || []).map((p: { user_id: string; is_online: boolean; last_seen_at: string | null }) => [p.user_id, p]));
      setPeople(ids.map(id => { const p = pm.get(id); const u = um.get(id); return { user_id: id, full_name: p?.full_name || null, email: p?.email || null, avatar_url: p?.avatar_url || null, role_context: null, connector_id: null, is_online: !!u?.is_online, last_seen_at: u?.last_seen_at || null }; }));
    } else setPeople([]);
    if (convos.length) {
      const { data: unread } = await supabase.from('direct_messages').select('conversation_id').in('conversation_id', convos.map(c => c.conversation_id)).neq('sender_id', user.id).is('read_at', null);
      const counts: Record<string, number> = {};
      (unread || []).forEach((row: { conversation_id: string }) => { counts[row.conversation_id] = (counts[row.conversation_id] || 0) + 1; });
      setUnreadByConversation(counts);
    } else setUnreadByConversation({});
  };

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const init = async () => { setLoading(true); setError(null); try { await supabase.rpc('communication_set_presence', { p_online: true }); await refreshDirectory(); } catch (e) { if (alive) setError(errText(e)); } finally { if (alive) setLoading(false); } };
    void init();
    const heartbeat = window.setInterval(() => { void supabase.rpc('communication_set_presence', { p_online: true }); }, 30000);
    const offline = () => { void supabase.rpc('communication_set_presence', { p_online: false }); };
    window.addEventListener('beforeunload', offline);
    return () => { alive = false; window.clearInterval(heartbeat); window.removeEventListener('beforeunload', offline); offline(); };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`avelixa-messages-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
        const m = payload.new as Message;
        if (m.sender_id !== user.id) {
          if (m.conversation_id === selectedId) {
            setMessages(cur => cur.some(x => x.id === m.id) ? cur : [...cur, m]);
            void markRead(m.conversation_id);
          }
          void refreshDirectory();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, payload => { const m = payload.new as Message; setMessages(cur => cur.map(x => x.id === m.id ? m : x)); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions' }, payload => { const c = payload.new as CallSession; if (c.callee_id === user.id && c.status === 'ringing') setIncomingCall(c); if (c.direct_conversation_id === selectedId) setCalls(cur => cur.some(x => x.id === c.id) ? cur : [...cur, c]); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions' }, payload => { const c = payload.new as CallSession; setCalls(cur => cur.map(x => x.id === c.id ? c : x)); if (c.id === incomingCall?.id && c.status !== 'ringing') setIncomingCall(null); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_presence' }, payload => { const p = payload.new as { user_id: string; is_online: boolean; last_seen_at: string | null }; setPeople(cur => cur.map(x => x.user_id === p.user_id ? { ...x, is_online: p.is_online, last_seen_at: p.last_seen_at } : x)); })
      .on('broadcast', { event: 'typing' }, payload => { if (payload.payload?.userId !== user.id && payload.payload?.conversationId === selectedId) setTyping(!!payload.payload.typing); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, selectedId, incomingCall?.id]);

  const loadChat = async (conversationId: string) => {
    if (!user) return;
    setLoadingChat(true); setError(null);
    const [{ data: msgRows, error: msgError }, { data: callRows, error: callError }, { data: pref }] = await Promise.all([
      supabase.from('direct_messages').select('id,conversation_id,sender_id,content,read_at,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
      supabase.from('call_sessions').select('id,direct_conversation_id,caller_id,callee_id,call_type,status,duration_seconds,created_at,started_at,ended_at').eq('direct_conversation_id', conversationId).order('created_at', { ascending: true }),
      supabase.from('conversation_preferences').select('muted,cleared_at').eq('user_id', user.id).eq('conversation_id', conversationId).maybeSingle()
    ]);
    if (msgError) setError(errText(msgError)); else setMessages((msgRows || []) as Message[]);
    if (callError) setError(errText(callError)); else setCalls((callRows || []) as CallSession[]);
    setMuted(!!pref?.muted); setClearedAt(pref?.cleared_at || null);
    const person = people.find(p => p.user_id === selectedConversation?.other_user_id); if (person) setSelectedPerson(person);
    setWallpaper(localStorage.getItem(`avelixa-wallpaper:${user.id}:${conversationId}`));
    setLoadingChat(false);
  };

  useEffect(() => { if (selectedId) void loadChat(selectedId); else { setMessages([]); setCalls([]); setSelectedPerson(null); setClearedAt(null); setWallpaper(null); } }, [selectedId]);

  const markRead = async (conversationId: string) => {
    if (!user) return;
    const unread = messages.filter(m => m.conversation_id === conversationId && m.sender_id !== user.id && !m.read_at).map(m => m.id);
    if (!unread.length) return;
    const now = new Date().toISOString(); const { error: e } = await supabase.from('direct_messages').update({ read_at: now }).in('id', unread);
    if (!e) { setMessages(cur => cur.map(m => unread.includes(m.id) ? { ...m, read_at: now } : m)); setUnreadByConversation(cur => ({ ...cur, [conversationId]: 0 })); }
  };

  const selectConversation = async (id: string) => { setSelectedId(id); setMenuOpen(false); setSelectedIds([]); setConversationSearch(''); await markRead(id); };

  useEffect(() => {
    if (!newChatOpen || !newChatQuery.trim()) { setSearchResults([]); return; }
    let alive = true;
    const timer = window.setTimeout(async () => { const { data, error: e } = await supabase.rpc('search_communication_users', { p_query: newChatQuery.trim() }); if (alive && !e) setSearchResults(((data || []) as Person[]).filter(p => p.user_id !== user?.id).slice(0, 5)); }, 300);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [newChatOpen, newChatQuery, user?.id]);

  const addContact = async () => {
    if (!user || (!contactEmail.trim() && !contactPhone.trim()) || !contactName.trim()) { setError('Enter the person’s name and email or phone number.'); return; }
    setBusy(true); setError(null);
    try {
      let person: Person | null = null;
      const lookup = contactEmail.trim() || contactPhone.trim();
      const { data, error: e } = await supabase.rpc('search_communication_users', { p_query: lookup });
      if (e) throw e;
      person = ((data || []) as Person[]).find(p => p.user_id !== user.id) || null;
      if (!person) { setNotice(`${contactName.trim()} is not in Avelixa yet. You can invite them using their email address.`); if (contactEmail.trim()) window.open(`mailto:${encodeURIComponent(contactEmail.trim())}?subject=${encodeURIComponent('Join me on Avelixa')}&body=${encodeURIComponent('I would like to communicate with you on Avelixa. Please create your Avelixa account and send me your Avelixa contact details.')}`, '_blank'); return; }
      const { error: ce } = await supabase.rpc('communication_add_contact', { p_contact_user_id: person.user_id }); if (ce) throw ce;
      await refreshDirectory(); setNotice(`${nameOf(person)} was added to your contacts.`); setAddContactOpen(false); setContactName(''); setContactEmail(''); setContactPhone('');
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const startConversation = async (person: Person) => {
    if (!user) return;
    setBusy(true); setError(null);
    try { const { data, error: e } = await supabase.rpc('get_or_create_direct_conversation', { p_recipient_id: person.user_id }); if (e) throw e; if (!data) throw new Error('Avelixa could not create the conversation.'); await supabase.rpc('communication_add_contact', { p_contact_user_id: person.user_id }); await refreshDirectory(); setSelectedPerson(person); setSelectedId(data as string); setNewChatOpen(false); setNewChatQuery(''); }
    catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault(); if (!user || !selectedId || !messageText.trim() || busy || blocked) return;
    setBusy(true); setError(null);
    try { const content = replyTo ? `↩ Reply: ${replyTo.content}\n\n${messageText.trim()}` : messageText.trim(); const { data, error: insertError } = await supabase.from('direct_messages').insert({ conversation_id: selectedId, sender_id: user.id, content }).select('id,conversation_id,sender_id,content,read_at,created_at').single(); if (insertError) throw insertError; setMessages(cur => cur.some(m => m.id === data.id) ? cur : [...cur, data as Message]); setMessageText(''); setReplyTo(null); void refreshDirectory(); }
    catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const sendTyping = (value: boolean) => { if (!selectedId || !user) return; const channel = supabase.channel(`avelixa-typing-${selectedId}`); void channel.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, conversationId: selectedId, typing: value } }); if (typingTimer.current) window.clearTimeout(typingTimer.current); if (value) typingTimer.current = window.setTimeout(() => sendTyping(false), 1600); };

  const startCall = async (type: 'voice' | 'video') => {
    if (!user || !selectedId || !selectedConversation || busy || blocked) return;
    setBusy(true); setError(null);
    try { const { data: allowed, error: allowError } = await supabase.rpc('communication_can_contact', { p_other_user_id: selectedConversation.other_user_id }); if (allowError) throw allowError; if (!allowed) throw new Error('This user is unavailable for communication.'); const { data, error: e } = await supabase.from('call_sessions').insert({ direct_conversation_id: selectedId, caller_id: user.id, callee_id: selectedConversation.other_user_id, call_type: type, status: 'ringing' }).select('id,direct_conversation_id,caller_id,callee_id,call_type,status,duration_seconds,created_at,started_at,ended_at').single(); if (e) throw e; const c = data as CallSession; setCalls(cur => cur.some(x => x.id === c.id) ? cur : [...cur, c]); setActiveCall({ id: c.id, callType: type, callerId: c.caller_id, calleeId: c.callee_id, remoteName: nameOf(selectedPersonFromDirectory), isIncoming: false, directConversationId: selectedId }); }
    catch (e) { setError(`Could not start call: ${errText(e)}`); } finally { setBusy(false); }
  };

  const acceptIncoming = async (c: CallSession) => { const p = people.find(x => x.user_id === c.caller_id); setSelectedPerson(p || null); if (c.direct_conversation_id) setSelectedId(c.direct_conversation_id); setIncomingCall(null); await supabase.from('call_sessions').update({ status: 'answered', answered_at: new Date().toISOString() }).eq('id', c.id); setActiveCall({ id: c.id, callType: c.call_type, callerId: c.caller_id, calleeId: c.callee_id, remoteName: nameOf(p), isIncoming: true, directConversationId: c.direct_conversation_id || undefined }); };

  const blockToggle = async () => { if (!selectedConversation) return; setBusy(true); setError(null); try { const { data: rows } = await supabase.from('user_blocks').select('id').eq('blocker_id', user?.id || '').eq('blocked_id', selectedConversation.other_user_id).limit(1); if (rows?.length) await supabase.rpc('communication_unblock_user', { p_blocked_id: selectedConversation.other_user_id }); else await supabase.rpc('communication_block_user', { p_blocked_id: selectedConversation.other_user_id }); setBlocked(!rows?.length); setNotice(rows?.length ? 'User unblocked.' : 'User blocked.'); } catch (e) { setError(errText(e)); } finally { setBusy(false); } };
  const clearChat = async () => { if (!user || !selectedId) return; setBusy(true); try { const now = new Date().toISOString(); const { error: e } = await supabase.from('conversation_preferences').upsert({ user_id: user.id, conversation_id: selectedId, cleared_at: now }, { onConflict: 'user_id,conversation_id' }); if (e) throw e; setClearedAt(now); setMessages([]); setCalls([]); setNotice('Chat cleared for you.'); } catch (e) { setError(errText(e)); } finally { setBusy(false); } };
  const toggleMute = async () => { if (!user || !selectedId) return; const next = !muted; const { error: e } = await supabase.from('conversation_preferences').upsert({ user_id: user.id, conversation_id: selectedId, muted: next }, { onConflict: 'user_id,conversation_id' }); if (!e) { setMuted(next); setNotice(next ? 'Conversation muted.' : 'Conversation unmuted.'); } };
  const exportChat = () => { if (!selectedConversation) return; const person = nameOf(selectedPersonFromDirectory); const lines = [`Avelixa chat with ${person}`, `Exported ${new Date().toLocaleString()}`, '']; timeline.forEach(item => item.kind === 'message' ? lines.push(`[${dateOf(item.at)} ${timeOf(item.at)}] ${item.message!.sender_id === user?.id ? 'You' : person}: ${item.message!.content}`) : lines.push(`[${dateOf(item.at)} ${timeOf(item.at)}] ${item.call!.call_type === 'video' ? 'Video' : 'Voice'} call — ${item.call!.status}`)); const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `avelixa-chat-${person.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`; a.click(); URL.revokeObjectURL(url); };
  const deleteSelected = async () => { if (!selectedIds.length) return; const { error: e } = await supabase.from('direct_messages').delete().in('id', selectedIds).eq('sender_id', user?.id || ''); if (!e) { setMessages(cur => cur.filter(m => !selectedIds.includes(m.id))); setSelectedIds([]); setNotice('Selected messages deleted.'); } else setError(errText(e)); };

  const conversationItems = useMemo(() => { const q = search.trim().toLowerCase(); return conversations.filter(c => !q || nameOf({ full_name: c.other_full_name, email: c.other_email }).toLowerCase().includes(q) || c.other_email?.toLowerCase().includes(q)); }, [conversations, search]);
  const chatMessages = useMemo(() => { const q = conversationSearch.trim().toLowerCase(); const visible = clearedAt ? messages.filter(m => m.created_at > clearedAt) : messages; return q ? visible.filter(m => m.content.toLowerCase().includes(q)) : visible; }, [messages, conversationSearch, clearedAt]);
  const timeline = useMemo<TimelineItem[]>(() => [...chatMessages.map(message => ({ kind: 'message' as const, at: message.created_at, message })), ...calls.filter(c => !clearedAt || c.created_at > clearedAt).map(call => ({ kind: 'call' as const, at: call.created_at, call }))].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()), [chatMessages, calls, clearedAt]);
  const unreadTotal = useMemo(() => Object.values(unreadByConversation).reduce((a, b) => a + b, 0), [unreadByConversation]);

  useEffect(() => {
    if (!selectedId || !paneRef.current) return;
    requestAnimationFrame(() => { if (paneRef.current) paneRef.current.scrollTop = paneRef.current.scrollHeight; });
  }, [selectedId]);
  useEffect(() => {
    if (!paneRef.current) return;
    if (firstLoad.current || timeline.length) requestAnimationFrame(() => { if (paneRef.current) paneRef.current.scrollTop = paneRef.current.scrollHeight; });
    firstLoad.current = false;
  }, [timeline.length]);
  useEffect(() => { if (!selectedConversation) return; void supabase.from('user_blocks').select('id').eq('blocker_id', user?.id || '').eq('blocked_id', selectedConversation.other_user_id).limit(1).then(({ data }) => setBlocked(!!data?.length)); }, [selectedConversation?.other_user_id, user?.id]);

  const setWallpaperImage = (file: File) => { if (!selectedId) return; if (!file.type.startsWith('image/')) { setError('Wallpaper must be an image.'); return; } if (file.size > 4 * 1024 * 1024) { setError('Wallpaper must be 4MB or smaller.'); return; } const reader = new FileReader(); reader.onload = () => { const value = String(reader.result); localStorage.setItem(`avelixa-wallpaper:${user.id}:${selectedId}`, value); setWallpaper(value); setNotice('Chat wallpaper updated for this conversation.'); }; reader.readAsDataURL(file); };

  if (!user) return <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">Please sign in to use Avelixa Messages.</div>;
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-accent-400" /></div>;

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-white">Messages</h1><p className="mt-1 text-sm text-gray-500">Private Avelixa communication</p></div><button type="button" onClick={() => setNewChatOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-500"><Plus className="h-4 w-4" /> New chat</button></div>
    {(error || notice) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>{error || notice}<button type="button" className="float-right" onClick={() => { setError(null); setNotice(null); }}><X className="h-4 w-4" /></button></div>}
    <div className="grid min-h-[700px] overflow-hidden rounded-2xl border border-ink-800/50 bg-ink-950/80 shadow-2xl lg:grid-cols-[360px_1fr]">
      <aside className={`${selectedId ? 'hidden lg:flex' : 'flex'} min-h-[700px] flex-col border-r border-ink-800/50`}>
        <div className="border-b border-ink-800/50 p-4"><div className="flex items-center justify-between"><div className="text-sm font-semibold text-white">Chats {unreadTotal > 0 && <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadTotal}</span>}</div><div className="flex items-center gap-1"><button type="button" onClick={() => setAddContactOpen(true)} className="rounded-xl p-2 text-gray-400 hover:bg-white/5 hover:text-white" title="Add contact"><UserPlus className="h-5 w-5" /></button><button type="button" onClick={() => setNewChatOpen(true)} className="rounded-xl p-2 text-gray-400 hover:bg-white/5 hover:text-white" title="New chat"><MessageCirclePlus className="h-5 w-5" /></button></div></div><div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-accent-500/40" /></div></div>
        <div className="flex-1 overflow-y-auto p-2">{conversationItems.length === 0 ? <div className="p-8 text-center"><MessageSquare className="mx-auto h-8 w-8 text-gray-700" /><p className="mt-3 text-sm text-gray-500">No chats yet.</p><button type="button" onClick={() => setAddContactOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-300 hover:text-white"><UserPlus className="h-4 w-4" /> Add contact</button></div> : conversationItems.map(c => { const p = people.find(x => x.user_id === c.other_user_id) || { user_id: c.other_user_id, full_name: c.other_full_name, email: c.other_email, is_online: false, last_seen_at: null, role_context: c.other_role, connector_id: null }; const unread = unreadByConversation[c.conversation_id] || 0; return <button key={c.conversation_id} type="button" onClick={() => void selectConversation(c.conversation_id)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left ${selectedId === c.conversation_id ? 'bg-accent-500/10 border border-accent-500/20' : 'border border-transparent hover:bg-white/5'}`}><Avatar person={p} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-white">{nameOf(p)}</span><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.is_online ? 'bg-emerald-400' : 'bg-gray-600'}`} title={p.is_online ? 'Online' : 'Offline'} /></div><div className="mt-1 flex items-center justify-between gap-2"><span className={`text-[10px] ${p.is_online ? 'text-emerald-400' : 'text-gray-600'}`}>{p.is_online ? 'Online' : 'Offline'}</span>{unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white">{unread}</span>}</div></div></button>; })}</div>
      </aside>
      <section className={`${selectedId ? 'flex' : 'hidden lg:flex'} min-h-[700px] min-w-0 flex-col`} style={wallpaper ? { backgroundImage: `linear-gradient(rgba(8,10,14,.72),rgba(8,10,14,.72)),url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        {!selectedConversation ? <div className="flex flex-1 items-center justify-center p-8 text-center"><div><MessageSquare className="mx-auto h-12 w-12 text-gray-700" /><h2 className="mt-4 text-lg font-semibold text-white">Select a conversation</h2><p className="mt-2 text-sm text-gray-500">Choose someone from your chat list, or start a new chat.</p></div></div> : <>
          <header className="flex items-center justify-between gap-3 border-b border-ink-800/50 bg-ink-950/80 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"><ArrowLeft className="h-5 w-5" /></button><Avatar person={selectedPersonFromDirectory} /><div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{nameOf(selectedPersonFromDirectory)}</div><div className={`text-[10px] ${selectedPersonFromDirectory?.is_online ? 'text-emerald-400' : 'text-gray-500'}`}>{selectedPersonFromDirectory?.is_online ? 'Online' : selectedPersonFromDirectory?.last_seen_at ? `Last seen ${timeOf(selectedPersonFromDirectory.last_seen_at)}` : 'Offline'}</div></div></div><div className="flex items-center gap-1"><button type="button" onClick={() => void startCall('voice')} disabled={busy || blocked} title="Voice call" className="rounded-xl p-2.5 text-gray-300 hover:bg-white/5 hover:text-accent-300 disabled:opacity-40"><Phone className="h-5 w-5" /></button><button type="button" onClick={() => void startCall('video')} disabled={busy || blocked} title="Video call" className="rounded-xl p-2.5 text-gray-300 hover:bg-white/5 hover:text-accent-300 disabled:opacity-40"><Video className="h-5 w-5" /></button><div className="relative"><button type="button" onClick={() => setMenuOpen(v => !v)} className="rounded-xl p-2.5 text-gray-300 hover:bg-white/5"><MoreVertical className="h-5 w-5" /></button>{menuOpen && <div className="absolute right-0 top-11 z-30 w-60 rounded-2xl border border-white/10 bg-ink-900 p-2 shadow-2xl"><button type="button" onClick={() => { setConversationSearch(conversationSearch ? '' : ' '); setMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5"><Search className="h-4 w-4" /> Search conversation</button><button type="button" onClick={() => void toggleMute()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5"><BellOff className="h-4 w-4" /> {muted ? 'Unmute chat' : 'Mute chat'}</button><label className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5"><ImagePlus className="h-4 w-4" /> Change wallpaper<input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setWallpaperImage(f); e.currentTarget.value = ''; }} /></label><button type="button" onClick={() => void blockToggle()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10"><Ban className="h-4 w-4" /> {blocked ? 'Unblock user' : 'Block user'}</button><button type="button" onClick={exportChat} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5"><Download className="h-4 w-4" /> Export chat</button><button type="button" onClick={() => void clearChat()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5"><Trash2 className="h-4 w-4" /> Clear chat</button></div>}</div></div></header>
          {conversationSearch && <div className="border-b border-ink-800/50 px-4 py-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" /><input autoFocus value={conversationSearch.trim()} onChange={e => setConversationSearch(e.target.value)} placeholder="Search this conversation" className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none" /></div></div>}
          <div ref={paneRef} className="flex-1 overflow-y-auto px-4 py-5"><div className="space-y-3">{loadingChat ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent-400" /></div> : timeline.map(item => item.kind === 'message' ? (() => { const m = item.message!; const own = m.sender_id === user.id; const selected = selectedIds.includes(m.id); const recipientOnline = !!selectedPersonFromDirectory?.is_online; return <div key={m.id} className={`group flex ${own ? 'justify-end' : 'justify-start'}`}><div className="max-w-[82%]"><div className={`flex items-end gap-2 ${own ? 'flex-row-reverse' : ''}`}><button type="button" onClick={() => setSelectedIds(cur => cur.includes(m.id) ? cur.filter(id => id !== m.id) : [...cur, m.id])} className={`rounded-2xl px-4 py-3 text-left text-sm leading-6 ${selected ? 'ring-2 ring-accent-400' : ''} ${own ? 'rounded-tr-sm bg-accent-600 text-white' : 'rounded-tl-sm bg-white/10 text-gray-200'}`}>{m.content}</button><button type="button" onClick={() => setReplyTo(m)} title="Reply" className="hidden rounded-lg p-1.5 text-gray-600 group-hover:block hover:bg-white/5 hover:text-gray-300"><ChevronDown className="h-4 w-4 rotate-90" /></button></div><div className={`mt-1 flex items-center gap-1 px-1 text-[9px] text-gray-600 ${own ? 'justify-end' : ''}`}>{timeOf(m.created_at)} {own && (m.read_at ? <CheckCheck className="h-3.5 w-3.5 text-sky-400" title="Read" /> : recipientOnline ? <CheckCheck className="h-3.5 w-3.5 text-gray-400" title="Delivered" /> : <Check className="h-3.5 w-3.5 text-gray-500" title="Sent" />)}</div></div></div>; })() : (() => { const c = item.call!; const mine = c.caller_id === user.id; const label = c.status === 'ringing' ? 'Calling' : c.status === 'answered' ? 'Call' : c.status === 'declined' ? 'Declined call' : c.status === 'missed' ? 'Missed call' : 'Call'; return <div key={`call-${c.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/10 text-accent-300">{c.call_type === 'video' ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}</span><span>{label} • {c.call_type === 'video' ? 'Video' : 'Voice'} {c.duration_seconds ? `• ${Math.floor(c.duration_seconds / 60)}:${String(c.duration_seconds % 60).padStart(2, '0')}` : ''}</span><span>{timeOf(c.created_at)}</span></div></div>; })())}{typing && <div className="text-xs italic text-gray-500">{nameOf(selectedPersonFromDirectory)} is typing…</div>}<div ref={endRef} /></div></div>
          {selectedIds.length > 0 && <div className="border-t border-ink-800/50 bg-ink-950/90 px-4 py-2 flex items-center justify-between"><span className="text-xs text-gray-400">{selectedIds.length} selected</span><div className="flex gap-2"><button type="button" onClick={() => navigator.clipboard?.writeText(messages.filter(m => selectedIds.includes(m.id)).map(m => m.content).join('\n'))} className="rounded-lg p-2 text-gray-300 hover:bg-white/5" title="Copy"><Clipboard className="h-4 w-4" /></button><button type="button" onClick={() => void deleteSelected()} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10" title="Delete selected"><Trash2 className="h-4 w-4" /></button></div></div>}
          {replyTo && <div className="border-t border-ink-800/50 bg-accent-500/5 px-4 py-2"><div className="flex items-center justify-between"><div className="min-w-0"><div className="text-[10px] text-accent-300">Replying to message</div><div className="truncate text-xs text-gray-400">{replyTo.content}</div></div><button type="button" onClick={() => setReplyTo(null)}><X className="h-4 w-4 text-gray-500" /></button></div></div>}
          <form onSubmit={sendMessage} className="border-t border-ink-800/50 bg-ink-950/80 p-3"><div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 focus-within:border-accent-500/30"><textarea value={messageText} disabled={blocked || busy} onChange={e => { setMessageText(e.target.value); sendTyping(!!e.target.value); }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={5000} placeholder={blocked ? 'You blocked this user.' : 'Type a message…'} className="min-h-[46px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-gray-600" /><button type="submit" disabled={!messageText.trim() || busy || blocked} className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-40"><Send className="h-4 w-4" /></button></div></form>
        </>}
      </section>
    </div>
    {newChatOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-ink-900 shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h2 className="font-semibold text-white">New chat</h2><p className="text-xs text-gray-500">Search for a saved contact or an exact Avelixa identifier</p></div><button type="button" onClick={() => setNewChatOpen(false)}><X className="h-5 w-5 text-gray-500" /></button></div><div className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" /><input autoFocus value={newChatQuery} onChange={e => setNewChatQuery(e.target.value)} placeholder="Name, email or Connector ID" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-3 text-sm text-white outline-none focus:border-accent-500/40" /></div><div className="mt-3 max-h-[420px] overflow-y-auto">{!newChatQuery.trim() ? <div className="p-8 text-center text-sm text-gray-500">Enter a name, email or Connector ID. Your saved contacts are not shown as a global directory.</div> : searchResults.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No matching Avelixa user found. Use <button type="button" className="text-accent-300 underline" onClick={() => { setNewChatOpen(false); setAddContactOpen(true); }}>Add contact</button> to save or invite someone.</div> : searchResults.map(p => <button key={p.user_id} type="button" onClick={() => void startConversation(p)} className="mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-white/5"><Avatar person={p} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{nameOf(p)}</div><div className="truncate text-xs text-gray-500">{p.email || p.connector_id || 'Avelixa user'}</div><div className={`mt-1 text-[10px] ${p.is_online ? 'text-emerald-400' : 'text-gray-600'}`}>{p.is_online ? 'Online' : 'Offline'}</div></div><MessageSquare className="h-4 w-4 text-accent-400" /></button>)}</div></div></div></div>}
    {addContactOpen && <div className="fixed inset-0 z-[71] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-900 shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h2 className="font-semibold text-white">Add contact</h2><p className="text-xs text-gray-500">Save a person privately. Avelixa will never show you a global user directory.</p></div><button type="button" onClick={() => setAddContactOpen(false)}><X className="h-5 w-5 text-gray-500" /></button></div><div className="space-y-3 p-5"><input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact name" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none" /><input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email address" type="email" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none" /><input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Phone number (optional)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none" /><div className="flex gap-2 pt-2"><button type="button" onClick={() => setAddContactOpen(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-gray-300">Cancel</button><button type="button" disabled={busy} onClick={() => void addContact()} className="flex-1 rounded-xl bg-accent-600 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save contact'}</button></div></div></div></div>}
    {incomingCall && <div className="fixed right-4 top-4 z-[75] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-emerald-500/20 bg-ink-900 p-4 shadow-2xl"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">{incomingCall.call_type === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white">Incoming {incomingCall.call_type} call</div><div className="text-xs text-gray-500">{nameOf(people.find(p => p.user_id === incomingCall.caller_id))}</div></div><Volume2 className="h-4 w-4 animate-pulse text-emerald-400" /></div><div className="mt-4 flex gap-2"><button type="button" onClick={() => { setIncomingCall(null); void supabase.from('call_sessions').update({ status: 'declined', ended_at: new Date().toISOString() }).eq('id', incomingCall.id); }} className="flex-1 rounded-xl border border-red-500/20 bg-red-500/10 py-2.5 text-sm text-red-300"><PhoneOff className="mr-2 inline h-4 w-4" />Decline</button><button type="button" onClick={() => void acceptIncoming(incomingCall)} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white"><Phone className="mr-2 inline h-4 w-4" />Answer</button></div></div>}
    {activeCall && <CallOverlayV2 call={activeCall} onClose={() => { setActiveCall(null); void refreshDirectory(); if (selectedId) void loadChat(selectedId); }} />}
  </div>;
}
