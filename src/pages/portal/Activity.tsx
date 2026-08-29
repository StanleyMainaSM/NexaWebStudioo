import { useEffect, useState } from 'react';
import { BellRing, CheckCheck, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  notification_type: string | null;
}
interface ProjectItem { id: string; title: string; description: string | null; created_at: string; }
interface InvoiceItem { id: string; status: string | null; created_at: string; }
type ActivityItem = { id: string; title: string; description: string; createdAt: string; kind: 'notification' | 'project' | 'invoice'; link: string | null; isRead: boolean };

export default function Activity() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function loadActivity() {
    const currentUserId = user?.id;
    if (!currentUserId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [notificationsResult, projectsResult, invoicesResult] = await Promise.all([
        supabase.from('notifications').select('id, title, content, link, is_read, created_at, notification_type').eq('user_id', currentUserId).order('created_at', { ascending: false }),
        supabase.from('projects').select('id, title, description, created_at').eq('client_id', currentUserId).order('created_at', { ascending: false }),
        supabase.from('invoices').select('id, status, created_at').eq('client_id', currentUserId).order('created_at', { ascending: false }),
      ]);
      if (notificationsResult.error) throw notificationsResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      setNotifications((notificationsResult.data || []) as NotificationItem[]);
      setProjects((projectsResult.data || []) as ProjectItem[]);
      setInvoices((invoicesResult.data || []) as InvoiceItem[]);
    } catch (err) {
      console.error('Error loading activity:', err);
      setError('We could not load your recent activity right now.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    void loadActivity();
    if (!user?.id) return;
    const channel = supabase.channel(`client-activity-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => void loadActivity()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  async function markRead(id: string) {
    const { error: updateError } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user?.id || '');
    if (updateError) { setError('We could not update that notification.'); return; }
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
  }

  async function markAllRead() {
    if (!user?.id || !notifications.some((item) => !item.is_read)) return;
    setMarkingAll(true); setError(null);
    try {
      const { error: updateError } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      if (updateError) throw updateError;
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      console.error('Error marking notifications read:', err);
      setError('We could not mark all notifications as read.');
    } finally { setMarkingAll(false); }
  }

  const activity: ActivityItem[] = [
    ...notifications.map((item) => ({ id: item.id, title: item.title, description: item.content, createdAt: item.created_at, kind: 'notification' as const, link: item.link, isRead: item.is_read })),
    ...projects.map((project) => ({ id: `project-${project.id}`, title: project.title, description: project.description || 'Project created', createdAt: project.created_at, kind: 'project' as const, link: `/portal/projects/${project.id}`, isRead: true })),
    ...invoices.map((invoice) => ({ id: `invoice-${invoice.id}`, title: `Invoice ${invoice.id.slice(0, 8)}`, description: `Invoice status: ${invoice.status || 'pending'}`, createdAt: invoice.created_at, kind: 'invoice' as const, link: `/portal/invoices/${invoice.id}`, isRead: true })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30);

  if (loading) return <div className="glass rounded-2xl border border-ink-800/50 p-6"><div className="flex items-center gap-3 text-white"><Loader2 className="h-5 w-5 animate-spin text-accent-500" />Loading your activity...</div></div>;

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-white">Activity & notifications</h2><p className="mt-2 text-sm text-gray-400">Stay up to date with your request, project, billing and messages.</p></div><button type="button" disabled={!unreadCount || markingAll} onClick={() => void markAllRead()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"><CheckCheck className="h-4 w-4" />{markingAll ? 'Updating...' : unreadCount ? `Mark all read (${unreadCount})` : 'All read'}</button></div>
    {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
    {activity.length === 0 ? <div className="glass rounded-2xl border border-ink-800/50 p-12 text-center"><BellRing className="mx-auto mb-4 h-12 w-12 text-ink-600" /><h3 className="text-lg font-medium text-white">No activity yet</h3><p className="mt-2 text-sm text-gray-400">Updates will appear here as Avelixa processes your request and project.</p></div> : <div className="space-y-3">{activity.map((item) => { const card = <div className={`rounded-2xl border p-4 transition ${item.isRead ? 'border-ink-800/50 bg-white/[0.02]' : 'border-accent-500/20 bg-accent-500/5'}`}><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-accent-500/10 p-2">{item.kind === 'notification' ? <BellRing className="h-4 w-4 text-accent-400" /> : <Sparkles className="h-4 w-4 text-accent-400" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{item.title}</p><p className="mt-1 text-sm text-gray-400">{item.description}</p></div>{!item.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-400" />}</div><p className="mt-2 text-xs text-gray-600">{new Date(item.createdAt).toLocaleString()}</p><div className="mt-3 flex flex-wrap gap-2">{item.link && <Link to={item.link} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-400 hover:text-accent-300">Open update <ExternalLink className="h-3.5 w-3.5" /></Link>}{item.kind === 'notification' && !item.isRead && <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void markRead(item.id); }} className="text-xs font-medium text-gray-400 hover:text-white">Mark read</button>}</div></div></div></div>; return <div key={item.id}>{card}</div>; })}</div>}
  </div>;
}
