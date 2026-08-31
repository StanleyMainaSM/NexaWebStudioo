import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Operator { id: string; full_name: string | null; email: string; }
interface Access { operator_id: string; can_view: boolean; can_generate: boolean; can_edit: boolean; }

export default function CreationOperatorAccess() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [access, setAccess] = useState<Record<string, Access>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [{ data: roles, error: roleError }, { data: profiles, error: profileError }, { data: grants, error: grantError }] = await Promise.all([
        supabase.from('user_roles').select('user_id,role').eq('role', 'operator'),
        supabase.from('profiles').select('id,email,full_name').order('full_name'),
        supabase.from('creation_operator_access').select('operator_id,can_view,can_generate,can_edit'),
      ]);
      if (roleError) throw roleError; if (profileError) throw profileError; if (grantError) throw grantError;
      const ids = new Set((roles || []).map((row) => row.user_id));
      setOperators((profiles || []).filter((profile) => ids.has(profile.id)) as Operator[]);
      const map: Record<string, Access> = {};
      (grants || []).forEach((row) => { map[row.operator_id] = row as Access; });
      setAccess(map);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load Operator access controls.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  async function save(operatorId: string, next: Partial<Access>) {
    setSaving(operatorId); setError(''); setMessage('');
    const current = access[operatorId] || { operator_id: operatorId, can_view: false, can_generate: false, can_edit: false };
    const value = { ...current, ...next };
    const result = await supabase.rpc('set_creation_operator_access', { p_operator_id: operatorId, p_can_view: value.can_view, p_can_generate: value.can_generate, p_can_edit: value.can_edit });
    if (result.error) setError(result.error.message); else { setAccess((old) => ({ ...old, [operatorId]: value })); setMessage('Operator creation access updated.'); }
    setSaving(null);
  }

  return <div className="space-y-8"><div className="flex items-center justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-widest text-accent-400">Owner Controls</div><h1 className="mt-2 text-3xl font-semibold text-white">Creation Operator Access</h1><p className="mt-2 text-sm text-gray-400">Grant explicit preview, generation and editing permissions. Operators are not enabled automatically.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-200"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Refresh</button></div>
    {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
    {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</div>}
    <div className="rounded-3xl border border-white/10 bg-white/[.03] p-6"><div className="mb-5 flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-accent-400"/><div><h2 className="font-semibold text-white">Explicit permissions</h2><p className="text-xs text-gray-500">Server-side policies enforce these settings.</p></div></div>{loading ? <div className="grid place-items-center p-10"><Loader2 className="h-7 w-7 animate-spin text-accent-400" /></div> : operators.length === 0 ? <div className="rounded-2xl border border-white/10 p-10 text-center text-gray-500">No Operators found.</div> : <div className="space-y-3">{operators.map((operator) => { const current = access[operator.id] || { operator_id: operator.id, can_view: false, can_generate: false, can_edit: false }; return <div key={operator.id} className="grid gap-5 rounded-2xl border border-white/10 bg-white/[.02] p-5 md:grid-cols-[1fr_auto] md:items-center"><div><div className="font-semibold text-white">{operator.full_name || 'Unnamed Operator'}</div><div className="text-sm text-gray-500">{operator.email}</div></div><div className="flex flex-wrap gap-2">{([['can_view','View'],['can_generate','Generate'],['can_edit','Edit']] as const).map(([key,label]) => <button type="button" key={key} disabled={saving === operator.id} onClick={() => void save(operator.id, { [key]: !current[key] })} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${current[key] ? 'border-accent-500/30 bg-accent-500/10 text-accent-300' : 'border-white/10 text-gray-500'}`}>{label}: {current[key] ? 'On' : 'Off'}</button>)}</div></div>; })}</div>}</div>
  </div>;
}
