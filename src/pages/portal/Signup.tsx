import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccess(false);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (password.length < 6) {
      setError(
        'Your password must contain at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
            },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

      if (signupError) {
        throw signupError;
      }

      if (!data.user) {
        throw new Error(
          'Your account could not be created. Please try again.'
        );
      }

      if (data.session) {
        navigate('/portal', {
          replace: true,
        });
        return;
      }

      setSuccess(true);
    } catch (signupError) {
      console.error(
        'Client signup error:',
        signupError
      );

      setError(
        signupError instanceof Error
          ? signupError.message
          : 'Unable to create your account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] animate-pulse-glow" />

        <div
          className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-glow"
          style={{ animationDelay: '2s' }}
        />

        <div className="w-full max-w-md relative z-10">
          <div className="glass rounded-3xl p-8 md:p-10">
            <div className="flex items-center justify-center gap-3 mb-8">
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

            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <div className="text-xs font-bold text-accent-400 uppercase tracking-widest mb-3">
                Account created
              </div>

              <h1 className="text-3xl font-light tracking-tight text-white mb-4">
                Check your email
              </h1>

              <p className="text-gray-400 text-sm leading-relaxed">
                Your Avelixa client account has been created.
                We have sent a confirmation link to{' '}
                <span className="text-white font-medium">
                  {email.trim()}
                </span>
                .
              </p>

              <p className="text-gray-500 text-xs leading-relaxed mt-4">
                Confirm your email address, then return to
                Avelixa and sign in. Your account will use the
                Client Portal automatically.
              </p>

              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold mt-8"
              >
                Go to login
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] animate-pulse-glow" />

      <div
        className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-glow"
        style={{ animationDelay: '2s' }}
      />

      <div className="w-full max-w-md relative z-10">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>

        <div className="glass rounded-3xl p-8 md:p-10">
          <div className="flex items-center justify-center gap-3 mb-8">
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

          <div className="text-center mb-8">
            <div className="text-xs font-bold text-accent-400 uppercase tracking-widest mb-3">
              Client Portal
            </div>

            <h1 className="text-3xl font-light tracking-tight text-white mb-3">
              Create your account
            </h1>

            <p className="text-gray-400 text-sm">
              Create your Avelixa client account to access
              your projects and services.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSignup}
            className="space-y-5"
          >
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Full name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="Your full name"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Email address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Confirm password
              </label>

              <div className="relative">
                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create client account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              Already have an Avelixa account?
            </p>

            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-accent-400 hover:text-accent-300 transition-colors mt-2"
            >
              Sign in
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              Looking to become an Avelixa Connector?
            </p>

            <Link
              to="/connector-apply"
              className="text-xs text-gray-500 hover:text-white transition-colors mt-1 inline-block"
            >
              Apply to become a Connector
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}