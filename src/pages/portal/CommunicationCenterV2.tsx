import { FormEvent, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { ArrowLeft, Ban, BellOff, Check, CheckCheck, Clipboard, Download, Loader2, MessageCirclePlus, MessageSquare, MoreVertical, Phone, Plus, Search, Send, Settings2, Trash2, UserPlus, UserRound, Video, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { ActiveCall } from '../../components/portal/CallOverlayV2';

const CallOverlayV2 = lazy(() => import('../../components/portal/CallOverlayV2'));

type Person = { user_id: string; full_name: string | null; email: string | null; role_context: string | null; connector_id: string | null; is_online: boolean; last_seen_at: string | null; avatar_url?: string | null; contact_name?: string | null };
type Conversation = { id: string; otherUserId: string; otherName: string; otherEmail: string | null; otherRole: string | null; updated_at: string; kind: 'direct' | 'admin' };
type Message = { id: string; conversation_id: string; sender_id: string; content: string; read_at: string | null; created_at: string; kind: 'direct' | 'admin' };
type CallEvent = { id: string; call_type: 'voice' | 'video'; status: string; caller_id: string; callee_id: string; created_at: string; duration_seconds: number | null; conversation_id: string };

type Wallpaper = { id: string; label: string; className: string };
const WALLPAPERS: Wallpaper[] = [
  { id: 'default', label: 'Avelixa Dark', className: 'bg-[#0b0d12]' },
  { id: 'slate', label: 'Slate', className: 'bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950' },
  { id: 'midnight', label: 'Midnight', className: 'bg-gradient-to-br from-indigo-950 via-slate-950 to-black' },
  { id: 'forest', label: 'Forest', className: 'bg-gradient-to-br from-emerald-950 via-slate-950 to-black' },
  { id: 'plum', label: 'Plum', className: 'bg-gradient-to-br from-purple-950 via-slate-950 to-black' },
  { id: 'sand', label: 'Warm', className: 'bg-gradient-to-br from-amber-950 via-stone-950 to-black' },
];

const nameOf = (name?: string | null, email?: string | null, contactName?: string | null) => contactName?.trim() || name?.trim() || email?.trim() || 'Avelixa User';
const timeOf = (v: string) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dateOf = (v: string) => new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const errOf = (e: unknown) => { if (!e) return 'Unknown error.'; if (typeof e === 'object' && e !== null) { const x = e as { message?: string; details?: string; hint?: string; code?: string }; return [x.message, x.details, x.hint ? `Hint: ${x.hint}` : undefined, x.code ? `Code: ${x.code}` : undefined].filter(Boolean).join(' • ') || 'Something went wrong.'; } return String(e); };

function Avatar({ person, size = 'h-11 w-11' }: { person?: Person | null; size?: string }) {
  const label = nameOf(person?.full_name, person?.email, person?.contact_name);
  return <div className={`${size} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-accent-500/10 text-accent-300 font-semibold`}>
    {person?.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : label.charAt(0).toUpperCase()}
    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink-950 ${person?.is_online ? 'bg-emerald-400' : 'bg-gray-600'}`} />
  </div>;
}

export default function CommunicationCenterV2() {
  const { user, roles } = useAuth();
  const management = roles.map(r => String(r).toLowerCase()).some(r => r === 'owner' || r === 'admin');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Person[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [calls, setCalls] = useState<CallEvent[]>([]);
  const [presence, setPresence] = useState<Person | null>(null);
  const [query, setQuery] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [text, setText] = useState('');
  const [reply, setReply] = useState<Message | null>(null);
  const [menu, setMenu] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [wallpaper, setWallpaper] = useState('default');
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadContacts = async () => {
    if (!user) return;
    const { data: rows, error: e } = await supabase.from('user_contacts').select('contact_user_id,contact_name').eq('user_id', user.id);
    if (e) return;
    const ids = (rows || []).map(r => r.contact_user_id);
    if (!ids.length) { setContacts([]); return; }
    const [{ data: ps }, { data: prs }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,avatar_url').in('id', ids),
      supabase.from('user_presence').select('user_id,is_online,last_seen_at').in('user_id', ids),
    ]);
    const pm = new Map((ps || []).map(p => [p.id, p]));
    const pr = new Map((prs || []).map(p => [p.user_id, p]));
    setContacts((rows || []).map(r => { const p = pm.get(r.contact_user_id); const s = pr.get(r.contact_user_id); return { user_id: r.contact_user_id, full_name: p?.full_name || null, email: p?.email || null, avatar_url: p?.avatar_url || null, role_context: null, connector_id: null, is_online: !!s?.is_online, last_seen_at: s?.last_seen_at || null, contact_name: r.contact_name || null }; }));
  };

  const loadUnread = async (convos: Conversation[]) => {
    if (!user || !convos.length) { setUnreadByConversation({}); return; }
    const direct = convos.filter(c => c.kind === 'direct').map(c => c.id);
    const admin = convos.filter(c => c.kind === 'admin').map(c => c.id);
    const counts: Record<string, number> = {};
    if (direct.length) {
      const { data } = await supabase.from('direct_messages').select('conversation_id').in('conversation_id', direct).neq('sender_id', user.id).is('read_at', null);
      (data || []).forEach(r => { counts[r.conversation_id] = (counts[r.conversation_id] || 0) + 1; });
    }
    if (admin.length) {
      const { data } = await supabase.from('admin_messages').select('conversation_id').in('conversation_id', admin).neq('sender_id', user.id).is('read_at', null);
      (data || []).forEach(r => { counts[r.conversation_id] = (counts[r.conversation_id] || 0) + 1; });
    }
    setUnreadByConversation(counts);
  };

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.rpc('list_direct_conversations');
      if (e) throw e;
      const direct = ((data || []) as Array<{ conversation_id: string; other_user_id: string; other_full_name: string | null; other_email: string | null; other_role: string | null; updated_at: string }>).map(r => ({ kind: 'direct' as const, id: r.conversation_id, otherUserId: r.other_user_id, otherName: nameOf(r.other_full_name, r.other_email), otherEmail: r.other_email, otherRole: r.other_role, updated_at: r.updated_at }));
      let admin: Conversation[] = [];
      if (!management) {
        const { data: cid, error: ce } = await supabase.rpc('get_or_create_admin_portal_conversation');
        if (!ce && cid) {
          const { data: row } = await supabase.from('admin_conversations').select('id,user_id,admin_id,updated_at').eq('id', cid).maybeSingle();
          if (row) admin = [{ kind: 'admin', id: row.id, otherUserId: row.admin_id, otherName: 'Avelixa Admin', otherEmail: null, otherRole: 'admin', updated_at: row.updated_at }];
        }
      } else {
        const { data: rows, error: ae } = await supabase.from('admin_conversations').select('id,user_id,admin_id,updated_at').order('updated_at', { ascending: false });
        if (!ae) { const ids = (rows || []).map(r => r.user_id); const { data: ps } = ids.length ? await supabase.from('profiles').select('id,full_name,email').in('id', ids) : { data: [] as any[] }; const map = new Map((ps || []).map(p => [p.id, p])); admin = (rows || []).map(r => ({ kind: 'admin' as const, id: r.id, otherUserId: r.user_id, otherName: nameOf(map.get(r.user_id)?.full_name, map.get(r.user_id)?.email), otherEmail: map.get(r.user_id)?.email || null, otherRole: 'client', updated_at: r.updated_at })); }
      }
      const merged = [...direct, ...admin].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setConversations(merged); await Promise.all([loadContacts(), loadUnread(merged)]);
    } catch (e) { setError(`Messages could not be loaded: ${errOf(e)}`); } finally { setLoading(false); }
  };

  useEffect(() => { if (user) void loadConversations(); }, [user?.id, management]);

  const contactMap = useMemo(() => new Map(contacts.map(c => [c.user_id, c])), [contacts]);
  const selected = conversations.find(c => c.id === selectedId) || null;
  const selectedPerson = selected ? (contactMap.get(selected.otherUserId) || { user_id: selected.otherUserId, full_name: selected.otherName, email: selected.otherEmail, role_context: selected.otherRole, connector_id: null, is_online: !!presence?.is_online, last_seen_at: presence?.last_seen_at || null }) : null;
  const displaySelectedName = selected ? nameOf(selected.otherName, selected.otherEmail, contactMap.get(selected.otherUserId)?.contact_name) : '';
  const filteredConversations = useMemo(() => { const q = query.trim().toLowerCase(); return conversations.filter(c => { const label = nameOf(c.otherName, c.otherEmail, contactMap.get(c.otherUserId)?.contact_name); return !q || `${label} ${c.otherEmail || ''} ${c.otherRole || ''}`.toLowerCase().includes(q); }); }, [conversations, query, contactMap]);
  const visibleMessages = useMemo(() => messages.filter(m => !clearedAt || new Date(m.created_at) > new Date(clearedAt)).filter(m => !chatSearch.trim() || m.content.toLowerCase().includes(chatSearch.trim().toLowerCase())), [messages, clearedAt, chatSearch]);

  const timeline = useMemo(() => [...visibleMessages.map(m => ({ kind: 'message' as const, at: m.created_at, item: m })), ...calls.filter(c => !clearedAt || new Date(c.created_at) > new Date(clearedAt)).map(c => ({ kind: 'call' as const, at: c.created_at, item: c }))].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()), [visibleMessages, calls, clearedAt]);
  const wallpaperClass = WALLPAPERS.find(w => w.id === wallpaper)?.className || WALLPAPERS[0].className;

  const loadSelected = async (conversation: Conversation) => {
    if (!user) return;
    setError(null); setSelectedIds([]); setChatSearch('');
    try {
      if (conversation.kind === 'direct') {
        const [{ data: ms, error: me }, { data: cs, error: ce }, { data: p }, { data: b }] = await Promise.all([
          supabase.from('direct_messages').select('id,conversation_id,sender_id,content,read_at,created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }),
          supabase.from('call_sessions').select('id,call_type,status,caller_id,callee_id,created_at,duration_seconds').eq('direct_conversation_id', conversation.id).order('created_at', { ascending: true }).limit(100),
          supabase.from('conversation_preferences').select('cleared_at,muted,wallpaper').eq('user_id', user.id).eq('conversation_id', conversation.id).maybeSingle(),
          supabase.from('user_blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', conversation.otherUserId).maybeSingle(),
        ]);
        if (me) throw me; if (ce) throw ce;
        setMessages(((ms || []) as Array<Omit<Message, 'kind'>>).map(m => ({ ...m, kind: 'direct' })));
        setCalls(((cs || []) as Array<Omit<CallEvent, 'conversation_id'>>).map(c => ({ ...c, conversation_id: conversation.id })));
        setClearedAt(p?.cleared_at || null); setMuted(Boolean(p?.muted)); setWallpaper(p?.wallpaper || 'default'); setBlocked(Boolean(b));
        const { data: pr } = await supabase.from('user_presence').select('user_id,is_online,last_seen_at').eq('user_id', conversation.otherUserId).maybeSingle();
        const person = contactMap.get(conversation.otherUserId); setPresence({ user_id: conversation.otherUserId, full_name: person?.full_name || conversation.otherName, email: person?.email || conversation.otherEmail, avatar_url: person?.avatar_url, role_context: conversation.otherRole, connector_id: person?.connector_id || null, is_online: !!pr?.is_online, last_seen_at: pr?.last_seen_at || null, contact_name: person?.contact_name || null });
      } else {
        const [{ data: ms, error: me }, { data: cs, error: ce }] = await Promise.all([
          supabase.from('admin_messages').select('id,conversation_id,sender_id,recipient_id,content,read_at,created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }),
          supabase.from('call_sessions').select('id,call_type,status,caller_id,callee_id,created_at,duration_seconds').eq('admin_conversation_id', conversation.id).order('created_at', { ascending: true }).limit(100),
        ]);
        if (me) throw me; if (ce) throw ce;
        setMessages(((ms || []) as Array<Omit<Message, 'kind'>>).map(m => ({ ...m, kind: 'admin' })));
        setCalls(((cs || []) as Array<Omit<CallEvent, 'conversation_id'>>).map(c => ({ ...c, conversation_id: conversation.id })));
        setClearedAt(null); setMuted(false); setWallpaper('default'); setBlocked(false); setPresence(null);
      }
      await markRead(conversation);
    } catch (e) { setError(`Conversation could not be loaded: ${errOf(e)}`); }
  };

  const markRead = async (conversation: Conversation) => {
    if (!user) return;
    const table = conversation.kind === 'direct' ? 'direct_messages' : 'admin_messages';
    const { data } = await supabase.from(table).select('id').eq('conversation_id', conversation.id).neq('sender_id', user.id).is('read_at', null);
    const ids = (data || []).map(r => r.id); if (!ids.length) return;
    const now = new Date().toISOString(); const { error: e } = await supabase.from(table).update({ read_at: now }).in('id', ids);
    if (!e) { setMessages(cur => cur.map(m => ids.includes(m.id) ? { ...m, read_at: now } : m)); setUnreadByConversation(cur => ({ ...cur, [conversation.id]: 0 })); }
  };

  useEffect(() => { if (selected) void loadSelected(selected); else { setMessages([]); setCalls([]); setPresence(null); setBlocked(false); setMuted(false); setClearedAt(null); setWallpaper('default'); } }, [selectedId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [timeline.length, selectedId]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`avelixa-communication-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
        const m = payload.new as Omit<Message, 'kind'>;
        if (m.sender_id === user.id) return;
        if (m.conversation_id === selectedId) { setMessages(cur => cur.some(x => x.id === m.id) ? cur : [...cur, { ...m, kind: 'direct' }]); void markRead(conversations.find(c => c.id === m.conversation_id) || ({ id: m.conversation_id, kind: 'direct' } as Conversation)); }
        void loadUnread(conversations);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, payload => { const m = payload.new as Omit<Message, 'kind'>; setMessages(cur => cur.map(x => x.id === m.id ? { ...x, ...m, kind: 'direct' } : x)); void loadUnread(conversations); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions' }, payload => {
        const c = payload.new as Omit<CallEvent, 'conversation_id'> & { direct_conversation_id?: string | null; admin_conversation_id?: string | null };
        const conversationId = c.direct_conversation_id || c.admin_conversation_id; if (!conversationId) return;
        const event = { ...c, conversation_id: conversationId } as CallEvent;
        if (conversationId === selectedId) setCalls(cur => cur.some(x => x.id === event.id) ? cur : [...cur, event]);
        if (c.callee_id === user.id && c.status === 'ringing') { void loadConversations(); }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, selectedId]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      void loadContacts();
      void loadConversations();
      if (selected) {
        void supabase.from('user_presence').select('user_id,is_online,last_seen_at').eq('user_id', selected.otherUserId).maybeSingle().then(({ data }) => setPresence(cur => cur ? { ...cur, is_online: !!data?.is_online, last_seen_at: data?.last_seen_at || null } : cur));
      }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [user?.id, selectedId]);

  useEffect(() => { if (selected) void markRead(selected); }, [selectedId]);

  const searchPeople = async (event: FormEvent) => { event.preventDefault(); setSearching(true); setError(null); try { const { data, error: e } = await supabase.rpc('search_communication_users', { p_query: query.trim() }); if (e) throw e; setPeople(((data || []) as Person[]).filter(p => p.user_id !== user?.id)); setShowPeople(true); } catch (e) { setError(errOf(e)); } finally { setSearching(false); } };
  const openPerson = async (person: Person) => { try { const { data, error: e } = await supabase.rpc('get_or_create_direct_conversation', { p_recipient_id: person.user_id }); if (e) throw e; await supabase.rpc('communication_add_contact', { p_contact_user_id: person.user_id }); await loadConversations(); setSelectedId(data as string); setShowPeople(false); setQuery(''); } catch (e) { setError(errOf(e)); } };
  const saveContact = async (person: Person) => { const { error: e } = await supabase.rpc('communication_add_contact', { p_contact_user_id: person.user_id }); if (e) setError(errOf(e)); else { await loadContacts(); setNotice('Contact saved.'); } };
  const renameContact = async () => {
    if (!user || !selected) return;
    const current = contactMap.get(selected.otherUserId)?.contact_name || '';
    const label = window.prompt('Save this contact as:', current || displaySelectedName);
    if (label === null) return;
    const { error: e } = await supabase.from('user_contacts').upsert({ user_id: user.id, contact_user_id: selected.otherUserId, contact_name: label.trim() || null }, { onConflict: 'user_id,contact_user_id' });
    if (e) setError(errOf(e)); else { await loadContacts(); setNotice('Contact name updated.'); }
  };
  const blockUser = async () => { if (!selected || selected.kind !== 'direct') return; const { error: e } = await supabase.rpc('communication_block_user', { p_blocked_id: selected.otherUserId }); if (e) setError(errOf(e)); else { setBlocked(true); setMenu(false); setNotice('User blocked.'); } };
  const unblockUser = async () => { if (!selected || selected.kind !== 'direct') return; const { error: e } = await supabase.rpc('communication_unblock_user', { p_blocked_id: selected.otherUserId }); if (e) setError(errOf(e)); else { setBlocked(false); setMenu(false); setNotice('User unblocked.'); } };
  const toggleMute = async () => { if (!user || !selected) return; const next = !muted; const { error: e } = await supabase.from('conversation_preferences').upsert({ user_id: user.id, conversation_id: selected.id, muted: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id,conversation_id' }); if (e) setError(errOf(e)); else { setMuted(next); setNotice(next ? 'Chat muted.' : 'Chat unmuted.'); } };
  const clearChat = async () => { if (!user || !selected) return; if (selected.kind !== 'direct') { setMessages([]); setCalls([]); setMenu(false); setNotice('Chat cleared from this view.'); return; } const now = new Date().toISOString(); const { error: e } = await supabase.from('conversation_preferences').upsert({ user_id: user.id, conversation_id: selected.id, cleared_at: now, updated_at: now }, { onConflict: 'user_id,conversation_id' }); if (e) setError(errOf(e)); else { setClearedAt(now); setMessages([]); setCalls([]); setMenu(false); setNotice('Chat cleared for you.'); } };
  const setChatWallpaper = async (id: string) => { if (!user || !selected || selected.kind !== 'direct') return; const { error: e } = await supabase.from('conversation_preferences').upsert({ user_id: user.id, conversation_id: selected.id, wallpaper: id, updated_at: new Date().toISOString() }, { onConflict: 'user_id,conversation_id' }); if (e) setError(errOf(e)); else { setWallpaper(id); setWallpaperOpen(false); setNotice('Chat wallpaper updated.'); } };
  const exportChat = () => { if (!selected) return; const lines = [`Avelixa chat with ${displaySelectedName}`, '']; timeline.forEach(x => { if (x.kind === 'message') lines.push(`[${dateOf(x.item.created_at)}] ${x.item.sender_id === user?.id ? 'You' : displaySelectedName}: ${x.item.content}`); else lines.push(`[${dateOf(x.item.created_at)}] ${x.item.call_type === 'video' ? 'Video' : 'Voice'} call — ${x.item.status}${x.item.duration_seconds ? ` — ${x.item.duration_seconds}s` : ''}`); }); const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `avelixa-${displaySelectedName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`; a.click(); URL.revokeObjectURL(url); setMenu(false); };
  const sendMessage = async (event: FormEvent) => { event.preventDefault(); if (!user || !selected || blocked || !text.trim() || sending) return; setSending(true); setError(null); try { let content = text.trim(); if (reply) content = `↩ ${displaySelectedName}: ${reply.content}\n${content}`; if (selected.kind === 'direct') { const { error: e } = await supabase.from('direct_messages').insert({ conversation_id: selected.id, sender_id: user.id, content }); if (e) throw e; } else { const { error: e } = await supabase.from('admin_messages').insert({ conversation_id: selected.id, sender_id: user.id, recipient_id: selected.otherUserId, content }); if (e) throw e; } setText(''); setReply(null); await loadConversations(); } catch (e) { setError(errOf(e)); } finally { setSending(false); } };
  const deleteSelected = async () => { if (!selectedIds.length || !user || !selected) return; const table = selected.kind === 'direct' ? 'direct_messages' : 'admin_messages'; const { error: e } = await supabase.from(table).delete().in('id', selectedIds).eq('sender_id', user.id); if (e) setError(errOf(e)); else { setMessages(cur => cur.filter(m => !selectedIds.includes(m.id))); setSelectedIds([]); setNotice('Selected messages deleted.'); } };
  const startCall = async (type: 'voice' | 'video') => { if (!user || !selected || blocked) return; try { const payload: Record<string, unknown> = { caller_id: user.id, callee_id: selected.otherUserId, call_type: type, status: 'ringing' }; if (selected.kind === 'direct') payload.direct_conversation_id = selected.id; else payload.admin_conversation_id = selected.id; const { data, error: e } = await supabase.from('call_sessions').insert(payload).select('id').single(); if (e) throw e; setActiveCall({ id: data.id, callType: type, callerId: user.id, calleeId: selected.otherUserId, remoteName: displaySelectedName, isIncoming: false, directConversationId: selected.kind === 'direct' ? selected.id : null, adminConversationId: selected.kind === 'admin' ? selected.id : null }); } catch (e) { setError(`Could not start call: ${errOf(e)}`); } };

  const messageTicks = (m: Message) => {
    if (m.sender_id !== user?.id) return null;
    if (m.read_at) return <CheckCheck className="h-3.5 w-3.5 text-sky-400" aria-label="Read" />;
    if (presence?.is_online) return <CheckCheck className="h-3.5 w-3.5 text-gray-400" aria-label="Delivered — recipient online" />;
    return <Check className="h-3.5 w-3.5 text-gray-500" aria-label="Sent — recipient offline" />;
  };

  if (!user) return <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">Please sign in to use Avelixa Messages.</div>;
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-accent-400" /></div>;

  return <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 shadow-2xl">
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px]">
      <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] shrink-0 flex-col border-r border-white/10 bg-ink-950/80`}>
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between"><div><div className="text-lg font-semibold text-white">Messages</div><div className="mt-1 text-xs text-gray-500">Your conversations</div></div><button type="button" onClick={() => setShowPeople(v => !v)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300 hover:bg-white/10" aria-label="New chat"><MessageCirclePlus className="h-5 w-5" /></button></div>
          <form onSubmit={searchPeople} className="mt-4 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chats or find a person" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/40" /></div><button type="submit" disabled={searching} className="rounded-xl border border-accent-500/20 bg-accent-500/10 px-3 text-accent-300">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button></form>
        </div>
        {showPeople && <div className="max-h-72 overflow-y-auto border-b border-white/10 bg-ink-950">{people.length ? people.map(p => <div key={p.user_id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"><button type="button" onClick={() => void openPerson(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Avatar person={p} /><div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{nameOf(p.full_name, p.email, p.contact_name)}</div><div className="truncate text-xs text-gray-500">{p.email || p.connector_id || p.role_context || 'Avelixa user'}</div><div className="mt-1 text-[10px] text-gray-600">{p.is_online ? 'Online' : 'Offline'}</div></div></button><button type="button" onClick={() => void saveContact(p)} className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white" aria-label="Save contact"><UserPlus className="h-4 w-4" /></button></div>) : <div className="p-5 text-sm text-gray-500">Search for a name, email or Connector ID. Your saved contacts are not exposed as a directory.</div>}</div>}
        <div className="flex-1 overflow-y-auto">{filteredConversations.length ? filteredConversations.map(c => { const p = contactMap.get(c.otherUserId); const label = nameOf(c.otherName, c.otherEmail, p?.contact_name); const count = unreadByConversation[c.id] || 0; return <button key={`${c.kind}-${c.id}`} type="button" onClick={() => { setSelectedId(c.id); setShowPeople(false); }} className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-4 text-left ${selectedId === c.id ? 'bg-accent-500/10' : 'hover:bg-white/5'}`}><Avatar person={p || { user_id: c.otherUserId, full_name: c.otherName, email: c.otherEmail, role_context: c.otherRole, connector_id: null, is_online: false, last_seen_at: null }} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-white">{label}</span><span className="text-[10px] text-gray-600">{timeOf(c.updated_at)}</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-xs text-gray-500">{c.otherRole || (c.kind === 'admin' ? 'Admin' : 'Avelixa')}</span>{count > 0 && <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</span>}</div></div></button>; }) : <div className="p-8 text-center text-sm text-gray-500"><MessageSquare className="mx-auto h-8 w-8 text-gray-700" /><div className="mt-3">No conversations yet.</div><button type="button" onClick={() => setShowPeople(true)} className="mt-3 inline-flex items-center gap-2 text-accent-300"><Plus className="h-4 w-4" /> New contact</button></div>}</div>
      </aside>
      <section className={`${selectedId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col ${wallpaperClass}`}>
        {!selected ? <div className="flex flex-1 items-center justify-center p-8 text-center"><div><MessageSquare className="mx-auto h-12 w-12 text-gray-700" /><h2 className="mt-4 text-lg font-semibold text-white">Select a conversation</h2><p className="mt-2 text-sm text-gray-500">Choose a chat from the left or start a new one.</p></div></div> : <>
          <header className="flex items-center gap-3 border-b border-white/10 bg-ink-950/80 px-4 py-3"><button type="button" className="rounded-xl p-2 text-gray-400 hover:bg-white/5 md:hidden" onClick={() => setSelectedId(null)}><ArrowLeft className="h-5 w-5" /></button><Avatar person={selectedPerson} /><div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{displaySelectedName}</div><div className="text-xs text-gray-500">{presence?.is_online ? <span className="text-emerald-400">Online</span> : presence?.last_seen_at ? `Last seen ${dateOf(presence.last_seen_at)}` : 'Offline'}</div></div><button type="button" onClick={() => void startCall('voice')} disabled={blocked} className="rounded-xl p-2 text-gray-300 hover:bg-white/5 disabled:opacity-40" aria-label="Voice call"><Phone className="h-5 w-5" /></button><button type="button" onClick={() => void startCall('video')} disabled={blocked} className="rounded-xl p-2 text-gray-300 hover:bg-white/5 disabled:opacity-40" aria-label="Video call"><Video className="h-5 w-5" /></button><div className="relative"><button type="button" onClick={() => setMenu(v => !v)} className="rounded-xl p-2 text-gray-400 hover:bg-white/5"><MoreVertical className="h-5 w-5" /></button>{menu && <div className="absolute right-0 top-11 z-30 w-60 rounded-2xl border border-white/10 bg-ink-950 p-2 shadow-2xl"><button type="button" onClick={() => { setChatSearch(v => v ? '' : ' '); setMenu(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><Search className="h-4 w-4" />Search conversation</button><button type="button" onClick={renameContact} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><UserRound className="h-4 w-4" />Save contact name</button><button type="button" onClick={() => void toggleMute()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><BellOff className="h-4 w-4" />{muted ? 'Unmute chat' : 'Mute chat'}</button><button type="button" onClick={() => setWallpaperOpen(v => !v)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><Settings2 className="h-4 w-4" />Chat wallpaper</button><button type="button" onClick={exportChat} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><Download className="h-4 w-4" />Export chat</button><button type="button" onClick={() => void clearChat()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><Trash2 className="h-4 w-4" />Clear chat</button>{selected.kind === 'direct' && <button type="button" onClick={() => void (blocked ? unblockUser() : blockUser())} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Ban className="h-4 w-4" />{blocked ? 'Unblock user' : 'Block user'}</button>}</div>}</div></header>
          {wallpaperOpen && selected.kind === 'direct' && <div className="border-b border-white/10 bg-ink-950/90 px-4 py-3"><div className="mb-2 text-xs font-semibold text-gray-400">Choose chat wallpaper</div><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{WALLPAPERS.map(w => <button key={w.id} type="button" onClick={() => void setChatWallpaper(w.id)} className={`h-12 rounded-xl border ${wallpaper === w.id ? 'border-accent-400 ring-2 ring-accent-500/20' : 'border-white/10'} ${w.className}`} title={w.label} />)}</div></div>}
          {chatSearch.trim() !== '' && <div className="border-b border-white/10 bg-ink-950/80 px-4 py-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input autoFocus value={chatSearch.trim() === ' ' ? '' : chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Search this conversation" className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none" /></div></div>}
          {(error || notice) && <div className={`mx-4 mt-3 rounded-xl border px-3 py-2 text-xs ${error ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>{error || notice}<button type="button" className="float-right" onClick={() => { setError(null); setNotice(null); }}><X className="h-4 w-4" /></button></div>}
          <div className="flex-1 overflow-y-auto p-4"><div className="space-y-3">{timeline.map(entry => entry.kind === 'message' ? (() => { const m = entry.item; const own = m.sender_id === user.id; const selectedMsg = selectedIds.includes(m.id); return <div key={m.id} className={`group flex ${own ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${own ? 'bg-accent-600 text-white' : 'bg-white/10 text-gray-200'} ${selectedMsg ? 'ring-2 ring-accent-400' : ''}`}><button type="button" onClick={() => setSelectedIds(cur => cur.includes(m.id) ? cur.filter(id => id !== m.id) : [...cur, m.id])} className="block w-full text-left"><div className="whitespace-pre-wrap break-words text-sm leading-6">{m.content}</div></button><div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-400"><button type="button" onClick={() => setReply(m)} className="hidden mr-1 text-accent-200 group-hover:inline">Reply</button><span>{timeOf(m.created_at)}</span>{messageTicks(m)}</div></div></div>; })() : (() => { const c = entry.item; const mine = c.caller_id === user.id; return <div key={`call-${c.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className="flex max-w-[82%] items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-gray-300"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-300">{c.call_type === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}</span><div><div className="font-medium text-gray-200">{mine ? 'You' : displaySelectedName} {c.call_type === 'video' ? 'video call' : 'voice call'} · {c.status}</div><div className="mt-0.5 text-[10px] text-gray-500">{timeOf(c.created_at)}{c.duration_seconds != null ? ` · ${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s` : ''}</div></div></div></div>; })())}<div ref={endRef} /></div></div>
          {selectedIds.length > 0 && <div className="flex items-center justify-between border-t border-white/10 bg-ink-950/90 px-4 py-2"><span className="text-xs text-gray-400">{selectedIds.length} selected</span><div className="flex gap-2"><button type="button" onClick={() => void navigator.clipboard?.writeText(messages.filter(m => selectedIds.includes(m.id)).map(m => m.content).join('\n'))} className="rounded-lg p-2 text-gray-300 hover:bg-white/5" aria-label="Copy"><Clipboard className="h-4 w-4" /></button><button type="button" onClick={() => void deleteSelected()} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10" aria-label="Delete selected"><Trash2 className="h-4 w-4" /></button></div></div>}
          {reply && <div className="flex items-center justify-between border-t border-white/10 bg-ink-950/90 px-4 py-2"><div className="truncate text-xs text-gray-400">Replying to: {reply.content}</div><button type="button" onClick={() => setReply(null)}><X className="h-4 w-4 text-gray-500" /></button></div>}
          {blocked && <div className="border-t border-red-500/10 bg-red-500/5 px-4 py-3 text-center text-xs text-red-300">This user is blocked. Messaging and calls are disabled.</div>}
          <form onSubmit={sendMessage} className="border-t border-white/10 bg-ink-950/90 p-3"><div className="flex items-end gap-2"><textarea value={text} onChange={e => setText(e.target.value)} disabled={blocked} rows={1} maxLength={5000} placeholder={blocked ? 'Blocked' : 'Write a message…'} className="min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/30"/><button type="submit" disabled={sending || blocked || !text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div></form>
        </>}
      </section>
    </div>
    {showPeople && selectedId === null && null}
    {activeCall && <Suspense fallback={null}><CallOverlayV2 call={activeCall} onClose={() => { setActiveCall(null); if (selected) void loadSelected(selected); void loadConversations(); }} /></Suspense>}
  </div>;
}
