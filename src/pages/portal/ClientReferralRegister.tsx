import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, Sparkles } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getClientReferralIdFromSearch } from '../../lib/clientReferral';

export default function ClientReferralRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralId = useMemo(
    () => getClientReferralIdFromSearch(`?${searchParams.toString()}`),
    [searchParams],
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!referralId) {
      setError('This client invitation link is missing a valid Connector referral ID.');
      return;
    }

    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            client_referral_avl_id: referralId,
          },
          emailRedirectTo: `${window.location.origin}/client-onboarding`,
        },
      });

      if (signupError) throw signupError;
      if (!data.user) throw new Error('Avelixa could not create your account. Please try again.');

      if (data.session) {
        navigate('/client-onboarding', { replace: true });
        return;
      }

      setSuccess(true);
    } catch (signupError) {
      console.error('Client referral registration error:', signupError);
      setError(
        signupError instanceof Error
          ? signupError.message
          : 'Unable to create your Avelixa account. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px]" />
      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px]" />

      <div className="w-full max-w-lg relative z-10">
        <div className="glass rounded-3xl p-8 md:p-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg overflow-hidden rotate-3 shadow-lg shadow-accent-500/20">
              <img src="/pwa-192x192.png" alt="Avelixa" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-medium tracking-tight text-white">Avelixa</span>
          </div>

          {!referralId ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
              <h1 className="text-2xl font-semibold text-white">Invitation link unavailable</h1>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Ask the Avelixa Connector who invited you to send their personal client invitation link again.
              </p>
              <Link to="/signup" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">
                Create a regular Client account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h1 className="mt-6 text-2xl font-semibold text-white">Check your email</h1>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Your Avelixa Client account has been created. Confirm your email using the message we sent you, then Avelixa will take you directly to your business and project onboarding.
              </p>
              <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-400">
                Go to sign in <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Client invitation
                </div>
                <h1 className="mt-5 text-3xl font-light tracking-tight text-white">Create your Avelixa account</h1>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  You were invited to Avelixa by a Connector. Create your account, then tell us about your business and what you need.
                </p>
              </div>

              <div className="mb-6 rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4">
                <p className="text-xs uppercase tracking-widest text-gray-500">Referral</p>
                <p className="mt-1 font-mono text-sm text-accent-300">{referralId}</p>
              </div>

              {error && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="client-full-name" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Full name</label>
                  <input id="client-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required autoComplete="name" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="Your name" />
                </div>
                <div>
                  <label htmlFor="client-email" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Email address</label>
                  <input id="client-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="you@company.com" />
                </div>
                <div>
                  <label htmlFor="client-password" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Password</label>
                  <input id="client-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="At least 8 characters" />
                </div>
                <div>
                  <label htmlFor="client-password-confirm" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Confirm password</label>
                  <input id="client-password-confirm" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="Repeat your password" />
                </div>

                <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-6 py-3 text-sm font-bold uppercase tracking-widest text-black hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : <>Create Client Account <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-600">
                <LockKeyhole className="w-3.5 h-3.5" />
                Secure authentication powered by Avelixa Supabase Auth
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          Already have an account? <Link to="/login" className="text-accent-400 hover:text-accent-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
