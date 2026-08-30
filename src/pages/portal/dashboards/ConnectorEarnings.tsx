import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, DollarSign, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

type Commission = { id: string; project_id: string | null; amount: number | null; status: string | null; created_at: string | null };
type Payout = { id: string; project_id: string | null; amount: number | null; status: string | null; confirmation_status: string | null; payment_method: string | null; reference_number: string | null };
type Project = { id: string; title: string };

function money(value: number | null | undefined) { return `KSh ${Number(value || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`; }

export default function ConnectorEarnings() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  async function load() {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [commissionResult, payoutResult] = await Promise.all([
        supabase.from('commissions').select('id,project_id,amount,status,created_at').eq('connector_id', user.id).order('created_at', { ascending: false }),
        supabase.from('payouts').select('id,project_id,amount,status,confirmation_status,payment_method,reference_number').eq('recipient_id', user.id).eq('recipient_role', 'connector').order('created_at', { ascending: false }),
      ]);
      if (commissionResult.error) throw commissionResult.error;
      if (payoutResult.error) throw payoutResult.error;
      const nextCommissions = (commissionResult.data || []) as Commission[];
      const nextPayouts = (payoutResult.data || []) as Payout[];
      const projectIds = [...new Set([...nextCommissions.map((row) => row.project_id), ...nextPayouts.map((row) => row.project_id)].filter(Boolean) as string[])];
      let names: Record<string, string> = {};
      if (projectIds.length) {
        const projectResult = await supabase.from('projects').select('id,title').in('id', projectIds);
        if (projectResult.error) throw projectResult.error;
        names = Object.fromEntries(((projectResult.data || []) as Project[]).map((project) => [project.id, project.title]));
      }
      setCommissions(nextCommissions); setPayouts(nextPayouts); setProjects(names);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load earnings.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [user?.id]);

  async function confirmPayout(id: string) {
    setConfirming(id); setError('');
    try {
      const { error: rpcError } = await supabase.rpc('connector_confirm_commission_received', { p_payout_id: id });
      if (rpcError) throw rpcError;
      await load();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Unable to confirm payment.');
    } finally { setConfirming(null); }
  }

  if (loading) return <div className="glass rounded-2xl p-8"><div className="flex items-center gap-3 text-gray-300"><Loader2 className="h-5 w-5 animate-spin text-accent-400" />Loading earnings...</div></div>;
  const earned = commissions.filter((row) => ['paid', 'completed'].includes(String(row.status || '').toLowerCase())).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const pending = commissions.filter((row) => !['paid', 'completed'].includes(String(row.status || '').toLowerCase())).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const paidOut = payouts.filter((row) => ['paid', 'completed'].includes(String(row.status || '').toLowerCase()) || row.confirmation_status === 'confirmed').reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return <div className="space-y-6"><Link to="/portal/connector" className="inline-flex items-center text-sm text-gray-400 hover:text-white">← Back to Dashboard</Link><div><h1 className="text-2xl font-bold text-white">Earnings</h1><p className="mt-2 text-sm text-gray-400">Your database-backed commissions and Connector payouts.</p></div>{error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}<div className="grid gap-4 sm:grid-cols-3"><div className="glass rounded-2xl border border-ink-800/50 p-5"><DollarSign className="h-5 w-5 text-accent-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Earned</p><p className="mt-2 text-2xl font-semibold text-white">{money(earned)}</p></div><div className="glass rounded-2xl border border-ink-800/50 p-5"><Clock3 className="h-5 w-5 text-amber-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Pending</p><p className="mt-2 text-2xl font-semibold text-white">{money(pending)}</p></div><div className="glass rounded-2xl border border-ink-800/50 p-5"><CheckCircle2 className="h-5 w-5 text-emerald-400" /><p className="mt-4 text-xs uppercase tracking-[0.2em] text-gray-500">Paid out</p><p className="mt-2 text-2xl font-semibold text-white">{money(paidOut)}</p></div></div><section className="glass rounded-2xl border border-ink-800/50 p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-gray-500">Commission history</p><h2 className="mt-2 text-xl font-semibold text-white">Commissions</h2></div><Link to="/portal/connector/leads" className="text-sm text-accent-400">My Leads <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div>{commissions.length === 0 ? <p className="mt-5 text-sm text-gray-400">No commissions recorded yet.</p> : <div className="mt-5 space-y-2">{commissions.map((commission) => <div key={commission.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-white">{projects[commission.project_id || ''] || 'Project'}</p><p className="mt-1 text-xs text-gray-500">{commission.created_at ? new Date(commission.created_at).toLocaleDateString('en-KE') : '—'}</p></div><div className="text-left sm:text-right"><p className="text-sm font-semibold text-white">{money(commission.amount)}</p><p className="mt-1 text-xs capitalize text-gray-500">{(commission.status || 'pending').replace(/_/g, ' ')}</p></div></div>)}</div>}</section><section className="glass rounded-2xl border border-ink-800/50 p-6"><div><p className="text-xs uppercase tracking-[0.2em] text-gray-500">Payouts</p><h2 className="mt-2 text-xl font-semibold text-white">Payment history</h2></div>{payouts.length === 0 ? <p className="mt-5 text-sm text-gray-400">No commission payouts yet.</p> : <div className="mt-5 space-y-3">{payouts.map((payout) => <div key={payout.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-medium text-white">{projects[payout.project_id || ''] || 'Project'}</p><p className="mt-1 text-sm text-gray-400">{money(payout.amount)} · {payout.payment_method || 'Avelixa internal transfer'}</p><p className="mt-1 text-xs text-gray-500">Reference: {payout.reference_number || '—'}</p></div><div className="flex flex-col items-start lg:items-end gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase ${payout.confirmation_status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{payout.confirmation_status === 'confirmed' ? 'Received / Confirmed' : 'Awaiting confirmation'}</span>{payout.confirmation_status === 'sent' && <button type="button" onClick={() => void confirmPayout(payout.id)} disabled={confirming === payout.id} className="rounded-xl bg-accent-600 px-4 py-2 text-sm text-white disabled:opacity-50">{confirming === payout.id ? 'Confirming…' : 'Confirm Payment Received'}</button>}</div></div></div>)}</div>}</section></div>;
}
