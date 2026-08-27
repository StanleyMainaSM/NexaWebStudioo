import { FormEvent, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { ArrowLeft, Ban, Check, CheckCheck, Download, Loader2, Menu, MoreVertical, Phone, Plus, Search, Send, ShieldCheck, UserPlus, UserRound, Users, Video, Volume2, Wifi, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { ActiveCall } from '../../components/portal/CallOverlayV2';

const CallOverlayV2 = lazy(() => import('../../components/portal/CallOverlayV2'));

type Person = { user_id: string; full_name: string | null; email: string | null; role_context: string | null; connector_id: string | null; is_online: boolean; last_seen_at: string | null };
type Conversation = { id: string; otherUserId: string; otherName: string; otherEmail: string | null; otherRole: string | null; updated_at: string; kind: 'direct' | 'admin' };
type Message = { id: string; conversation_id: string; sender_id: string; content: string; read_at: string | null; created_at: string; kind: 'direct' | 'admin' };
type CallEvent = { id: string; call_type: 'voice' | 'video'; status: string; caller_id: string; callee_id: string; created_at: string; duration_seconds: number | null };

const nameOf = (name?: string | null, email?: string | null) => name?.trim() || email?.trim() || 'Avelixa User';
const timeOf = (v: string) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dateOf = (v: string) => new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const errOf = (e: unknown) => { if (!e) return 'Unknown error.'; if (typeof e === 'object' && e !== null) { const x = e as { message?: string; details?: string; hint?: string; code?: string }; return [x.message, x.details, x.hint ? `Hint: ${x.hint}` : undefined, x.code ? `Code: ${x.code}` : undefined].filter(Boolean).join(' • ') || 'Something went wrong.'; } return String(e); };

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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadContacts = async () => { if (!user) return; const { data, error: e } = await supabase.rpc('list_communication_contacts'); if (!e) setContacts((data || []) as Person[]); };
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
        if (!ce && cid) { const { data: row } = await supabase.from('admin_conversations').select('id,user_id,admin_id,updated_at').eq('id', cid).maybeSingle(); if (row) admin = [{ kind: 'admin', id: row.id, otherUserId: row.admin_id, otherName: 'Avelixa Admin', otherEmail: null, otherRole: 'admin', updated_at: row.updated_at }]; }
      } else {
        const { data: rows, error: ae } = await supabase.from('admin_conversations').select('id,user_id,admin_id,updated_at').order('updated_at', { ascending: false });
        if (!ae) { const ids = (rows || []).map(r => r.user_id); const { data: ps } = ids.length ? await supabase.from('profiles').select('id,full_name,email').in('id', ids) : { data: [] as any[] }; const map = new Map((ps || []).map(p => [p.id, p])); admin = (rows || []).map(r => ({ kind: 'admin' as const, id: r.id, otherUserId: r.user_id, otherName: nameOf(map.get(r.user_id)?.full_name, map.get(r.user_id)?.email), otherEmail: map.get(r.user_id)?.email || null, otherRole: 'client', updated_at: r.updated_at })); }
      }
      setConversations([...direct, ...admin].sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      await loadContacts();
    } catch (e) { setError(`Messages could not be loaded: ${errOf(e)}`); } finally { setLoading(false); }
  };
  useEffect(() => { if (user) void loadConversations(); }, [user?.id, management]);

  const selected = conversations.find(c => c.id === selectedId) || null;
  const filteredConversations = useMemo(() => { const q = query.trim().toLowerCase(); return q ? conversations.filter(c => `${c.otherName} ${c.otherEmail || ''} ${c.otherRole || ''}`.toLowerCase().includes(q)) : conversations; }, [conversations, query]);
  const visibleMessages = useMemo(() => messages.filter(m => !clearedAt || new Date(m.created_at) > new Date(clearedAt)).filter(m => !chatSearch.trim() || m.content.toLowerCase().includes(chatSearch.trim().toLowerCase())), [messages, clearedAt, chatSearch]);
  const unread = useMemo(() => messages.filter(m => m.sender_id !== user?.id && !m.read_at).length, [messages, user?.id]);

  const loadSelected = async (conversation: Conversation) => {
    if (!user) return; setError(null);
    try {
      if (conversation.kind === 'direct') {
        const { data: ms, error: me } = await supabase.from('direct_messages').select('id,conversation_id,sender_id,content,read_at,created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }); if (me) throw me;
        setMessages(((ms || []) as Array<Omit<Message,'kind'>>).map(m => ({ ...m, kind: 'direct' })));
        const { data: p } = await supabase.from('conversation_preferences').select('cleared_at,muted').eq('user_id', user.id).eq('conversation_id', conversation.id).maybeSingle(); setClearedAt(p?.cleared_at || null); setMuted(Boolean(p?.muted));
        const { data: b } = await supabase.from('user_blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', conversation.otherUserId).maybeSingle(); setBlocked(Boolean(b));
        const { data: pr } = await supabase.from('user_presence').select('user_id,is_online,last_seen_at').eq('user_id', conversation.otherUserId).maybeSingle(); setPresence(pr ? { user_id: conversation.otherUserId, full_name: conversation.otherName, email: conversation.otherEmail, role_context: conversation.otherRole, connector_id: null, is_online: pr.is_online, last_seen_at: pr.last_seen_at } : null);
        const { data: cs } = await supabase.from('call_sessions').select('id,call_type,status,caller_id,callee_id,created_at,duration_seconds').eq('direct_conversation_id', conversation.id).order('created_at', { ascending: false }).limit(50); setCalls((cs || []) as CallEvent[]);
      } else {
        const { data: ms, error: me } = await supabase.from('admin_messages').select('id,conversation_id,sender_id,recipient_id,content,read_at,created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }); if (me) throw me;
        setMessages(((ms || []) as Array<Omit<Message,'kind'>>).map(m => ({ ...m, kind: 'admin' })));
        setClearedAt(null); setMuted(false); setBlocked(false); setPresence(null);
        const { data: cs } = await supabase.from('call_sessions').select('id,call_type,status,caller_id,callee_id,created_at,duration_seconds').eq('admin_conversation_id', conversation.id).order('created_at', { ascending: false }).limit(50); setCalls((cs || []) as CallEvent[]);
      }
    } catch (e) { setError(`Conversation could not be loaded: ${errOf(e)}`); }
  };
  useEffect(() => { if (selected) void loadSelected(selected); else { setMessages([]); setCalls([]); setPresence(null); setBlocked(false); setMuted(false); setClearedAt(null); } }, [selectedId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [visibleMessages.length, selectedId]);

  useEffect(() => {
    if (!user) return;
    void supabase.rpc('communication_set_presence', { p_online: true });
    const t = window.setInterval(() => void supabase.rpc('communication_set_presence', { p_online: true }), 30000);
    const off = () => { void supabase.rpc('communication_set_presence', { p_online: false }); };
    window.addEventListener('beforeunload', off); return () => { window.clearInterval(t); window.removeEventListener('beforeunload', off); };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !selected) return;
    const table = selected.kind === 'direct' ? 'direct_messages' : 'admin_messages';
    const channel = supabase.channel(`avelixa-chat-${selected.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `conversation_id=eq.${selected.id}` }, ({ new: row }) => {
      const m = { ...(row as any), kind: selected.kind } as Message; setMessages(cur => cur.some(x => x.id === m.id) ? cur : [...cur, m]);
      if (m.sender_id !== user.id && !muted) { void supabase.from('user_notification_preferences').select('sound_enabled,message_sound_url,vibration_enabled').eq('user_id', user.id).maybeSingle().then(({ data }) => { if (data?.vibration_enabled && 'vibrate' in navigator) navigator.vibrate([150,80,150]); if (data?.sound_enabled !== false) { const a = new Audio(data?.message_sound_url || undefined); void a.play().catch(() => undefined); } }); }
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, selected?.id, selected?.kind, muted]);

  useEffect(() => {
    if (!user) return;
    let alive = true; let seen: string | null = null;
    const poll = async () => { const { data } = await supabase.from('call_sessions').select('id,caller_id,callee_id,call_type,status,direct_conversation_id,admin_conversation_id,created_at').eq('callee_id', user.id).eq('status','ringing').order('created_at',{ascending:false}).limit(1); if (!alive || !data?.length || data[0].id === seen) return; seen = data[0].id; const c = data[0]; const { data: p } = await supabase.from('profiles').select('full_name,email').eq('id',c.caller_id).maybeSingle(); setActiveCall({ id:c.id, callType:c.call_type, callerId:c.caller_id, calleeId:c.callee_id, remoteName:nameOf(p?.full_name,p?.email), isIncoming:true, directConversationId:c.direct_conversation_id, adminConversationId:c.admin_conversation_id }); };
    void poll(); const t = window.setInterval(() => void poll(), 1200); return () => { alive=false; window.clearInterval(t); };
  }, [user?.id, activeCall]);

  const searchPeople = async (event: FormEvent) => { event.preventDefault(); setSearching(true); setError(null); try { const { data, error: e } = await supabase.rpc('search_communication_users', { p_query: query }); if (e) throw e; setPeople((data || []) as Person[]); setShowPeople(true); } catch(e) { setError(errOf(e)); } finally { setSearching(false); } };
  const openPerson = async (person: Person) => { try { const { data, error: e } = await supabase.rpc('get_or_create_direct_conversation', { p_recipient_id: person.user_id }); if (e) throw e; await loadConversations(); setSelectedId(data as string); setShowPeople(false); setQuery(''); await supabase.rpc('communication_add_contact', { p_contact_user_id: person.user_id }); await loadContacts(); } catch(e) { setError(errOf(e)); } };
  const saveContact = async (person: Person) => { const { error: e } = await supabase.rpc('communication_add_contact', { p_contact_user_id: person.user_id }); if (e) setError(errOf(e)); else await loadContacts(); };
  const blockUser = async () => { if (!selected || selected.kind !== 'direct') return; const { error: e } = await supabase.rpc('communication_block_user', { p_blocked_id: selected.otherUserId }); if (e) setError(errOf(e)); else { setBlocked(true); setMenu(false); } };
  const unblockUser = async () => { if (!selected || selected.kind !== 'direct') return; const { error: e } = await supabase.rpc('communication_unblock_user', { p_blocked_id: selected.otherUserId }); if (e) setError(errOf(e)); else { setBlocked(false); setMenu(false); } };
  const toggleMute = async () => { if (!user || !selected || selected.kind !== 'direct') return; const next = !muted; const { error: e } = await supabase.from('conversation_preferences').upsert({ user_id:user.id, conversation_id:selected.id, muted:next, updated_at:new Date().toISOString() }); if (e) setError(errOf(e)); else setMuted(next); };
  const clearChat = async () => { if (!user || !selected) return; const now = new Date().toISOString(); if (selected.kind === 'direct') { const { error:e } = await supabase.from('conversation_preferences').upsert({ user_id:user.id, conversation_id:selected.id, cleared_at:now, updated_at:now }); if(e){setError(errOf(e));return;} } setClearedAt(now); setMenu(false); };
  const exportChat = () => { if (!selected) return; const lines = [`Avelixa chat with ${selected.otherName}`, '']; visibleMessages.forEach(m => lines.push(`[${dateOf(m.created_at)}] ${m.sender_id === user?.id ? 'You' : selected.otherName}: ${m.content}`)); calls.slice().reverse().forEach(c => lines.push(`[${dateOf(c.created_at)}] ${c.call_type === 'video' ? 'Video' : 'Voice'} call — ${c.status}${c.duration_seconds ? ` — ${c.duration_seconds}s` : ''}`)); const blob = new Blob([lines.join('\n')], { type:'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`avelixa-${selected.otherName.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.txt`; a.click(); URL.revokeObjectURL(url); setMenu(false); };
  const sendMessage = async (event: FormEvent) => { event.preventDefault(); if (!user || !selected || blocked || !text.trim() || sending) return; setSending(true); setError(null); let content = text.trim(); if(reply) content = `↩ ${selected.otherName}: ${reply.content}\n${content}`; try { if(selected.kind === 'direct'){ const { error:e }=await supabase.from('direct_messages').insert({conversation_id:selected.id,sender_id:user.id,content}); if(e) throw e; } else { const recipientId = selected.otherUserId; const { error:e }=await supabase.from('admin_messages').insert({conversation_id:selected.id,sender_id:user.id,recipient_id:recipientId,content}); if(e) throw e; } setText(''); setReply(null); await loadConversations(); } catch(e){setError(errOf(e));} finally{setSending(false);} };
  const markRead = async () => { if (!user || !selected) return; const unread = messages.filter(m=>m.sender_id!==user.id&&!m.read_at); if(!unread.length)return; const ids=unread.map(m=>m.id); const now=new Date().toISOString(); const table=selected.kind==='direct'?'direct_messages':'admin_messages'; const {error:e}=await supabase.from(table).update({read_at:now}).in('id',ids); if(!e)setMessages(cur=>cur.map(m=>ids.includes(m.id)?{...m,read_at:now}:m)); };
  useEffect(()=>{void markRead();},[selectedId,messages.length]);
  const startCall = async (type:'voice'|'video') => { if(!user||!selected||blocked) return; try { const payload:any={caller_id:user.id,callee_id:selected.otherUserId,call_type:type,status:'ringing'}; if(selected.kind==='direct') payload.direct_conversation_id=selected.id; else payload.admin_conversation_id=selected.id; const {data,error:e}=await supabase.from('call_sessions').insert(payload).select('id').single(); if(e)throw e; setActiveCall({id:data.id,callType:type,callerId:user.id,calleeId:selected.otherUserId,remoteName:selected.otherName,isIncoming:false,directConversationId:selected.kind==='direct'?selected.id:null,adminConversationId:selected.kind==='admin'?selected.id:null}); }catch(e){setError(`Could not start call: ${errOf(e)}`);} };

  return <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 shadow-2xl">
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px]">
      <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] shrink-0 flex-col border-r border-white/10 bg-ink-950/70`}>
        <div className="border-b border-white/10 p-4"><div className="flex items-center justify-between"><div><div className="text-lg font-semibold text-white">Messages</div><div className="text-xs text-gray-500">{conversations.length} conversations · {contacts.length} contacts</div></div><button type="button" onClick={()=>setShowPeople(v=>!v)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300 hover:bg-white/10" title="New conversation"><Plus className="h-5 w-5"/></button></div><form onSubmit={searchPeople} className="mt-4 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search people or chats" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/40"/></div><button className="rounded-xl border border-accent-500/20 bg-accent-500/10 px-3 text-accent-300" disabled={searching}>{searching?<Loader2 className="h-4 w-4 animate-spin"/>:<Users className="h-4 w-4"/>}</button></form></div>
        {showPeople && <div className="max-h-64 overflow-y-auto border-b border-white/10">{people.length?people.map(p=><div key={p.user_id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5"><button onClick={()=>void openPerson(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-300"><UserRound className="h-5 w-5"/><span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink-950 ${p.is_online?'bg-emerald-400':'bg-gray-600'}`}/></div><div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{nameOf(p.full_name,p.email)}</div><div className="truncate text-xs text-gray-500">{p.role_context || 'Avelixa user'}</div></div></button><button onClick={()=>void saveContact(p)} className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white" title="Save contact"><UserPlus className="h-4 w-4"/></button></div>):<div className="p-5 text-sm text-gray-500">Search for a name, email or connector ID.</div>}</div>}
        <div className="flex-1 overflow-y-auto">{loading?<div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent-400"/></div>:filteredConversations.length?filteredConversations.map(c=>{const isSel=c.id===selectedId; const count=messages.filter(m=>m.conversation_id===c.id&&m.sender_id!==user?.id&&!m.read_at).length; return <button key={`${c.kind}-${c.id}`} onClick={()=>{setSelectedId(c.id);setShowPeople(false);}} className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-4 text-left transition ${isSel?'bg-accent-500/10':'hover:bg-white/5'}`}><div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-300"><UserRound className="h-5 w-5"/><span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink-950 ${c.kind==='admin'?'bg-accent-400':contacts.some(p=>p.user_id===c.otherUserId&&p.is_online)?'bg-emerald-400':'bg-gray-600'}`}/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-white">{c.otherName}</span><span className="text-[10px] text-gray-600">{timeOf(c.updated_at)}</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-xs text-gray-500">{c.otherRole || 'Avelixa'}</span>{count>0&&<span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{count}</span>}</div></div></button>;}):<div className="p-8 text-center text-sm text-gray-500"><MessageSquareIcon/><div className="mt-3">No conversations yet.</div><button onClick={()=>setShowPeople(true)} className="mt-3 text-accent-300 hover:text-accent-200">Find someone to message</button></div>}</div>
      </aside>
      <section className={`${selectedId?'flex':'hidden md:flex'} min-w-0 flex-1 flex-col bg-ink-900/50`}>
        {!selected?<div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-accent-500/20 bg-accent-500/10"><MessageSquareIcon/></div><h2 className="mt-5 text-xl font-semibold text-white">Select a conversation</h2><p className="mt-2 max-w-sm text-sm text-gray-500">Choose someone from your conversation list, or start a new chat.</p></div>:<>
          <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3"><button className="md:hidden rounded-xl p-2 text-gray-400 hover:bg-white/5" onClick={()=>setSelectedId(null)}><ArrowLeft className="h-5 w-5"/></button><div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-accent-500/10 text-accent-300"><UserRound className="h-5 w-5"/><span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink-900 ${presence?.is_online?'bg-emerald-400':'bg-gray-600'}`}/></div><div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{selected.otherName}</div><div className="text-xs text-gray-500">{presence?.is_online?'Online':presence?.last_seen_at?`Last seen ${dateOf(presence.last_seen_at)}`:selected.otherRole || 'Avelixa'}</div></div><button onClick={()=>void startCall('voice')} disabled={blocked} className="rounded-xl p-2 text-gray-300 hover:bg-white/5 disabled:opacity-40" title="Voice call"><Phone className="h-5 w-5"/></button><button onClick={()=>void startCall('video')} disabled={blocked} className="rounded-xl p-2 text-gray-300 hover:bg-white/5 disabled:opacity-40" title="Video call"><Video className="h-5 w-5"/></button><div className="relative"><button onClick={()=>setMenu(v=>!v)} className="rounded-xl p-2 text-gray-400 hover:bg-white/5"><MoreVertical className="h-5 w-5"/></button>{menu&&<div className="absolute right-0 top-11 z-20 w-52 rounded-2xl border border-white/10 bg-ink-950 p-2 shadow-2xl"><button onClick={()=>setChatSearch(v=>v?'':' ')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><Search className="h-4 w-4"/>Search conversation</button><button onClick={exportChat} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><Download className="h-4 w-4"/>Export chat</button><button onClick={()=>void clearChat()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5">Clear chat</button>{selected.kind==='direct'&&<><button onClick={()=>void toggleMute()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5"><Volume2 className="h-4 w-4"/>{muted?'Unmute':'Mute'} chat</button><button onClick={()=>void(blocked?unblockUser():blockUser())} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Ban className="h-4 w-4"/>{blocked?'Unblock':'Block'} user</button></>}</div>}</div></header>
          {chatSearch.trim()!==''&&<div className="border-b border-white/10 px-4 py-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"/><input autoFocus value={chatSearch.trim()===' ' ? '' : chatSearch} onChange={e=>setChatSearch(e.target.value)} placeholder="Search this conversation" className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none"/></div></div>}
          {error&&<div className="mx-4 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}<button className="float-right" onClick={()=>setError(null)}><X className="h-4 w-4"/></button></div>}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">{visibleMessages.map(m=><div key={m.id} className={`group flex ${m.sender_id===user?.id?'justify-end':'justify-start'}`}><div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${m.sender_id===user?.id?'bg-accent-500/20 text-white':'bg-white/5 text-gray-200'}`}><div className="whitespace-pre-wrap break-words text-sm">{m.content}</div><div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-500"><span>{timeOf(m.created_at)}</span>{m.sender_id===user?.id&&(m.read_at?<CheckCheck className="h-3 w-3 text-accent-300"/>:<Check className="h-3 w-3"/>)}</div><button onClick={()=>setReply(m)} className="mt-1 hidden text-[10px] text-accent-300 group-hover:block">Reply</button></div></div>)}{calls.slice().reverse().map(c=><div key={`call-${c.id}`} className="flex justify-center"><div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-xs text-gray-400"><div className="flex items-center justify-center gap-2 text-gray-300">{c.call_type==='video'?<Video className="h-4 w-4"/>:<Phone className="h-4 w-4"/>}{c.call_type==='video'?'Video':'Voice'} call · {c.status}</div><div className="mt-1">{dateOf(c.created_at)}{c.duration_seconds?` · ${Math.floor(c.duration_seconds/60)}m ${c.duration_seconds%60}s`:''}</div></div></div>)}<div ref={endRef}/></div>
          {blocked&&<div className="border-t border-red-500/10 bg-red-500/5 px-4 py-3 text-center text-xs text-red-300">This user is blocked. Messaging and calls are disabled.</div>}
          {reply&&<div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-4 py-2"><div className="truncate text-xs text-gray-400">Replying to: {reply.content}</div><button onClick={()=>setReply(null)}><X className="h-4 w-4 text-gray-500"/></button></div>}
          <form onSubmit={sendMessage} className="border-t border-white/10 p-3"><div className="flex items-end gap-2"><textarea value={text} onChange={e=>setText(e.target.value)} disabled={blocked} rows={1} placeholder={blocked?'Blocked':'Write a message…'} className="min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/30"/><button disabled={sending||blocked||!text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white disabled:opacity-40"><Send className="h-4 w-4"/></button></div></form>
        </>}
      </section>
    </div>
    {activeCall&&<Suspense fallback={null}><CallOverlayV2 call={activeCall} onClose={()=>{setActiveCall(null);if(selected)void loadSelected(selected);}}/></Suspense>}
  </div>;
}
function MessageSquareIcon(){return <Wifi className="h-8 w-8 text-accent-300"/>;}
