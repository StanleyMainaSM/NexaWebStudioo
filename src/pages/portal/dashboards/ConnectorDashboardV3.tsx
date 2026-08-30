import { useEffect, useState } from 'react';
import { ArrowRight, DollarSign, FolderKanban, Link as LinkIcon, Loader2, Plus, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

type Notification = { id: string; title: string; content: string; link: string | null; created_at: string };
type ConnectorProfile = { avl_id: string | null };

export default function ConnectorDashboardV3() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ConnectorProfile | null>(null);
  const [activeLeads, setActiveLeads] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userId = user?.id;
    if (!userId) { setLoading(false); return; }
    let mounted = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [profileResult, leadsResult, projectsResult, commissionResult, notificationResult] = await Promise.all([
          supabase.from('connector_profiles').select('avl_id').eq('user_id', userId).maybeSingle(),
          supabase.from('leads').select('id,status', { count: 'exact' }).eq('connector_id', userId).not('status', 'in', '(won,lost,completed,rejected)'),
          supabase.from('projects').select('id,status', { count: 'exact', head: true }).eq('connector_id', userId).not('status', 'in', '(completed,cancelled)'),
          supabase.from('commissions').select('amount,status').eq('connector_id', userId),
          supabase.from('notifications').select('id,title,content,link,created_at').eq('user_id', userId).eq('is_read', false).order('created_at', { ascending: false }).limit(3),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (leadsResult.error) throw leadsResult.error;
        if (projectsResult.error) throw projectsResult.error;
        if (commissionResult.error) throw commissionResult.error;
        if (notificationResult.error) throw notificationResult.error;
        if (!mounted) return;
        const pending = (commissionResult.data || []).filter((row) => !['paid', 'completed'].includes(String(row.status || '').toLowerCase())).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        setProfile((profileResult.data || null) as ConnectorProfile | null); setActiveLeads(leadsResult.count || 0); setActiveProjects(projectsResult.count || 0); setPendingEarnings(pending); setNotifications((notificationResult.data || []) as Notification[]);
      } catch (loadError) {
        console.error('Connector dashboard load error:', loadError);
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load your Connector overview.');
      } finally { if (mounted) setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, [user?.id]);

  if (loading) return <div className="glass rounded-3xl border border-ink-800/50 p-8"><div className="flex items-center gap-3 text-white"><Loader2 className="h-5 w-5 animate-spin text-accent-500" />Loading your Connector workspace...</div></div>;
  return <div className="space-y-6 pb-8"><section className="rounded-3xl border border-ink-800/50 bg-gradient-to-br from-accent-600/20 via-white/[0.04] to-transparent p-6 md:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-400">Connector command center</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Focus on the next opportunity.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Your dashboard is intentionally concise. Detailed lead, client, recruitment and earnings work lives in the sections on the left.</p></div>{profile?.avl_id && <div className="rounded-2xl border border-accent-500/20 bg-accent-500/10 px-4 py-3"><p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">AVL ID</p><p className="mt-1 font-mono text-sm text-accent-300">{profile.avl_id}</p></div>}</div></section>{error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}<section className="grid gap-4 sm:grid-cols-3"><Link to="/portal/connector/leads" className="glass rounded-2xl border border-ink-800/50 p-5 hover:border-accent-500/30"><Users className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Active leads</p><p className="mt-2 text-2xl font-semibold text-white">{activeLeads}</p></Link><Link to="/portal/projects" className="glass rounded-2xl border border-ink-800/50 p-5 hover:border-accent-500/30"><FolderKanban className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Active projects</p><p className="mt-2 text-2xl font-semibold text-white">{activeProjects}</p></Link><Link to="/portal/connector/earnings" className="glass rounded-2xl border border-ink-800/50 p-5 hover:border-accent-500/30"><DollarSign className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Pending earnings</p><p className="mt-2 text-2xl font-semibold text-white">KSh {pendingEarnings.toLocaleString('en-KE', { maximumFractionDigits: 2 })}</p></Link></section><section className="grid gap-4 md:grid-cols-3"><Link to="/portal/connector/lead-generation" className="rounded-2xl bg-accent-600 p-5 text-white hover:bg-accent-500"><Plus className="h-5 w-5" /><h2 className="mt-4 font-semibold">Find Your Next Client</h2><p className="mt-1 text-sm text-white/70">Use the existing qualification and outreach toolkit.</p><ArrowRight className="mt-4 h-5 w-5" /></Link><Link to="/portal/connector/clients" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white hover:bg-white/[0.05]"><LinkIcon className="h-5 w-5 text-accent-400" /><h2 className="mt-4 font-semibold">Refer a Client</h2><p className="mt-1 text-sm text-gray-400">Share your personal Client onboarding link.</p><ArrowRight className="mt-4 h-5 w-5 text-gray-500" /></Link><Link to="/portal/connector/recruitment" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white hover:bg-white/[0.05]"><UserPlus className="h-5 w-5 text-accent-400" /><h2 className="mt-4 font-semibold">Recruit a Connector</h2><p className="mt-1 text-sm text-gray-400">Open your existing recruitment link and funnel.</p><ArrowRight className="mt-4 h-5 w-5 text-gray-500" /></Link></section><section className="glass rounded-3xl border border-ink-800/50 p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Action required</p><h2 className="mt-2 text-xl font-semibold text-white">Unread operational updates</h2></div><Link to="/portal/activity" className="text-sm font-medium text-accent-400 hover:text-accent-300">View activity <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div>{notifications.length === 0 ? <p className="mt-5 text-sm text-gray-400">No unread updates. You are caught up.</p> : <div className="mt-5 space-y-2">{notifications.map((item) => { const body = <div className="rounded-2xl border border-accent-500/15 bg-accent-500/5 p-4"><p className="text-sm font-medium text-white">{item.title}</p><p className="mt-1 text-sm text-gray-400">{item.content}</p></div>; return item.link ? <Link key={item.id} to={item.link}>{body}</Link> : <div key={item.id}>{body}</div>; })}</div>}</section></div>;
}
