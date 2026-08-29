import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { FolderKanban, Users, Link as LinkIcon, DollarSign, ArrowRight, Plus, Activity, CheckCircle2, Clock3, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';

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

export default function ConnectorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ leads: 0, activeProjects: 0, commissions: 0 });
  const [connectorProfile, setConnectorProfile] = useState<{ avl_id?: string | null; is_active?: boolean | null; commission_rate?: number | null } | null>(null);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingPayout, setConfirmingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  async function loadData() {
    const userId = user?.id;
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [profileResult, leadsResult, projectsResult, commissionsResult, payoutResult] = await Promise.all([
        supabase.from('connector_profiles').select('avl_id, is_active, commission_rate').eq('user_id', userId).maybeSingle(),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('connector_id', userId),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('connector_id', userId).not('status', 'in', '(completed,cancelled)'),
        supabase.from('commissions').select('amount').eq('connector_id', userId).eq('status', 'paid'),
        supabase.from('payouts').select('id, project_id, commission_id, amount, status, confirmation_status, payment_method, reference_number, sent_at, confirmed_at').eq('recipient_id', userId).eq('recipient_role', 'connector').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (profileResult.error) console.error('Error loading connector profile:', profileResult.error);
      if (leadsResult.error) console.error('Error loading connector leads:', leadsResult.error);
      if (projectsResult.error) console.error('Error loading connector projects:', projectsResult.error);
      if (commissionsResult.error) console.error('Error loading connector commissions:', commissionsResult.error);
      if (payoutResult.error) console.error('Error loading connector payouts:', payoutResult.error);

      if (profileResult.data) setConnectorProfile(profileResult.data);
      setPayout((payoutResult.data || null) as Payout | null);
      const totalCommissions = (commissionsResult.data || []).reduce((total: number, commission: { amount: number | null }) => total + Number(commission.amount || 0), 0);
      setStats({ leads: leadsResult.count || 0, activeProjects: projectsResult.count || 0, commissions: totalCommissions });
    } catch (error) {
      console.error('Unexpected error loading connector dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [user?.id]);

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
          <div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center"><LinkIcon className="w-5 h-5 text-accent-400" /></div>
          <div><h1 className="text-2xl font-bold text-white">Connector Dashboard</h1><p className="text-sm text-gray-400">Manage your leads, projects and commissions.</p></div>
        </div>
      </div>

      {connectorProfile && <div className="mb-8 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3"><LinkIcon className="w-5 h-5 text-accent-400" /><span className="text-white">Your Connector ID</span><span className="font-mono text-accent-400 font-bold">{connectorProfile.avl_id || 'Not assigned'}</span></div>
        <div className="text-xs text-gray-400">Commission rate: <span className="text-accent-400 font-medium">{connectorProfile.commission_rate ?? 20}%</span></div>
      </div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Link to="/portal/connector/leads" className="glass rounded-2xl p-6 hover:border-accent-500/30 border border-transparent transition-colors group">
          <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-accent-500" /><div className="text-xs font-bold text-ink-500 uppercase tracking-widest">My Leads</div></div><ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-accent-400" /></div>
          <div className="text-4xl font-light text-white">{loading ? '—' : stats.leads}</div><div className="mt-3 text-xs text-gray-500">View submitted leads</div>
        </Link>
        <div className="glass rounded-2xl p-6"><div className="flex items-center gap-3 mb-4"><FolderKanban className="w-5 h-5 text-accent-500" /><div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Active Projects</div></div><div className="text-4xl font-light text-white">{loading ? '—' : stats.activeProjects}</div><div className="mt-3 text-xs text-gray-500">Projects connected to your leads</div></div>
        <div className="glass rounded-2xl p-6"><div className="flex items-center gap-3 mb-4"><DollarSign className="w-5 h-5 text-accent-500" /><div className="text-xs font-bold text-ink-500 uppercase tracking-widest">Earned Commissions</div></div><div className="text-4xl font-light text-white">{loading ? '—' : `KSh ${stats.commissions.toLocaleString()}`}</div><div className="mt-3 text-xs text-gray-500">Paid commissions</div></div>
      </div>

      {payout && <div className="glass rounded-2xl p-6 border border-ink-800/50 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2"><ReceiptText className="w-5 h-5 text-accent-400" /><h2 className="text-lg font-medium text-white">Latest Commission Payment</h2></div>
            <p className="text-sm text-gray-400">Suit &amp; Wear commission • KSh {Number(payout.amount).toLocaleString()}</p>
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
            <div className="flex items-center justify-between py-3"><span className="text-sm text-gray-400">Paid commissions</span><span className="text-sm text-accent-400 font-medium">{loading ? '—' : `KSh ${stats.commissions.toLocaleString()}`}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
