import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, KeyRound, Loader2, LockKeyhole } from 'lucide-react';
import { hasPortalAccess, verifyPortalPassword, type PortalAccessKey } from '../../lib/portalAccess';

const portalLabels: Record<PortalAccessKey, string> = {
  client: 'Client',
  operator: 'Operator',
  connector: 'Connector',
  admin: 'Admin',
  owner: 'Owner',
};

interface PortalAccessGateProps {
  portal: PortalAccessKey;
  children: ReactNode;
}

export default function PortalAccessGate({ portal, children }: PortalAccessGateProps) {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setChecking(true);
    setUnlocked(false);
    setPassword('');
    setError('');

    void hasPortalAccess(portal).then((allowed) => {
      if (!mounted) return;
      setUnlocked(allowed);
      setChecking(false);
    });

    return () => {
      mounted = false;
    };
  }, [portal]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !password) return;

    setSubmitting(true);
    setError('');

    const allowed = await verifyPortalPassword(portal, password);
    if (allowed) {
      setPassword('');
      setUnlocked(true);
    } else {
      setError('The portal access password is incorrect, unavailable, or not authorized for this account.');
    }

    setSubmitting(false);
  };

  if (checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-accent-400 animate-spin" aria-label="Checking portal access" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  const label = portalLabels[portal];

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 shadow-2xl">
        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
          <LockKeyhole className="w-7 h-7 text-accent-400" />
        </div>
        <div className="text-center mb-7">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-accent-400 mb-2">{label} Portal</div>
          <h1 className="text-2xl font-semibold text-white">Portal access required</h1>
          <p className="mt-2 text-sm text-gray-400">Enter the shared {label} portal access password to continue.</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Portal access password</span>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60"
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter portal access password"
                required
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Verifying…' : 'Unlock Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
