import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { FolderKanban, Users, Link as LinkIcon, DollarSign, ArrowRight, Plus, CheckCircle2, Clock3, ReceiptText } from 'lucide-react';

type Commission = { id: string; project_id: string; amount: number; commission_percentage: number; status: string; payment_reference: string | null; paid_at: string | null };
type Payout = { id: string; project_id: string | null; commission_id: string | null; amount: number; status: string | null; confirmation_status: string | null; payment_method: string | null; reference_number: string | null; sent_at: string | null; confirmed_at: string | null };

export default function ConnectorDashboardV2() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ avl_id: string | null; commission_rate: number | null } | null>(null);
  const [leads, setLeads] = useState(0); const [projects, setProjects] = useState(0); const [commissions, setCommissions] = useState<Commission[]>([]); const [payouts, setPayouts] = useState<Payout[]>([]); const [projectNames, setProjectNames] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [confirming, setConfirming] = useState<string | null>(null);

  async function load() {
    if (!user?.id) return; setLoading(true); setError('');
    try {
      const [profileResult, leadsResult, projectsResult, commissionsResult, payoutsResult] = await Promise.all([
        supabase.from('connector_profiles').select('avl_id,commission_rate').eq('user_id', user.id).maybeSingle(),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('connector_id', user.id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('connector_id', user.id).not('status','in','(completed,cancelled)'),
        supabase.from('commissions').select('id,project_id,amount,commission_percentage,status,payment_reference,paid_at').eq('connector_id', user.id).order('created_at',{ascending:false}),
        supabase.from('payouts').select('id,project_id,commission_id,amount,status,confirmation_status,payment_method,reference_number,sent_at,confirmed_at').eq('recipient_id',user.id).eq('recipient_role','connector').order('created_at',{ascending:false}).limit(20),
      ]);
      if (profileResult.error) throw profileResult.error; if (leadsResult.error) throw leadsResult.error; if (projectsResult.error) throw projectsResult.error; if (commissionsResult.error) throw commissionsResult.error; if (payoutsResult.error) throw payoutsResult.error;
      const nextCommissions = (commissionsResult.data || []) as Commission[]; const nextPayouts = (payoutsResult.data || []) as Payout[];
      const ids = [...new Set([...nextCommissions.map(c=>c.project_id), ...nextPayouts.map(p=>p.project_id).filter(Boolean) as string[]])];
      let names: Record<string,string> = {};
      if (ids.length) { const { data, error: projectError } = await supabase.from('projects').select('id,title').in('id',ids); if (projectError) throw projectError; names = Object.fromEntries((data || []).map((p:any)=>[p.id,p.title])); }
      setProfile(profileResult.data); setLeads(leadsResult.count || 0); setProjects(projectsResult.count || 0); setCommissions(nextCommissions); setPayouts(nextPayouts); setProjectNames(names);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load Connector data.'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ void load(); },[user?.id]);

  async function confirmPayout(id:string) { setConfirming(id); setError(''); try { const { error: rpcError } = await supabase.rpc('connector_confirm_commission_received',{p_payout_id:id}); if(rpcError) throw rpcError; await load(); } catch(e) { setError(e instanceof Error ? e.message : 'Unable to confirm payment.'); } finally { setConfirming(null); } }
  const paidCommissions = commissions.filter(c=>['paid','completed'].includes(String(c.status).toLowerCase())).reduce((s,c)=>s+Number(c.amount||0),0);
  return <div className="space-y-8"><div><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center"><LinkIcon className="w-5 h-5 text-accent-400"/></div><div><h1 className="text-2xl font-bold text-white">Connector Dashboard</h1><p className="text-sm text-gray-400">Manage your leads, projects, commissions and payouts.</p></div></div></div>{error&&<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
    {profile&&<div className="rounded-xl bg-accent-500/10 border border-accent-500/20 p-4 flex flex-col sm:flex-row sm:justify-between gap-3"><span className="text-white">Connector ID <strong className="font-mono text-accent-400 ml-2">{profile.avl_id||'Not assigned'}</strong></span><span className="text-sm text-gray-400">Commission rate: <strong className="text-accent-400">{profile.commission_rate ?? 0}%</strong></span></div>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Stat icon={Users} label="My Leads" value={loading?'—':String(leads)}/><Stat icon={FolderKanban} label="Active Projects" value={loading?'—':String(projects)}/><Stat icon={DollarSign} label="Paid Commissions" value={loading?'—':`KSh ${paidCommissions.toLocaleString()}`}/></div>
    <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6"><div className="flex items-center gap-3 mb-5"><ReceiptText className="w-5 h-5 text-accent-400"/><div><h2 className="text-lg font-medium text-white">Commission Payments</h2><p className="text-sm text-gray-500">Payments belonging to your authenticated Connector account.</p></div></div>{payouts.length===0?<p className="text-sm text-gray-400">No commission payouts yet.</p>:<div className="space-y-3">{payouts.map(p=><div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><p className="font-medium text-white">{projectNames[p.project_id||'']||'Project'}</p><p className="text-sm text-gray-400">KSh {Number(p.amount).toLocaleString()} · {p.payment_method||'Avelixa internal transfer'}</p><p className="mt-1 text-xs text-gray-500">Reference: {p.reference_number||'—'}</p></div><div className="flex flex-col items-start lg:items-end gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase ${p.confirmation_status==='confirmed'?'bg-emerald-500/10 text-emerald-400':'bg-amber-500/10 text-amber-400'}`}>{p.confirmation_status==='confirmed'?<CheckCircle2 className="w-4 h-4"/>:<Clock3 className="w-4 h-4"/>}{p.confirmation_status==='confirmed'?'Received / Confirmed':'Awaiting Your Confirmation'}</span>{p.confirmation_status==='sent'&&<button onClick={()=>void confirmPayout(p.id)} disabled={confirming===p.id} className="rounded-xl bg-accent-600 px-4 py-2 text-sm text-white disabled:opacity-50">{confirming===p.id?'Confirming…':'Confirm Payment Received'}</button>}</div></div>)}</div>}</div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Link to="/portal/leads/new" className="rounded-2xl bg-accent-600 p-6 text-white"><Plus className="w-5 h-5"/><h2 className="mt-4 font-medium">Submit New Lead</h2><p className="mt-1 text-sm text-white/70">Register a business you've connected with.</p><ArrowRight className="mt-4 w-5 h-5"/></Link><Link to="/portal/connector/leads" className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white"><Users className="w-5 h-5 text-accent-400"/><h2 className="mt-4 font-medium">View My Leads</h2><p className="mt-1 text-sm text-gray-400">Track businesses you've submitted.</p><ArrowRight className="mt-4 w-5 h-5 text-gray-500"/></Link></div></div>;
}
function Stat({icon:Icon,label,value}:{icon:any;label:string;value:string}){return <div className="glass rounded-2xl p-6"><div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-500"><Icon className="w-5 h-5 text-accent-500"/>{label}</div><div className="mt-4 text-4xl font-light text-white">{value}</div></div>}
