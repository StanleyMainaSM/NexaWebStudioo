import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import {
  FolderKanban,
  Users,
  Link as LinkIcon,
  DollarSign,
  ArrowRight,
  Plus,
  Activity,
  CheckCircle2,
  Clock3,
  ReceiptText,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Commission = {
  id: string;
  project_id: string | null;
  amount: number | null;
  eligible_amount: number | null;
  commission_percentage: number | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type Project = {
  id: string;
  title: string | null;
};

type Payout = {
  id: string;
  project_id: string | null;
  commission_id: string | null;
  amount: number;
  status: string | null;
  confirmation_status: string | null;
  payment_method: string | null;
  reference_number: string | null;
  sent_at: string | null;
  confirmed_at: string | null;
};

const money = (value: number) => `KSh ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

function isCancelled(status: string | null) {
  return ['cancelled', 'canceled', 'rejected', 'void'].includes((status || '').toLowerCase());
}

function isPaid(status: string | null) {
  return ['paid', 'completed', 'confirmed'].includes((status || '').toLowerCase());
}

export default function ConnectorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ leads: 0, activeProjects: 0 });
  const [connectorProfile, setConnectorProfile] = useState<{
    avl_id?: string | null;
    is_active?: boolean | null;
    commission_rate?: number | null;
  } | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingPayout, setConfirmingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  async function loadData() {
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [profileResult, leadsResult, projectsResult, commissionsResult, payoutResult] = await Promise.all([
        supabase
          .from('connector_profiles')
          .select('avl_id, is_active, commission_rate')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('connector_id', userId),
        supabase
          .from('projects')
          .select('id, title', { count: 'exact' })
          .eq('connector_id', userId)
          .not('status', 'in', '(completed,cancelled)'),
        supabase
          .from('commissions')
          .select('id, project_id, amount, eligible_amount, commission_percentage, status, paid_at, created_at')
          .eq('connector_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('payouts')
          .select('id, project_id, commission_id, amount, status, confirmation_status, payment_method, reference_number, sent_at, confirmed_at')
          .eq('recipient_id', userId)
          .eq('recipient_role', 'connector')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.error) console.error('Error loading connector profile:', profileResult.error);
      if (leadsResult.error) console.error('Error loading connector leads:', leadsResult.error);
      if (projectsResult.error) console.error('Error loading connector projects:', projectsResult.error);
      if (commissionsResult.error) console.error('Error loading connector commissions:', commissionsResult.error);
      if (payoutResult.error) console.error('Error loading connector payouts:', payoutResult.error);

      if (profileResult.data) setConnectorProfile(profileResult.data);
      setCommissions((commissionsResult.data || []) as Commission[]);
      setProjects((projectsResult.data || []) as Project[]);
      setPayout((payoutResult.data || null) as Payout | null);
      setStats({ leads: leadsResult.count || 0, activeProjects: projectsResult.count || 0 });
    } catch (error) {
      console.error('Unexpected error loading connector dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const projectTitles = useMemo(() => new Map(projects.map((project) => [project.id, project.title || 'Project'])), [projects]);

  const earnings = useMemo(() => {
    const valid = commissions.filter((commission) => !isCancelled(commission.status));
    const totalEarned = valid.reduce((sum, commission) => sum + Number(commission.amount || 0), 0);
    const paid = valid
      .filter((commission) => isPaid(commission.status) || Boolean(commission.paid_at))
      .reduce((sum, commission) => sum + Number(commission.amount || 0), 0);
    const pending = Math.max(totalEarned - paid, 0);
    return { totalEarned, paid, pending };
  }, [commissions]);

  async function confirmPaymentReceived() {
    if (!payout || payout.confirmation_status !== 'sent') return;
    setConfirmingPayout(true);
    setPayoutError('');
    try {
      const { data, error } = await supabase.rpc('connector_confirm_commission_received', { p_payout_id: payout.id });
      if (error) throw error;
      setPayout(data as Payout);
      await loadData();
    } catch (error) {
      console.error('Error confirming commission receipt:', error);
      setPayoutError(error instanceof Error ? error.message : 'Unable to confirm the payment.');
    } finally {
      setConfirmingPayout(false);
    }
  }

  const payoutConfirmed = payout?.confirmation_status === 'confirmed';
  const payoutSent = payout?.confirmation_status === 'sent';

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center">
            <LinkIcon className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Connector Dashboard</h1>
            <p className="text-sm text-gray-400">Manage your leads, projects and commissions.</p>
          </div>
        </div>
      </div>

      {connectorProfile && (
        <div className="mb-8 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <LinkIcon className="w-5 h-5 text-accent-400" />
            <span className="text-white">Your Connector ID</span>
            <span className="font-mono text-accent-400 font-bold">{connectorProfile.avl_id || 'Not assigned'}</span>
          </div>
          <div className="text-xs text-gray-400">
            Commission rate:{' '}
            <span className="text-accent-400 font-medium">
              {connectorProfile.commission_rate == null ? 'Not configured' : `${connectorProfile.commission_rate}%`}
            </span>
          </div>
        </div>
      )}

      <section className="mb-10">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-accent-400 text-xs font-bold uppercase tracking-widest mb-2">
              <Wallet className="w-4 h-4" /> Earnings
            </div>
            <h2 className="text-xl font-semibold text-white">Your commission earnings</h2>
            <p className="text-sm text-gray-500 mt-1">Amounts below come directly from the existing Finance commission records.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-5 border border-accent-500/20">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
              <TrendingUp className="w-4 h-4 text-accent-400" /> Total Earned
            </div>
            <div className="text-2xl sm:text-3xl font-light text-white">{loading ? '—' : money(earnings.totalEarned)}</div>
            <p className="mt-2 text-xs text-gray-500">All non-cancelled commissions</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Clock3 className="w-4 h-4 text-amber-400" /> Pending
            </div>
            <div className="text-2xl sm:text-3xl font-light text-white">{loading ? '—' : money(earnings.pending)}</div>
            <p className="mt-2 text-xs text-gray-500">Commission not yet marked paid</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Paid
            </div>
            <div className="text-2xl sm:text-3xl font-light text-white">{loading ? '—' : money(earnings.paid)}</div>
            <p className="mt-2 text-xs text-gray-500">Commission records marked paid</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
              <DollarSign className="w-4 h-4 text-accent-400" /> Rate
            </div>
            <div className="text-2xl sm:text-3xl font-light text-white">
              {loading ? '—' : connectorProfile?.commission_rate == null ? '—' : `${connectorProfile.commission_rate}%`}
            </div>
            <p className="mt-2 text-xs text-gray-500">Current Connector commission rate</p>
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-6 sm:p-8 border border-ink-800/50 mb-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-medium text-white">Earnings History</h2>
            <p className="text-sm text-gray-500 mt-1">Project commissions recorded by Avelixa Finance.</p>
          </div>
          <DollarSign className="w-5 h-5 text-accent-400" />
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading earnings…</div>
        ) : commissions.length === 0 ? (
          <div className="py-10 text-center rounded-xl bg-white/[0.03] border border-white/5">
            <DollarSign className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No commission earnings have been recorded yet.</p>
            <p className="text-xs text-gray-600 mt-1">Eligible project payments will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {commissions.map((commission) => {
              const paid = isPaid(commission.status) || Boolean(commission.paid_at);
              return (
                <div key={commission.id} className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderKanban className="w-4 h-4 text-accent-400 shrink-0" />
                        <span className="text-sm font-medium text-white truncate">
                          {commission.project_id ? projectTitles.get(commission.project_id) || 'Project commission' : 'Project commission'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>{commission.created_at ? new Date(commission.created_at).toLocaleDateString('en-KE') : 'Date unavailable'}</span>
                        <span>Rate: {commission.commission_percentage == null ? '—' : `${commission.commission_percentage}%`}</span>
                        {commission.eligible_amount != null && <span>Eligible: {money(Number(commission.eligible_amount))}</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${paid ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'}`}>
                        {paid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
                        {paid ? 'Paid' : 'Pending'}
                      </div>
                      <span className="text-lg font-medium text-white whitespace-nowrap">{money(Number(commission.amount || 0))}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Link to="/portal/connector/leads" className="glass rounded-2xl p-6 hover:border-accent-500/30 border border-transparent transition-colors group">
          <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-accent-500" /><div className="text-xs font-bold text-ink-500 uppercase tracking-widest">My Leads</div></div><ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-accent-400" /></div>
          <div className="text-4xl font-light text-white">{loading ? '—' : stats.leads}</div><div className="mt-3 text-xs text-gray-500">View submitted leads</div>
        </Link>
        <div className="glass rounded-2xl p-6"><div className="flex items-center gap-3 mb-4"><FolderKanban className="w-5 h-5 text-accent-500" /><div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Active Projects</div></div><div className="text-4xl font-light text-white">{loading ? '—' : stats.activeProjects}</div><div className="mt-3 text-xs text-gray-500">Projects connected to your leads</div></div>
        <div className="glass rounded-2xl p-6"><div className="flex items-center gap-3 mb-4"><DollarSign className="w-5 h-5 text-accent-500" /><div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Paid Commissions</div></div><div className="text-4xl font-light text-white">{loading ? '—' : money(earnings.paid)}</div><div className="mt-3 text-xs text-gray-500">Paid commission records</div></div>
      </div>

      {payout && <div className="glass rounded-2xl p-6 border border-ink-800/50 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2"><ReceiptText className="w-5 h-5 text-accent-400" /><h2 className="text-lg font-medium text-white">Latest Commission Payment</h2></div>
            <p className="text-sm text-gray-400">Connector commission • {money(Number(payout.amount || 0))}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400"><span>Reference: <strong className="text-white">{payout.reference_number || '—'}</strong></span><span>Method: <strong className="text-white">{payout.payment_method || '—'}</strong></span></div>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${payoutConfirmed ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : payoutSent ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-white/10 bg-white/5 text-gray-400'}`}>
              {payoutConfirmed ? <CheckCircle2 className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}
              {payoutConfirmed ? 'Received / Confirmed' : payoutSent ? 'Awaiting Your Confirmation' : (payout.status || 'Pending')}
            </div>
            {payoutSent && <button type="button" onClick={confirmPaymentReceived} disabled={confirmingPayout} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-500 disabled:opacity-50">{confirmingPayout ? 'Confirming…' : 'Confirm Payment Received'}</button>}
            {payoutConfirmed && <p className="text-xs text-emerald-400">Your receipt confirmation has been recorded.</p>}
            {payoutError && <p className="text-xs text-red-400">{payoutError}</p>}
          </div>
        </div>
      </div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass rounded-2xl p-8 border border-ink-800/50">
          <h2 className="text-lg font-medium text-white mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <Link to="/portal/leads/new" className="block w-full px-6 py-4 rounded-xl bg-accent-600 hover:bg-accent-500 transition-colors"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Plus className="w-5 h-5 text-white" /></div><div><div className="font-medium text-white mb-1">Submit New Lead</div><div className="text-sm text-white/70">Register a business you've connected with.</div></div></div><ArrowRight className="w-5 h-5 text-white/60" /></div></Link>
            <Link to="/portal/connector/leads" className="block w-full px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-accent-400" /></div><div><div className="font-medium text-white mb-1">View My Leads</div><div className="text-sm text-gray-400">Track businesses you've submitted.</div></div></div><ArrowRight className="w-5 h-5 text-gray-600" /></div></Link>
            <Link to="/portal/activity" className="block w-full px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center"><Activity className="w-5 h-5 text-accent-400" /></div><div><div className="font-medium text-white mb-1">View Activity</div><div className="text-sm text-gray-400">See updates related to your work.</div></div></div><ArrowRight className="w-5 h-5 text-gray-600" /></div></Link>
          </div>
        </div>
        <div className="glass rounded-2xl p-8 border border-ink-800/50">
          <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-medium text-white">Connector Overview</h2><Link to="/portal/connector/leads" className="text-xs text-accent-400 hover:text-accent-300">View leads</Link></div>
          <div className="space-y-5">
            <div className="flex items-center justify-between py-3 border-b border-white/5"><span className="text-sm text-gray-400">Submitted leads</span><span className="text-sm text-white font-medium">{loading ? '—' : stats.leads}</span></div>
            <div className="flex items-center justify-between py-3 border-b border-white/5"><span className="text-sm text-gray-400">Active projects</span><span className="text-sm text-white font-medium">{loading ? '—' : stats.activeProjects}</span></div>
            <div className="flex items-center justify-between py-3"><span className="text-sm text-gray-400">Paid commissions</span><span className="text-sm text-accent-400 font-medium">{loading ? '—' : money(earnings.paid)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
