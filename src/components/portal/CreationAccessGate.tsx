import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, KeyRound, Loader2, LockKeyhole, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hasPortalAccess, isPortalPasswordConfigured, verifyPortalPassword } from '../../lib/portalAccess';

interface CreationAccessGateProps {
  children: ReactNode;
}

export default function CreationAccessGate({ children }: CreationAccessGateProps) {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      setChecking(true);
      const [passwordConfigured, access] = await Promise.all([
        isPortalPasswordConfigured('creation'),
        hasPortalAccess('creation'),
      ]);
      if (!mounted) return;
      setConfigured(passwordConfigured);
      setUnlocked(access);
      setChecking(false);
    };
    void check();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !password) return;
    setSubmitting(true);
    setError('');
    const allowed = await verifyPortalPassword('creation', password);
    if (allowed) {
      setPassword('');
      setUnlocked(true);
    } else {
      setError('The website/template creation access password is incorrect or you are not authorized to use this area.');
    }
    setSubmitting(false);
  };

  if (checking) {
    return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-7 h-7 text-accent-400 animate-spin" aria-label="Checking website creation access" /></div>;
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-10">
      <div className="w-full max-w-lg rounded-3xl border border-accent-500/20 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10">
          <LockKeyhole className="h-7 w-7 text-accent-400" />
        </div>
        <div className="mt-5 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-accent-400">Avelixa Website Studio</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Website & Template access</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            This is a separate creation access password. It is <strong className="font-semibold text-gray-200">not</strong> your normal Supabase login password.
          </p>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
            The website/template creation password has not been configured yet. An Owner or Admin can configure it from the Owner Dashboard under Portal Password Management → Website & Template Creation.
          </div>
        ) : (
          <>
            {error && <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-500">Creation access password</span>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-gray-600 outline-none focus:border-accent-400/60" autoComplete="current-password" placeholder="Enter creation access password" required />
                </div>
              </label>
              <button type="submit" disabled={submitting || !password} className="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? 'Verifying…' : 'Unlock Website Studio'}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 flex flex-col items-center gap-3 text-center text-xs text-gray-500 sm:flex-row sm:justify-center">
          <span className="inline-flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" />Separate from Supabase authentication</span>
          {!configured && <Link to="/portal/owner" className="text-accent-400 hover:text-accent-300">Owner Dashboard</Link>}
        </div>
      </div>
    </div>
  );
}
