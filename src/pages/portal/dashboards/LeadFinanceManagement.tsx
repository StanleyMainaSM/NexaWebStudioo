import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { RefreshCw, Save, WalletCards, Users } from 'lucide-react';

type Lead = { id:string; business_id:string|null; connector_id:string|null; client_id:string|null; title:string; requirements:string|null; estimated_budget:number|null; status:string|null; admin_notes:string|null; created_at:string|null; business?:{name:string;contact_name:string|null;email:string|null;phone:string|null}|null; connector?:{full_name:string|null;email:string|null}|null };
type Project = { id:string; title:string; price:number|null; client_id:string|null; connector_id:string|null; status:string|null; progress:number|null; business_id:string|null };
type ReceiptResult = { payment_id:string; invoice_id:string; total_received:number; outstanding_balance:number; payment_status:string };
const stages=['pending','under_review','contacted','qualified','won','rejected'];
const money=(v:number|null|undefined)=>'KSh '+Number(v||0).toLocaleString('en-KE',{maximumFractionDigits:2});

export default function LeadFinanceManagement(){
 const {roles}=useAuth();
 const [leads,setLeads]=useState<Lead[]>([]);
 const [projects,setProjects]=useState<Project[]>([]);
 const [received,setReceived]=useState<Record<string,number>>({});
 const [amounts,setAmounts]=useState<Record<string,string>>({});
 const [refs,setRefs]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState<string|null>(null);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const authorized=roles.some(r=>['owner','admin','operator'].includes(String(r).toLowerCase()));
 const canPay=roles.some(r=>['owner','admin'].includes(String(r).toLowerCase()));
 const load=useCallback(async()=>{
  if(!authorized){setLoading(false);return}
  setLoading(true);setError('');
  try{
   const [lr,pr]=await Promise.all([
    supabase.from('leads').select('id,business_id,connector_id,client_id,title,requirements,estimated_budget,status,admin_notes,created_at,businesses(name,contact_name,email,phone),profiles!leads_connector_id_fkey(full_name,email)').order('created_at',{ascending:false}),
    supabase.from('projects').select('id,title,price,client_id,connector_id,status,progress,business_id').order('created_at',{ascending:false})
   ]);
   if(lr.error)throw lr.error;if(pr.error)throw pr.error;
   const ls=(lr.data||[]) as unknown as Lead[];
   setLeads(ls);
   const ps=(pr.data||[]) as Project[];setProjects(ps);
   if(ps.length){
    const ids=ps.map(p=>p.id);
    const ir=await supabase.from('invoices').select('id,project_id,amount,status').in('project_id',ids);
    if(ir.error)throw ir.error;
    const inv=(ir.data||[]) as Array<{id:string;project_id:string|null;amount:number;status:string|null}>;
    const sums:Record<string,number>={};
    for(const invoice of inv){
     const pay=await supabase.from('payments').select('amount,status').eq('invoice_id',invoice.id);
     if(pay.error)throw pay.error;
     sums[invoice.project_id||'']= (sums[invoice.project_id||'']||0)+(pay.data||[]).filter(x=>['paid','completed','verified'].includes(String(x.status||'').toLowerCase())).reduce((n,x)=>n+Number(x.amount||0),0);
    }
    setReceived(sums);
   }
  }catch(e){setError(e instanceof Error?e.message:'Could not load lead and payment management.')}
  finally{setLoading(false)}
 },[authorized]);
 useEffect(()=>{void load()},[load]);
 async function updateLead(lead:Lead,status:string){
  setError('');setMessage('');
  const {error:e}=await supabase.from('leads').update({status,updated_at:new Date().toISOString()}).eq('id',lead.id);
  if(e){setError(e.message);return}
  setLeads(old=>old.map(x=>x.id===lead.id?{...x,status}:x));setMessage('Lead status saved.');
 }
 async function record(project:Project){
  setError('');setMessage('');
  const amount=Number(amounts[project.id]);
  if(!Number.isFinite(amount)||amount<=0||Math.round(amount*100)!==amount*100){setError('Enter a valid positive amount with no more than two decimal places.');return}
  const remaining=Number(project.price||0)-Number(received[project.id]||0);
  if(amount>remaining){setError('Payment exceeds the outstanding project balance.');return}
  setSaving(project.id);
  try{
   const {data,error:e}=await supabase.rpc('owner_record_project_client_payment',{p_project_id:project.id,p_amount:amount,p_receipt_key:crypto.randomUUID(),p_payment_method:'manual_recording',p_reference_number:refs[project.id]?.trim()||null,p_payment_date:new Date().toISOString()});
   if(e)throw e;
   const row=(Array.isArray(data)?data[0]:data) as ReceiptResult;
   setReceived(old=>({...old,[project.id]:Number(row.total_received)}));
   setAmounts(old=>({...old,[project.id]:''}));
   setMessage('Client receipt saved. Outstanding balance: '+money(row.outstanding_balance)+'.');
   await load();
  }catch(e){setError(e instanceof Error?e.message:'Receipt could not be saved.')}
  finally{setSaving(null)}
 }
 if(!authorized)return null;
 return <section className="space-y-5 rounded-2xl border border-ink-800/60 bg-ink-950/40 p-5">
  <div className="flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold text-white"><Users className="h-5 w-5"/>Connector Leads & Client Receipts</h2><p className="mt-1 text-sm text-gray-400">Submitted leads and project collections, using the existing records.</p></div><button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200"><RefreshCw className={loading?'h-4 w-4 animate-spin':'h-4 w-4'}/>Refresh</button></div>
  {error&&<p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{message&&<p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
  <div className="space-y-3"><h3 className="font-medium text-white">Submitted leads ({leads.length})</h3>{!loading&&!leads.length&&<p className="text-sm text-gray-500">No submitted leads are currently visible to your role.</p>}{leads.map(lead=><article key={lead.id} className="rounded-xl border border-white/10 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-medium text-white">{lead.business?.name||lead.title}</h4><p className="mt-1 text-sm text-gray-400">{lead.business?.contact_name||'Contact not supplied'} · {lead.business?.email||'No email'} · Submitted {lead.created_at?new Date(lead.created_at).toLocaleDateString('en-KE'):'—'}</p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{lead.requirements||'No additional requirements supplied.'}</p><p className="mt-1 text-xs text-gray-500">Lead ID: {lead.id} · Connector ID: {lead.connector_id||'Not attributed'}</p></div><select aria-label={'Status for '+lead.title} value={lead.status||'pending'} onChange={e=>void updateLead(lead,e.target.value)} disabled={!canPay} className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white">{Array.from(new Set([...stages,lead.status||'pending'])).map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select></div></article>)}</div>
  <div className="space-y-3"><h3 className="flex items-center gap-2 font-medium text-white"><WalletCards className="h-4 w-4"/>Project client payments</h3>{projects.map(p=>{const total=received[p.id]||0;const due=Number(p.price||0);const outstanding=Math.max(0,due-total);return <article key={p.id} className="rounded-xl border border-white/10 p-4"><div className="flex flex-wrap justify-between gap-3"><div><h4 className="font-medium text-white">{p.title}</h4><p className="mt-1 text-sm text-gray-400">Project status: {p.status||'pending'} · Progress: {p.progress??0}%</p><div className="mt-2 grid grid-cols-3 gap-4 text-sm"><span><span className="block text-gray-500">Agreed</span>{money(due)}</span><span><span className="block text-gray-500">Received</span>{money(total)}</span><span><span className="block text-gray-500">Outstanding</span>{money(outstanding)}</span></div></div></div>{canPay&&due>0&&outstanding>0&&<div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input aria-label="Receipt amount" type="number" min="0.01" step="0.01" max={outstanding} value={amounts[p.id]||''} onChange={e=>setAmounts(old=>({...old,[p.id]:e.target.value}))} placeholder="Amount received (KSh)" className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"/><input aria-label="Receipt reference" value={refs[p.id]||''} onChange={e=>setRefs(old=>({...old,[p.id]:e.target.value}))} placeholder="Reference (optional)" className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"/><button onClick={()=>void record(p)} disabled={saving===p.id} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving===p.id?'Saving…':'Record receipt'}</button></div>}{!canPay&&<p className="mt-3 text-xs text-gray-500">Payment recording is restricted to Owner/Admin.</p>}</article>})}</div>
 </section>
}
