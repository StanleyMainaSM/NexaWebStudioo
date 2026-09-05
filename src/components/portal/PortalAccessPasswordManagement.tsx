import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Portal = 'client' | 'operator' | 'connector' | 'admin' | 'owner';
type StatusRow = { portal: Portal; configured: boolean; configured_at: string | null; updated_at: string | null };

const portals: Array<{ id: Portal; label: string }> = [
  { id: 'client', label: 'Client Portal' },
  { id: 'operator', label: 'Operator Portal' },
  { id: 'connector', label: 'Connector Portal' },
  { id: 'admin', label: 'Admin Portal' },
  { id: 'owner', label: 'Owner Portal' },
];

const initialForm = { current: '', next: '', confirm: '' };

export default function PortalAccessPasswordManagement() {
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [selected, setSelected] = useState<Portal>('owner');
  const [form, setForm] = useState(initialForm);
  const [mode, setMode] = useState<'configure' | 'change' | 'reset'>('configure');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedStatus = useMemo(() => statuses.find((item) => item.portal === selected), [statuses, selected]);

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.rpc('portal_access_password_status');
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }
    setStatuses((data ?? []) as StatusRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selectedStatus?.configured && mode !== 'configure') setMode('configure');
  }, [selectedStatus?.configured, mode]);

  const submit = async () => {
    setMessage('');
    setError('');
    if (form.next.length < 12) {
      setError('Use at least 12 characters for the new portal password.');
      return;
    }
    if (form.next !== form.confirm) {
      setError('The new password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'change') {
        const { data, error: rpcError } = await supabase.rpc('change_portal_access_password', {
          p_portal: selected,
          p_current_password: form.current,
          p_new_password: form.next,
        });
        if (rpcError) throw rpcError;
        if (!data) throw new Error('The current portal password was rejected.');
      } else {
        const { data, error: rpcError } = await supabase.rpc('reset_portal_access_password', {
          p_portal: selected,
          p_new_password: form.next,
        });
        if (rpcError) throw rpcError;
        if (!data) throw new Error('You are not authorized to manage this portal password.');
      }
      setForm(initialForm);
      setMessage(`${portals.find((portal) => portal.id === selected)?.label} password ${mode === 'change' ? 'changed' : selectedStatus?.configured ? 'reset' : 'configured'} successfully.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the portal password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-accent-500/20 bg-accent-500/10 p-2.5"><ShieldCheck className="h-5 w-5 text-accent-400" /></div>
          <div>
            <h2 className="text-xl font-medium text-white">Portal Password Management</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">Configure, change, or reset the second-factor portal access passwords. Existing passwords are never displayed or retrievable.</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-200">
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
        </button>
      </div>

      {message && <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" />{message}</div>}
      {error && <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {portals.map((portal) => {
          const status = statuses.find((item) => item.portal === portal.id);
          const active = selected === portal.id;
          return (
            <button key={portal.id} onClick={() => { setSelected(portal.id); setForm(initialForm); setMessage(''); setError(''); }} className={`rounded-xl border p-4 text-left transition ${active ? 'border-accent-500/40 bg-accent-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
              <div className="flex items-center justify-between gap-2"><KeyRound className="h-4 w-4 text-accent-400" />{status?.configured ? <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">Configured</span> : <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">Not configured</span>}</div>
              <div className="mt-3 text-sm font-medium text-white">{portal.label}</div>
              <div className="mt-1 text-xs text-gray-500">{status?.updated_at ? `Updated ${new Date(status.updated_at).toLocaleDateString()}` : 'No password set'}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 text-sm font-medium text-white">{portals.find((portal) => portal.id === selected)?.label}</div>
          {!selectedStatus?.configured ? (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300">Configure</span>
          ) : (
            <>
              <button onClick={() => { setMode('change'); setForm(initialForm); setError(''); setMessage(''); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === 'change' ? 'bg-accent-500/15 text-accent-300' : 'text-gray-400 hover:text-white'}`}>Change</button>
              <button onClick={() => { setMode('reset'); setForm(initialForm); setError(''); setMessage(''); }} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${mode === 'reset' ? 'bg-accent-500/15 text-accent-300' : 'text-gray-400 hover:text-white'}`}><RotateCcw className="h-3 w-3" /> Reset</button>
            </>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {mode === 'change' && <label className="md:col-span-2"><span className="mb-2 block text-sm text-gray-300">Current password</span><input type="password" autoComplete="current-password" value={form.current} onChange={(event) => setForm({ ...form, current: event.target.value })} className="w-full rounded-xl border border-ink-800 bg-ink-950 px-4 py-3 text-white outline-none focus:border-accent-500" /></label>}
          <label><span className="mb-2 block text-sm text-gray-300">New password</span><input type="password" autoComplete="new-password" value={form.next} onChange={(event) => setForm({ ...form, next: event.target.value })} className="w-full rounded-xl border border-ink-800 bg-ink-950 px-4 py-3 text-white outline-none focus:border-accent-500" /></label>
          <label><span className="mb-2 block text-sm text-gray-300">Confirm new password</span><input type="password" autoComplete="new-password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} className="w-full rounded-xl border border-ink-800 bg-ink-950 px-4 py-3 text-white outline-none focus:border-accent-500" /></label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-gray-500">Minimum 12 characters. The password is hashed server-side and existing unlock sessions are invalidated after an update.</p>
          <button onClick={() => void submit()} disabled={saving || loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {mode === 'change' ? 'Change Password' : mode === 'reset' ? 'Reset Password' : 'Configure Password'}
          </button>
        </div>
      </div>
    </section>
  );
}
