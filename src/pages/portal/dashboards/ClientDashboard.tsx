import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, CheckCircle2, Clock3, FolderKanban, Loader2, MessageSquare, ReceiptText, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { getClientLifecycleState, type ClientLifecycleState } from '../../../lib/clientPortal';

type Profile = { full_name: string | null; email: string | null; client_referrer_connector_id: string | null };
type Lead = { id: string; business_id: string | null; title: string; requirements: string | null; status: string | null; estimated_budget: number | null; created_at: string; updated_at: string | null };
type Business = { id: string; name: string; industry: string | null; contact_name: string | null; phone: string | null; created_at: string };
type Project = { id: string; business_id: string | null; title: string; description: string | null; status: string | null; created_at: string; updated_at: string | null; progress: number | null };
type Invoice = { id: string; amount: number | null; status: string | null; created_at: string; due_date: string | null };
type Payment = { id: string; invoice_id: string | null; amount: number | null; status: string | null };
type NotificationItem = { id: string; title: string; content: string; link: string | null; is_read: boolean; created_at: string; notification_type: string | null };

function displayName(profile: Profile | null, email?: string | null) {
  if (profile?.full_name?.trim()) return profile.full_name.trim();
  return email?.split('@')[0] || 'Client';
}

function money(value: number | null | undefined) {
  if (value == null) return '—';
  return `KSh ${Number(value).toLocaleString('en-KE')}`;
}

