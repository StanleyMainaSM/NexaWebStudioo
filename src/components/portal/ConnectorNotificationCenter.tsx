import { useEffect, useState } from 'react';
import { ArrowRight, Bell, CheckCheck, ClipboardList, DollarSign, FolderKanban, MessageSquare, UserPlus, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getConnectorNotificationPresentation } from '../../lib/connectorNotifications';

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  notification_type: string | null;
};

function iconFor(category: ReturnType<typeof getConnectorNotificationPresentation>['category']) {
  if (category === 'communication') return MessageSquare;
  if (category === 'lead') return ClipboardList;
  if (category === 'project') return FolderKanban;
  if (category === 'commission' || category === 'payout') return DollarSign;
  if (category === 'recruitment') return UserPlus;
  return Bell;
}

export default function ConnectorNotificationCenter({ limit = 5 }: { limit?: number }) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [summary, setSummary] = useState({ messages: 0, actionLeads: 0, activeProjects: 0, pendingCommission: 0 });
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data, error }, { count }, messageResult, actionLeadResult, activeProjectResult, commissionResult] = await Promise.all([
      supabase.from('notifications').select('id,title,content,link,is_read,created_at,notification_type').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false).in('notification_type', ['message', 'call']),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('connector_id', user.id).in('status', ['action_required', 'needs_connector_action']),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('connector_id', user.id).not('status', 'in', '(completed,cancelled)'),
      supabase.from('commissions').select('amount,status,paid_at').eq('connector_id', user.id),
    ]);
    if (!error) setItems((data || []) as NotificationItem[]);
    setUnread(count || 0);
    const pendingCommission = (commissionResult.data || []).reduce((sum, row: { amount: number | null; status: string | null; paid_at: string | null }) => {
      const status = String(row.status || '').toLowerCase();
      if (['cancelled', 'canceled', 'rejected', 'void', 'paid', 'completed', 'confirmed'].includes(status) || row.paid_at) return sum;
      return sum + Number(row.amount || 0);
    }, 0);
    setSummary({ messages: messageResult.count || 0, actionLeads: actionLeadResult.count || 0, activeProjects: activeProjectResult.count || 0, pendingCommission });
    setLoading(false);
  }

  useEffect(() => {
    void load();
    if (!user?.id) return;
    const channel = supabase.channel(`connector-notifications-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, limit]);

  async function markRead(id: string) {
    if (!user?.id) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id);
    if (!error) await load();
  }

  async function markAllRead() {
    if (!user?.id || unread === 0) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (!error) await load();
  }

  return (
    <section className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5 mb-5">
        <Link to="/portal/activity" className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-accent-500/20"><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Unread notifications</p><p className="mt-2 text-2xl font-light text-white">{loading ? '—' : unread}</p></Link>
        <Link to="/portal/messages" className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-accent-500/20"><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Messages to review</p><p className="mt-2 text-2xl font-light text-white">{loading ? '—' : summary.messages}</p></Link>
        <Link to="/portal/connector/leads" className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-accent-500/20"><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Leads requiring action</p><p className="mt-2 text-2xl font-light text-white">{loading ? '—' : summary.actionLeads}</p></Link>
        <Link to="/portal/projects" className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-accent-500/20"><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Active projects</p><p className="mt-2 text-2xl font-light text-white">{loading ? '—' : summary.activeProjects}</p></Link>
        <Link to="/portal/connector" className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-accent-500/20 col-span-2 xl:col-span-1"><div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-accent-400"/><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pending commission</p></div><p className="mt-2 text-2xl font-light text-white">{loading ? '—' : `KSh ${summary.pendingCommission.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`}</p></Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10"><Bell className="h-5 w-5 text-accent-400" /></div>
          <div>
            <div className="flex items-center gap-2"><h2 className="text-lg font-medium text-white">Notifications</h2>{unread > 0 && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">{unread} unread</span>}</div>
            <p className="mt-1 text-sm text-gray-500">Operational updates for your leads, projects, commissions, referrals and messages.</p>
          </div>
        </div>
        {unread > 0 && <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-accent-500/30 hover:text-accent-300"><CheckCheck className="h-4 w-4" />Mark all read</button>}
      </div>

      {loading ? <div className="py-8 text-center text-sm text-gray-500">Loading notifications…</div> : items.length === 0 ? <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-gray-500">No notifications yet.</div> : (
        <div className="mt-5 space-y-2">
          {items.map((item) => {
            const presentation = getConnectorNotificationPresentation(item);
            const Icon = iconFor(presentation.category);
            const target = item.link || presentation.link;
            return <Link key={item.id} to={target} onClick={() => { if (!item.is_read) void markRead(item.id); }} className={`block rounded-xl border p-4 transition-colors ${item.is_read ? 'border-white/5 bg-white/[0.015]' : 'border-accent-500/20 bg-accent-500/[0.045]'}`}><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/10"><Icon className="h-4 w-4 text-accent-400" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-white">{item.title}</p>{!item.is_read && <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />}</div><p className="mt-1 text-sm text-gray-400 line-clamp-2">{item.content}</p><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500"><span>{presentation.label}</span><span>{new Date(item.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</span></div></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-600" /></div></Link>;
          })}
        </div>
      )}

      <div className="mt-4 flex justify-end"><Link to="/portal/activity" className="inline-flex items-center gap-2 text-sm font-medium text-accent-400 hover:text-accent-300">Open full activity <ArrowRight className="h-4 w-4" /></Link></div>
    </section>
  );
}
