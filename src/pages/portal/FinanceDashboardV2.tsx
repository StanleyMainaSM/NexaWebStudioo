import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, RefreshCw, WalletCards, ReceiptText, BadgeDollarSign, HandCoins, ShieldAlert, LockKeyhole, CheckCircle2, Clock3, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Summary = { revenue_received: number; total_client_payments: number; operator_costs: number; connector_commissions_earned: number; connector_payouts_paid: number; remaining_margin: number; outstanding_invoices: number };
type LedgerRow = { id: string; transaction_type: string; amount: number; status: string; verification_status: string | null; payment_date: string | null; created_at: string; reference_number: string | null; description: string | null };
const empty: Summary = { revenue_received: 0, total_client_payments: 0, operator_costs: 0, connector_commissions_earned: 0, connector_payouts_paid: 0, remaining_margin: 0, outstanding_invoices: 0 };

function money(value: number) { return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value); }
function statusClass(status: string) { const s = status.toLowerCase(); return ['paid','completed','verified'].includes(s) ? 'bg-emerald-500/10 text-emerald-400' : ['cancelled','canceled','failed','rejected'].includes(s) ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'; }
function label(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

export default function FinanceDashboardV2() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [authError, setAuthError] = useState('');
  const [summary, setSummary] = useState<Summary>(empty);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadFinance() {
    setLoading(true); setError('');
    try {
      const [{ data: summaryData, error: summaryError }, { data: ledgerData, error: ledgerError }] = await Promise.all([
        supabase.rpc('owner_get_finance_summary'),
        supabase.from('finance_transactions').select('id,transaction_type,amount,status,verification_status,payment_date,created_at,reference_number,description').order('created_at', { ascending: false }).limit(100),
      ]);
      if (summaryError) throw summaryError;
      if (ledgerError) throw ledgerError;
      const row = Array.isArray(summaryData) ? summaryData[0] : summaryData;
      setSummary(row ? { ...empty, ...Object.fromEntries(Object.entries(row).map(([k,v]) => [k, Number(v || 0)])) } as Summary : empty);
      setLedger((ledgerData || []) as LedgerRow[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load financial information.'); }
    finally { setLoading(false); }
  }

  async function unlockFinance() {
    setAuthError('');
    if (!password) { setAuthError('Enter your Owner password to continue.'); return; }
    setUnlocking(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) throw userError || new Error('Authenticated Owner account could not be verified.');
      const { data: roles, error: rolesError } = await supabase.rpc('get_my_roles');
      if (rolesError) throw rolesError;
      const isOwner = Array.isArray(roles) && roles.some((r: any) => String(typeof r === 'string' ? r : r?.role || '').toLowerCase() === 'owner');
      if (!isOwner) throw new Error('Owner authorization could not be confirmed.');
      setPassword(''); setUnlocked(true); await loadFinance();
    } catch (e) { setUnlocked(false); setAuthError(e instanceof Error ? e.message : 'Unable to unlock Finance.'); }
    finally { setUnlocking(false); }
  }

  useEffect(() => { if (unlocked) void loadFinance(); }, [unlocked]);

  if (!unlocked) return <div className="max-w-xl mx-auto py-10"><Link to="/portal/owner" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"><ArrowLeft className="w-4 h-4" />Back to Owner Dashboard</Link><div className="mt-8 rounded-2xl border border-ink-800/60 bg-ink-900/40 p-8"><div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><LockKeyhole className="w-7 h-7 text-amber-400" /></div><h1 className="mt-6 text-2xl font-semibold text-white">Owner Finance</h1><p className="mt-2 text-sm leading-6 text-gray-400">Sensitive financial information is restricted to authorized Owner access.</p>{authError && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{authError}</div>}<form onSubmit={e => { e.preventDefault(); void unlockFinance(); }} className="mt-6 space-y-4"><label className="block text-sm text-gray-400">Owner Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="mt-2 w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500" /></label><button disabled={unlocking || !password} className="w-full rounded-xl bg-accent-600 px-5 py-3 text-white font-medium disabled:opacity-50">{unlocking ? 'Verifying...' : 'Unlock Finance'}</button></form></div></div>;

  return <div className="space-y-8"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><Link to="/portal/owner" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-4"><ArrowLeft className="w-4 h-4" />Owner Dashboard</Link><h1 className="text-2xl font-semibold text-white">Finance</h1><p className="text-sm text-gray-400 mt-1">Revenue, costs, commissions and margin from the underlying financial records.</p></div><button onClick={() => void loadFinance()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-ink-800 px-4 py-2.5 text-gray-300 disabled:opacity-50"><RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />Refresh</button></div>{error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"><Card icon={BadgeDollarSign} label="Revenue Received" value={money(summary.revenue_received)} /><Card icon={ReceiptText} label="All Client Payments" value={money(summary.total_client_payments)} /><Card icon={HandCoins} label="Operator Costs" value={money(summary.operator_costs)} /><Card icon={WalletCards} label="Connector Commissions" value={money(summary.connector_commissions_earned)} /><Card icon={ShieldAlert} label="Outstanding Invoices" value={money(summary.outstanding_invoices)} /></div>
    <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-6"><div className="text-xs uppercase tracking-widest text-accent-400 font-bold">Remaining Avelixa Margin</div><div className="mt-2 text-3xl font-semibold text-white">{money(summary.remaining_margin)}</div><p className="mt-2 text-sm text-gray-400">Received client revenue − operator costs − earned connector commissions.</p><div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm"><div className="rounded-xl bg-white/5 p-3 text-gray-300">Revenue <strong className="text-white ml-1">{money(summary.revenue_received)}</strong></div><div className="rounded-xl bg-white/5 p-3 text-gray-300">Costs <strong className="text-white ml-1">{money(summary.operator_costs)}</strong></div><div className="rounded-xl bg-white/5 p-3 text-gray-300">Commissions <strong className="text-white ml-1">{money(summary.connector_commissions_earned)}</strong></div></div></div>
    <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 overflow-hidden"><div className="p-5 border-b border-ink-800/60"><h2 className="text-lg font-medium text-white">Financial Ledger</h2><p className="text-sm text-gray-500 mt-1">Underlying recorded financial transactions; payouts are not added again to the margin calculation.</p></div>{ledger.length === 0 ? <div className="p-10 text-center text-gray-400">No financial transactions recorded.</div> : <div className="divide-y divide-ink-800/60">{ledger.map(row => <div key={row.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div className="flex items-start gap-3"><div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">{row.transaction_type.includes('payment') || row.transaction_type.includes('income') ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}</div><div><p className="font-medium text-white">{label(row.transaction_type)}</p><p className="text-sm text-gray-500">{row.description || row.reference_number || 'Avelixa financial transaction'}</p><div className="mt-2 flex flex-wrap gap-2"><span className="text-xs text-gray-500">{new Date(row.payment_date || row.created_at).toLocaleDateString('en-KE')}</span>{row.reference_number && <span className="text-xs text-gray-500">Ref: {row.reference_number}</span>}{row.verification_status && <span className={`px-2 py-1 rounded-lg text-xs ${statusClass(row.verification_status)}`}>{row.verification_status}</span>}</div></div></div><div className="flex items-center gap-3"><span className="font-semibold text-white">{money(Number(row.amount || 0))}</span><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${statusClass(row.status)}`}>{['paid','completed','verified'].includes(row.status.toLowerCase()) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}{label(row.status)}</span></div></div>)}</div>}</div>
    <div className="text-xs text-gray-500">Paid connector payouts: <span className="text-gray-300">{money(summary.connector_payouts_paid)}</span>. This is a payout status measure, not an additional expense deducted from margin.</div></div>;
}
function Card({ icon: Icon, label, value }: { icon: any; label: string; value: string }) { return <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-5"><div className="flex items-center gap-3 text-sm text-gray-400"><Icon className="w-5 h-5 text-accent-400" />{label}</div><div className="mt-3 text-2xl font-semibold text-white">{value}</div></div>; }
