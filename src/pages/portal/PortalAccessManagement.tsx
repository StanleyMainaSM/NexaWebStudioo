import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type PortalName = 'client' | 'operator' | 'connector' | 'admin' | 'owner';
type PortalStatus = { portal: PortalName; configured: boolean };

const PORTALS: PortalName[] = ['client', 'operator', 'connector', 'admin', 'owner'];
const label = (portal: string) => portal.charAt(0).toUpperCase() + portal.slice(1);

export default function PortalAccessManagement() {
  const [statuses, setStatuses] = useState<PortalStatus[]>([]);
  const [selectedPortal, setSelectedPortal] = useState<PortalName>('client');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatuses = async () => {
    setLoading(true);
    setError('');
    const { data, error: statusError } = await supabase.rpc('get_portal_access_status');
    if (statusError) {
      setError(statusError.message || 'Unable to load portal password status.');
    } else {
      setStatuses((data || []) as PortalStatus[]);
    }
    setLoading(false);
  };

  useEffect(() => { void loadStatuses(); }, []);

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (password.length < 12) {
      setError('Portal access passwords must contain at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }

    setSaving(true);
    const { data, error: saveError } = await supabase.rpc('set_portal_access_password', {
      p_portal: selectedPortal,
      p_password: password,
    });
    if (saveError || data !== true) {
      setError(saveError?.message || 'Portal password could not be configured.');
    } else {
      setPassword('');
      setConfirmPassword('');
      setMessage(`${label(selectedPortal)} portal password ${statuses.find((item) => item.portal === selectedPortal)?.configured ? 'updated' : 'configured'} successfully.`);
      await loadStatuses();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-accent-400">Security Controls</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Portal Access Passwords</h1>
        <p className="mt-2 text-sm text-gray-400">Configure or change the shared access password for each Avelixa portal. Existing passwords are never displayed.</p>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border p-4 text-sm ${message ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
          {message || error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PORTALS.map((portal) => {
          const status = statuses.find((item) => item.portal === portal);
          const selected = selectedPortal === portal;
          return (
            <button key={portal} type="button" onClick={() => { setSelectedPortal(portal); setMessage(''); setError(''); }} className={`rounded-2xl border p-5 text-left transition ${selected ? 'border-accent-400/40 bg-accent-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
              <KeyRound className="w-5 h-5 text-accent-400" />
              <div className="mt-3 font-medium text-white">{label(portal)}</div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {status?.configured ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-emerald-300">Configured</span></> : <><ShieldCheck className="w-4 h-4 text-amber-400" /><span className="text-amber-300">Not configured</span></>}
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={savePassword} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
        <div>
          <h2 className="text-lg font-medium text-white">{statuses.find((item) => item.portal === selectedPortal)?.configured ? 'Change' : 'Configure'} {label(selectedPortal)} Portal Password</h2>
          <p className="mt-1 text-sm text-gray-500">The password is hashed server-side and is never returned to this page, browser storage, URLs, or API responses.</p>
        </div>
        {loading ? <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-accent-400" /></div> : <>
          <label className="block"><span className="block text-sm text-gray-300 mb-2">New password</span><input required type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="w-full rounded-xl bg-ink-950 border border-white/10 px-4 py-3 text-white outline-none focus:border-accent-500" /></label>
          <label className="block"><span className="block text-sm text-gray-300 mb-2">Confirm new password</span><input required type="password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="w-full rounded-xl bg-ink-950 border border-white/10 px-4 py-3 text-white outline-none focus:border-accent-500" /></label>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-white font-semibold disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? 'Saving...' : 'Save Portal Password'}</button>
        </>}
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-gray-400">
        <strong className="text-white">Authorization:</strong> only authenticated Avelixa users with the existing Owner or Admin role can configure these passwords. This page does not grant or change portal roles.
      </div>
    </div>
  );
}
