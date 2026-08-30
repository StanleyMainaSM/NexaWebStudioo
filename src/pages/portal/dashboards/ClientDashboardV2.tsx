import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BellRing, CheckCircle2, Clock3, FileText, FolderKanban, Loader2, MessageSquare, ReceiptText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { getClientLifecycleState, type ClientLifecycleState } from '../../../lib/clientPortal';

type Profile = { full_name: string | null; email: string | null };
type Lead = { id: string; business_id: string | null; title: string; requirements: string | null; status: string | null; created_at: string };
type Project = { id: string; business_id: string | null; title: string; status: string | null; progress: number | null; updated_at: string | null; deadline: string | null };
type Invoice = { id: string; amount: number | null; status: string | null; due_date: string | null };
type Payment = { invoice_id: string | null; amount: number | null; status: string | null };

function displayName(profile: Profile | null, email?: string | null) { return profile?.full_name?.trim() || email?.split('@')[0] || 'Client'; }
function money(value: number) { return `KSh ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`; }
function paidFor(invoiceId: string, payments: Payment[]) { return payments.filter((payment) => payment.invoice_id === invoiceId && ['completed', 'paid', 'successful', 'success'].includes(String(payment.status || '').toLowerCase())).reduce((sum, payment) => sum + Number(payment.amount || 0), 0); }

