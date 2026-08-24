import { FormEvent, useEffect, useState } from 'react';
import { LockKeyhole, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type OwnerFinanceGateProps = {
  children: React.ReactNode;
};

const FINANCE_VERIFICATION_KEY =
  'avelixa_owner_finance_verified_user';

export default function OwnerFinanceGate({
  children,
}: OwnerFinanceGateProps) {
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function checkVerification() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!user?.id) {
        sessionStorage.removeItem(
          FINANCE_VERIFICATION_KEY
        );
        setAuthenticated(false);
        return;
      }

      const verifiedUserId = sessionStorage.getItem(
        FINANCE_VERIFICATION_KEY
      );

      /*
       * Verification is valid only for the currently signed-in
       * Supabase user.
       *
       * If the Owner signs out and another session is created,
       * the stored user ID will no longer match and Finance will
       * require verification again.
       */
      if (verifiedUserId === user.id) {
        setAuthenticated(true);
      } else {
        sessionStorage.removeItem(
          FINANCE_VERIFICATION_KEY
        );
        setAuthenticated(false);
      }
    }

    checkVerification();

    /*
     * Listen for Supabase authentication changes.
     *
     * This is important because signing out does not necessarily
     * unmount this component immediately.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) {
          return;
        }

        if (!session?.user?.id) {
          sessionStorage.removeItem(
            FINANCE_VERIFICATION_KEY
          );
          setAuthenticated(false);
          setPassword('');
          return;
        }

        const verifiedUserId =
          sessionStorage.getItem(
            FINANCE_VERIFICATION_KEY
          );

        if (verifiedUserId === session.user.id) {
          setAuthenticated(true);
        } else {
          sessionStorage.removeItem(
            FINANCE_VERIFICATION_KEY
          );
          setAuthenticated(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function verifyOwnerPassword(event: FormEvent) {
    event.preventDefault();

    if (!password.trim()) {
      setError('Please enter your Owner password.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email || !user.id) {
        throw new Error(
          'Your current session could not be verified. Please sign in again.'
        );
      }

      /*
       * Re-authenticate the currently signed-in Owner.
       */
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password,
        });

      if (signInError) {
        throw new Error(
          'The password is incorrect. Please enter your current Owner password.'
        );
      }

      /*
       * Store the authenticated user's ID, not a generic
       * "verified" flag.
       *
       * This prevents the verification from carrying over to
       * another login after sign-out.
       */
      sessionStorage.setItem(
        FINANCE_VERIFICATION_KEY,
        user.id
      );

      setPassword('');
      setAuthenticated(true);
    } catch (err) {
      console.error(
        'Finance owner verification failed:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Owner verification failed.'
      );
    } finally {
      setVerifying(false);
    }
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <LockKeyhole className="h-8 w-8 text-amber-400" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">
            Owner Verification Required
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Enter your Owner password to access the Finance Portal.
          </p>
        </div>

        <form
          onSubmit={verifyOwnerPassword}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="owner-finance-password"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Owner Password
            </label>

            <input
              id="owner-finance-password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={verifying}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-amber-400/50"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={verifying}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifying ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <LockKeyhole className="h-5 w-5" />
                Verify & Access Finance
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
