import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const prepareAuthSession = async () => {
      setCheckingSession(true);
      setError('');

      try {
        /*
         * Supabase invitation/recovery links can arrive with
         * authentication information in the URL.
         *
         * Give Supabase's auth client time to process the URL
         * before checking the session.
         */
        const waitForSession = async () => {
          for (let attempt = 0; attempt < 40; attempt++) {
            if (!mounted) {
              return null;
            }

            const {
              data: { session },
              error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
              console.error(
                'Password setup session error:',
                sessionError
              );

              throw sessionError;
            }

            if (session) {
              return session;
            }

            await new Promise((resolve) =>
              setTimeout(resolve, 250)
            );
          }

          return null;
        };

        /*
         * Listen before waiting so that a SIGNED_IN or
         * PASSWORD_RECOVERY event cannot be missed.
         */
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) {
              return;
            }

            console.log(
              'Password setup auth event:',
              event
            );

            if (
              session &&
              (
                event === 'SIGNED_IN' ||
                event === 'PASSWORD_RECOVERY' ||
                event === 'INITIAL_SESSION'
              )
            ) {
              setSessionReady(true);
              setCheckingSession(false);
              setError('');
            }
          }
        );

        try {
          const session = await waitForSession();

          if (!mounted) {
            return;
          }

          if (session) {
            setSessionReady(true);
            setCheckingSession(false);
            setError('');
            return;
          }

          /*
           * One final auth check after the waiting period.
           */
          const {
            data: { session: finalSession },
          } = await supabase.auth.getSession();

          if (!mounted) {
            return;
          }

          if (finalSession) {
            setSessionReady(true);
            setCheckingSession(false);
            setError('');
            return;
          }

          setError(
            'Your invitation link is missing, expired, or could not establish a secure session. Please request a new invitation link.'
          );

          setCheckingSession(false);
        } finally {
          subscription.unsubscribe();
        }
      } catch (err) {
        console.error(
          'Password setup session preparation error:',
          err
        );

        if (!mounted) {
          return;
        }

        setSessionReady(false);
        setCheckingSession(false);

        setError(
          'Your invitation link could not be verified. Please request a new invitation link.'
        );
      }
    };

    void prepareAuthSession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdatePassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!sessionReady) {
      setError(
        'Your secure password setup session is not ready. Please open the invitation link again.'
      );
      return;
    }

    if (password.length < 8) {
      setError(
        'Your new password must be at least 8 characters long.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      /*
       * Confirm that the invitation session is still alive
       * immediately before changing the password.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error(
          'Your invitation session has expired. Please open the invitation link again.'
        );
      }

      /*
       * The invitation user is already authenticated through
       * the secure Supabase invitation session.
       *
       * updateUser() changes the password without requiring
       * the user to know an existing password.
       */
      const {
        data: updatedUser,
        error: updateError,
      } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      if (!updatedUser.user) {
        throw new Error(
          'Supabase did not return the updated account.'
        );
      }

      /*
       * Confirm that the password update resulted in a valid
       * authenticated session.
       */
      const {
        data: { session: updatedSession },
        error: verificationError,
      } = await supabase.auth.getSession();

      if (verificationError) {
        throw verificationError;
      }

      if (!updatedSession) {
        throw new Error(
          'The password was updated, but the secure session could not be confirmed.'
        );
      }

      setSuccess(
        'Your password has been created successfully. You can now sign in to your Avelixa account.'
      );

      /*
       * End the temporary invitation session.
       *
       * The user will intentionally authenticate again through
       * the normal login page using the password they just created.
       */
      await supabase.auth.signOut();

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            passwordCreated: true,
            email: updatedUser.user.email || '',
          },
        });
      }, 1500);
    } catch (err: unknown) {
      console.error(
        'Password update error:',
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : 'Your password could not be created. Please open the invitation link again and try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md glass rounded-3xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-400 mx-auto" />

          <h2 className="mt-5 text-xl font-bold text-white">
            Verifying your invitation
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Please wait while we securely verify your
            Avelixa account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] animate-pulse-glow" />

      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-glow" />

      <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-accent-600 flex items-center justify-center rotate-3 shadow-lg shadow-accent-500/20">
            <Sparkles
              className="w-5 h-5 text-white"
              strokeWidth={2.5}
            />
          </div>

          <span className="text-2xl font-medium tracking-tight text-white">
            Avelixa
          </span>
        </div>

        <h2 className="text-xl font-bold text-white mb-2 text-center">
          Create your password
        </h2>

        <p className="text-gray-400 text-sm mb-8 text-center">
          Create a secure password for your Avelixa
          account.
        </p>

        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {sessionReady && !success && (
          <form
            onSubmit={handleUpdatePassword}
            className="space-y-5"
          >
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                New password
              </label>

              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="Enter your new password"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Confirm new password
              </label>

              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="Confirm your new password"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Create password'
              )}

              {!loading && (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </form>
        )}

        {!sessionReady && !error && (
          <div className="text-center text-sm text-gray-400">
            Preparing your secure account setup...
          </div>
        )}

        {error && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-4 w-full inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
          >
            Return to login
          </button>
        )}
      </div>
    </div>
  );
}