export default function ClientDashboardV2() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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
        const [profileResult, leadResult, projectResult, invoiceResult, notificationResult] = await Promise.all([
          supabase.from('profiles').select('full_name,email').eq('id', userId).maybeSingle(),
          supabase.from('leads').select('id,business_id,title,requirements,status,created_at').eq('client_id', userId).order('created_at', { ascending: false }).limit(1),
          supabase.from('projects').select('id,business_id,title,status,progress,updated_at,deadline').eq('client_id', userId).order('updated_at', { ascending: false }).limit(1),
          supabase.from('invoices').select('id,amount,status,due_date').eq('client_id', userId).order('created_at', { ascending: false }),
          supabase.from('notifications').select('id,is_read,notification_type').eq('user_id', userId).eq('is_read', false),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (leadResult.error) throw leadResult.error;
        if (projectResult.error) throw projectResult.error;
        if (invoiceResult.error) throw invoiceResult.error;
        if (notificationResult.error) throw notificationResult.error;
        const invoiceRows = (invoiceResult.data || []) as Invoice[];
        let paymentRows: Payment[] = [];
        if (invoiceRows.length) {
          const paymentResult = await supabase.from('payments').select('invoice_id,amount,status').in('invoice_id', invoiceRows.map((invoice) => invoice.id));
          if (paymentResult.error) throw paymentResult.error;
          paymentRows = (paymentResult.data || []) as Payment[];
        }
        if (!mounted) return;
        const notifications = notificationResult.data || [];
        setProfile((profileResult.data || null) as Profile | null);
        setLead((leadResult.data?.[0] || null) as Lead | null);
        setProject((projectResult.data?.[0] || null) as Project | null);
        setInvoices(invoiceRows); setPayments(paymentRows);
        setUnreadNotifications(notifications.length);
        setUnreadMessages(notifications.filter((item) => item.notification_type === 'message').length);
      } catch (loadError) {
        console.error('Client dashboard load error:', loadError);
        if (mounted) setError('We could not load your Client Portal right now. Please try again.');
      } finally { if (mounted) setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, [user?.id]);

  const lifecycle: ClientLifecycleState = getClientLifecycleState(lead?.status, project?.status);
  const outstanding = useMemo(() => invoices.reduce((sum, invoice) => sum + Math.max(Number(invoice.amount || 0) - paidFor(invoice.id, payments), 0), 0), [invoices, payments]);
  const nextAction = outstanding > 0 ? { label: 'Review invoices', href: '/portal/invoices' } : project ? { label: 'Open project', href: `/portal/projects/${project.id}` } : lead ? { label: 'View request updates', href: '/portal/activity' } : { label: 'View projects', href: '/portal/projects' };

  if (loading) return <div className="glass rounded-3xl border border-ink-800/50 p-8"><div className="flex items-center gap-3 text-white"><Loader2 className="h-5 w-5 animate-spin text-accent-500" />Loading your Client Portal...</div></div>;
  if (error) return <div className="glass rounded-3xl border border-red-500/20 bg-red-500/5 p-8"><h2 className="text-xl font-semibold text-white">Dashboard unavailable</h2><p className="mt-2 text-sm text-gray-400">{error}</p></div>;

  const name = displayName(profile, user?.email);
  const currentTitle = project?.title || lead?.title || 'No request yet';
  const currentStatus = project ? lifecycle.label : lead ? lifecycle.label : 'Getting started';

  return <div className="space-y-6 pb-8"><section className="relative overflow-hidden rounded-3xl border border-ink-800/50 bg-gradient-to-br from-accent-600/20 via-white/[0.04] to-transparent p-6 md:p-8"><div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" /><div className="relative"><div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400"><Sparkles className="h-3.5 w-3.5" />Client Portal</div><h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">Welcome back, {name}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">Your workspace is ready. Here is the small set of information you need most often.</p></div></section><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Link to={project ? `/portal/projects/${project.id}` : '/portal/projects'} className="glass rounded-2xl border border-ink-800/50 p-5 transition hover:border-accent-500/30 hover:bg-white/[0.04]"><FolderKanban className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Current work</p><p className="mt-2 truncate text-sm font-medium text-white">{currentTitle}</p></Link><Link to="/portal/activity" className="glass rounded-2xl border border-ink-800/50 p-5 transition hover:border-accent-500/30 hover:bg-white/[0.04]"><BellRing className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Updates</p><p className="mt-2 text-sm font-medium text-white">{unreadNotifications ? `${unreadNotifications} unread` : 'All caught up'}</p></Link><Link to="/portal/messages" className="glass rounded-2xl border border-ink-800/50 p-5 transition hover:border-accent-500/30 hover:bg-white/[0.04]"><MessageSquare className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Messages</p><p className="mt-2 text-sm font-medium text-white">{unreadMessages ? `${unreadMessages} unread` : 'Open communication'}</p></Link><Link to="/portal/invoices" className="glass rounded-2xl border border-ink-800/50 p-5 transition hover:border-accent-500/30 hover:bg-white/[0.04]"><ReceiptText className="h-5 w-5 text-amber-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Balance</p><p className="mt-2 text-sm font-medium text-white">{money(outstanding)}</p></Link></section><section className="glass rounded-3xl border border-accent-500/20 bg-accent-500/5 p-6 md:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">What is happening</p><h2 className="mt-2 text-xl font-semibold text-white">{currentTitle}</h2><p className="mt-2 text-sm text-gray-400">{project?.updated_at ? `Last updated ${new Date(project.updated_at).toLocaleDateString()}.` : lead?.created_at ? `Request submitted ${new Date(lead.created_at).toLocaleDateString()}.` : 'Submit a request to start your Avelixa workflow.'}</p></div><div className="rounded-full border border-accent-500/20 bg-accent-500/10 px-4 py-2 text-sm font-medium text-accent-300">{currentStatus}</div></div>{(lead || project) && <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{lifecycle.steps.map((step) => <div key={step.key} className={`rounded-xl border p-3 ${step.completed ? 'border-accent-500/20 bg-accent-500/10' : 'border-white/5 bg-white/[0.03]'}`}><div className="flex items-center gap-2">{step.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Clock3 className="h-4 w-4 text-gray-600" />}<span className={`text-xs ${step.current ? 'font-semibold text-white' : step.completed ? 'text-gray-300' : 'text-gray-600'}`}>{step.label}</span></div></div>)}</div>}<div className="mt-6 flex flex-wrap gap-3"><Link to={nextAction.href} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-500">{nextAction.label}<ArrowRight className="h-4 w-4" /></Link><Link to="/portal/projects" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-200"><FolderKanban className="h-4 w-4" />Projects</Link><Link to="/portal/documents" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-200"><FileText className="h-4 w-4" />Documents</Link></div></section></div>;
}
