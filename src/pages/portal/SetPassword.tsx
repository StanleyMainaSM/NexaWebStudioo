import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const verifySession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessionError) throw sessionError;
        if (!data.session) setError('This invitation link is invalid or has expired. Please request a new invitation.');
      } catch (sessionError) {
        console.error('Connector activation session check failed:', sessionError);
        if (mounted) setError('This invitation link could not be verified. Please request a new invitation.');
      } finally {
        if (mounted) setChecking(false);
      }
    };
    void verifySession();
    return () => { mounted = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Your password must be at least 8 characters long.');
    if (password !== confirm) return setError('The passwords do not match.');
    setSaving(true);
    try {
      const { data: { session: beforeSession }, error: beforeSessionError } = await supabase.auth.getSession();
      if (beforeSessionError) throw beforeSessionError;
      if (!beforeSession?.user) throw new Error('Your activation session has expired. Please open the invitation link again.');

      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      if (!updatedUser.user) throw new Error('Avelixa could not confirm the activated account. Please try the invitation again.');

      const { data: roleData, error: roleError } = await supabase.rpc('get_my_roles');
      if (roleError) throw roleError;
      const roles = Array.isArray(roleData) ? roleData.map((item: any) => typeof item === 'string' ? item.trim().toLowerCase() : String(item?.role || '').trim().toLowerCase()).filter(Boolean) : [];
      if (!roles.includes('connector')) throw new Error('Your account was activated, but the Connector role is not available yet. Please contact Avelixa support.');

      const { data: connectorProfile, error: connectorProfileError } = await supabase.from('connector_profiles').select('id,is_active').eq('user_id', updatedUser.user.id).maybeSingle();
      if (connectorProfileError) throw connectorProfileError;
      if (!connectorProfile?.is_active) throw new Error('Your Connector profile is not active yet. Please contact Avelixa support.');

      navigate('/portal/connector/terms', { replace: true });
    } catch (activationError) {
      console.error('Connector password activation error:', activationError);
      setError(activationError instanceof Error ? activationError.message : 'Unable to finish password setup. Please open the invitation link again and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-ink-950"><Loader2 className="h-7 w-7 animate-spin text-accent-400" /></div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-900 p-7 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/10"><Lock className="h-7 w-7 text-accent-400" /></div>
        <h1 className="mt-5 text-center text-2xl font-semibold text-white">Create your Avelixa password</h1>
        <p className="mt-2 text-center text-sm text-gray-400">Set your password securely, then complete the Connector Terms & Conditions before entering the portal.</p>
        {error && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {!error && <form onSubmit={submit} className="mt-6 space-y-4"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" minLength={8} autoComplete="new-password" required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none" /><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirm password" minLength={8} autoComplete="new-password" required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none" /><button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Finish setup</button></form>}
        {error && <button type="button" onClick={() => navigate('/login')} className="mt-5 w-full rounded-xl border border-white/10 py-3 text-sm text-gray-300">Back to login</button>}
      </div>
    </div>
  );
}