function invoicePaidAmount(invoice: Invoice, payments: Payment[]) {
  return payments.filter((payment) => payment.invoice_id === invoice.id && ['completed', 'paid', 'successful', 'success'].includes(String(payment.status || '').toLowerCase())).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function invoiceBalance(invoice: Invoice, payments: Payment[]) {
  return Math.max(Number(invoice.amount || 0) - invoicePaidAmount(invoice, payments), 0);
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) { setLoading(false); return; }
    let mounted = true;

    async function load() {
      setLoading(true); setError(null);
      try {
        const [profileResult, leadResult, projectsResult, invoicesResult, notificationsResult] = await Promise.all([
          supabase.from('profiles').select('full_name, email, client_referrer_connector_id').eq('id', userId).maybeSingle(),
          supabase.from('leads').select('id, business_id, title, requirements, status, estimated_budget, created_at, updated_at').eq('client_id', userId).order('created_at', { ascending: false }).limit(1),
          supabase.from('projects').select('id, business_id, title, description, status, created_at, updated_at, progress').eq('client_id', userId).order('created_at', { ascending: false }),
          supabase.from('invoices').select('id, amount, status, created_at, due_date').eq('client_id', userId).order('created_at', { ascending: false }),
          supabase.from('notifications').select('id, title, content, link, is_read, created_at, notification_type').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (leadResult.error) throw leadResult.error;
        if (projectsResult.error) throw projectsResult.error;
        if (invoicesResult.error) throw invoicesResult.error;
        if (notificationsResult.error) throw notificationsResult.error;

        const nextLead = (leadResult.data?.[0] || null) as Lead | null;
        let nextBusiness: Business | null = null;
        if (nextLead?.business_id) {
          const businessResult = await supabase.from('businesses').select('id, name, industry, contact_name, phone, created_at').eq('id', nextLead.business_id).maybeSingle();
          if (businessResult.error) throw businessResult.error;
          nextBusiness = (businessResult.data || null) as Business | null;
        }

        const invoiceRows = (invoicesResult.data || []) as Invoice[];
        let paymentRows: Payment[] = [];
        if (invoiceRows.length) {
          const paymentResult = await supabase.from('payments').select('id, invoice_id, amount, status').in('invoice_id', invoiceRows.map((invoice) => invoice.id));
          if (paymentResult.error) throw paymentResult.error;
          paymentRows = (paymentResult.data || []) as Payment[];
        }

        if (!mounted) return;
        const notificationRows = (notificationsResult.data || []) as NotificationItem[];
        setProfile(profileResult.data as Profile | null);
        setLead(nextLead);
        setBusiness(nextBusiness);
        setProjects((projectsResult.data || []) as Project[]);
        setInvoices(invoiceRows);
        setPayments(paymentRows);
        setNotifications(notificationRows);
        setUnreadMessages(notificationRows.filter((item) => !item.is_read && item.notification_type === 'message').length);
      } catch (loadError) {
        console.error('Client dashboard load error:', loadError);
        if (mounted) setError('We could not load your client workspace right now. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [user?.id]);

  const currentProject = useMemo(() => {
    if (!projects.length) return null;
    if (lead?.business_id) {
      return projects.find((project) => project.business_id === lead.business_id) || projects[0];
    }
    return projects[0];
  }, [lead?.business_id, projects]);

  const lifecycle: ClientLifecycleState = getClientLifecycleState(lead?.status, currentProject?.status);
  const outstandingAmount = invoices.reduce((sum, invoice) => sum + invoiceBalance(invoice, payments), 0);
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const paidAmount = invoices.reduce((sum, invoice) => sum + invoicePaidAmount(invoice, payments), 0);
  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  if (loading) return <div className="glass rounded-3xl border border-ink-800/50 p-8"><div className="flex items-center gap-3 text-white"><Loader2 className="h-5 w-5 animate-spin text-accent-500" />Loading your Client Portal...</div></div>;
  if (error) return <div className="glass rounded-3xl border border-red-500/20 bg-red-500/5 p-8"><h2 className="text-xl font-semibold text-white">Dashboard unavailable</h2><p className="mt-2 text-sm text-gray-400">{error}</p></div>;

  const name = displayName(profile, user?.email);
  const nextActionHref = outstandingAmount > 0 ? '/portal/invoices' : currentProject ? `/portal/projects/${currentProject.id}` : lead ? '/portal/activity' : '/portal/projects';
  const nextActionLabel = outstandingAmount > 0 ? 'Review invoices' : currentProject ? 'Open project' : lead ? 'View request updates' : 'View projects';

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-ink-800/50 bg-gradient-to-br from-accent-600/20 via-white/[0.04] to-transparent p-6 md:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400"><Sparkles className="h-3.5 w-3.5" />Client Portal</div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">Welcome back, {name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">A clear view of your request, project progress, messages and account updates.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to={currentProject ? `/portal/projects/${currentProject.id}` : '/portal/projects'} className="glass rounded-2xl border border-ink-800/50 p-5 transition hover:border-accent-500/30 hover:bg-white/[0.04]"><FolderKanban className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Current project</p><p className="mt-2 truncate text-sm font-medium text-white">{currentProject?.title || 'No project yet'}</p></Link>
        <Link to="/portal/activity" className="glass rounded-2xl border border-ink-800/50 p-5 transition hover:border-accent-500/30 hover:bg-white/[0.04]"><BellRing className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Notifications</p><p className="mt-2 text-sm font-medium text-white">{unreadNotifications ? `${unreadNotifications} unread` : 'All caught up'}</p></Link>
        <Link to="/portal/messages" className="glass rounded-2xl border border-ink-800/50 p-5 transition hover:border-accent-500/30 hover:bg-white/[0.04]"><MessageSquare className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Messages</p><p className="mt-2 text-sm font-medium text-white">{unreadMessages ? `${unreadMessages} unread` : 'Open communication'}</p></Link>
        <Link to="/portal/invoices" className="glass rounded-2xl border border-ink-800/50 p-5 transition hover:border-accent-500/30 hover:bg-white/[0.04]"><ReceiptText className="h-5 w-5 text-amber-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Outstanding</p><p className="mt-2 text-sm font-medium text-white">{money(outstandingAmount)}</p></Link>
      </section>

      {lead ? (
        <section className="glass rounded-3xl border border-accent-500/20 bg-accent-500/5 p-6 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">Your request</p><h2 className="mt-2 text-xl font-semibold text-white">{business?.name || lead.title}</h2><p className="mt-2 text-sm text-gray-400">Submitted {new Date(lead.created_at).toLocaleDateString()}</p>{business?.industry && <p className="mt-1 text-xs text-gray-500">{business.industry}</p>}</div>
            <div className="rounded-full border border-accent-500/20 bg-accent-500/10 px-4 py-2 text-sm font-medium text-accent-300">{lifecycle.label}</div>
          </div>
          <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-6 text-gray-300">{lead.requirements || 'Your request details have been received by Avelixa.'}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lifecycle.steps.map((step) => <div key={step.key} className={`rounded-xl border p-3 ${step.completed ? 'border-accent-500/20 bg-accent-500/10' : 'border-white/5 bg-white/[0.03]'}`}><div className="flex items-center gap-2">{step.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Clock3 className="h-4 w-4 text-gray-600" />}<span className={`text-xs ${step.current ? 'font-semibold text-white' : step.completed ? 'text-gray-300' : 'text-gray-600'}`}>{step.label}</span></div></div>)}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3"><Link to={nextActionHref} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-500">{nextActionLabel}<ArrowRight className="h-4 w-4" /></Link>{profile?.client_referrer_connector_id && <span className="text-xs text-gray-500">Referred to Avelixa through your Connector invitation.</span>}</div>
        </section>
      ) : (
        <section className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7"><p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Getting started</p><h2 className="mt-2 text-xl font-semibold text-white">Your Avelixa workspace is ready</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Your request and project information will appear here once you submit a request or a project is assigned to your account.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/portal/projects" className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-medium text-white">View projects <ArrowRight className="h-4 w-4" /></Link><Link to="/portal/messages" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-200">Contact Avelixa <MessageSquare className="h-4 w-4" /></Link></div></section>
      )}

      {currentProject && <section className="glass rounded-3xl border border-ink-800/50 p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Project</p><h2 className="mt-2 text-xl font-semibold text-white">{currentProject.title}</h2></div><Link to={`/portal/projects/${currentProject.id}`} className="text-sm font-medium text-accent-400 hover:text-accent-300">Open <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.max(0, Math.min(100, currentProject.progress ?? 0))}%` }} /></div><span className="text-sm text-gray-300">{currentProject.progress ?? 0}%</span><span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 text-xs text-accent-300">{currentProject.status?.replace(/_/g, ' ') || 'Pending'}</span></div></section>}

      <section className="glass rounded-3xl border border-ink-800/50 p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Account</p><h2 className="mt-2 text-xl font-semibold text-white">Invoices & payments</h2></div><Link to="/portal/invoices" className="text-sm font-medium text-accent-400 hover:text-accent-300">View invoices <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-white/[0.03] p-4"><p className="text-xs text-gray-500">Invoiced</p><p className="mt-2 text-lg text-white">{money(totalInvoiced)}</p></div><div className="rounded-2xl bg-white/[0.03] p-4"><p className="text-xs text-gray-500">Paid</p><p className="mt-2 text-lg text-white">{money(paidAmount)}</p></div><div className="rounded-2xl bg-white/[0.03] p-4"><p className="text-xs text-gray-500">Outstanding</p><p className="mt-2 text-lg text-white">{money(outstandingAmount)}</p></div></div></section>

      {notifications.length > 0 && <section className="glass rounded-3xl border border-ink-800/50 p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Updates</p><h2 className="mt-2 text-xl font-semibold text-white">Recent notifications</h2></div><Link to="/portal/activity" className="text-sm font-medium text-accent-400 hover:text-accent-300">View activity <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div><div className="mt-5 space-y-2">{notifications.slice(0, 3).map((item) => { const content = <div className={`rounded-2xl border p-4 ${item.is_read ? 'border-ink-800/50 bg-white/[0.02]' : 'border-accent-500/20 bg-accent-500/5'}`}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-white">{item.title}</p><p className="mt-1 text-sm text-gray-400">{item.content}</p></div><span className="whitespace-nowrap text-xs text-gray-600">{new Date(item.created_at).toLocaleDateString()}</span></div></div>; return item.link ? <Link key={item.id} to={item.link}>{content}</Link> : <div key={item.id}>{content}</div>; })}</div></section>}
    </div>
  );
}
