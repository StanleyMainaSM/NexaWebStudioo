import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  ClipboardCheck,
  ShieldCheck,
  Users,
  Crown,
} from 'lucide-react';

type PortalRole =
  | 'client'
  | 'operator'
  | 'connector'
  | 'admin'
  | 'owner';

const portalRoles: {
  id: PortalRole;
  title: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'client',
    title: 'Client',
    description:
      'Manage your projects, invoices, documents and account.',
    icon: Briefcase,
  },
  {
    id: 'operator',
    title: 'Operator',
    description:
      'Manage assigned projects, tasks and operational work.',
    icon: ClipboardCheck,
  },
  {
    id: 'connector',
    title: 'Connector',
    description:
      'Submit businesses, track leads and manage your connector activity.',
    icon: Users,
  },
  {
    id: 'admin',
    title: 'Admin',
    description:
      'Manage Avelixa operations, users and business activity.',
    icon: ShieldCheck,
  },
  {
    id: 'owner',
    title: 'Owner',
    description:
      'Full Avelixa ownership, oversight and role-management access.',
    icon: Crown,
  },
];

const portalDestinations: Record<PortalRole, string> = {
  client: '/portal',
  operator: '/portal/operator',
  connector: '/portal/connector',
  admin: '/portal/admin',
  owner: '/portal/owner',
};

export default function Login() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] =
    useState<PortalRole | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    setResetLoading(true);
    setError('');
    setResetMessage('');

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

    if (resetError) {
      setError(resetError.message);
    } else {
      setResetMessage(
        'Password reset instructions have been sent to your email address.'
      );
    }

    setResetLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      setError(
        'Please select your portal before signing in.'
      );
      return;
    }

    setLoading(true);
    setError('');
    setResetMessage('');

    try {
      /*
       * Step 1:
       * Authenticate the user with Supabase.
       */
      const {
        data: authData,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        throw loginError;
      }

      if (!authData.user) {
        throw new Error(
          'Authentication succeeded, but no user account was returned.'
        );
      }

      /*
       * Step 2:
       * Retrieve the user's roles directly after authentication.
       *
       * This avoids depending on AuthProvider's asynchronous
       * role-loading cycle during the login decision.
       */
      const {
        data: roleData,
        error: roleError,
      } = await supabase.rpc('get_my_roles');

      if (roleError) {
        throw roleError;
      }

      const authenticatedRoles = Array.isArray(roleData)
        ? roleData
            .map((item: { role?: string }) =>
              item?.role?.trim().toLowerCase()
            )
            .filter(
              (role): role is string =>
                typeof role === 'string' &&
                role.length > 0
            )
        : [];

      const uniqueRoles = Array.from(
        new Set(authenticatedRoles)
      );

      console.log(
        'Authenticated portal roles:',
        uniqueRoles
      );

      /*
       * Step 3:
       * Confirm that the selected portal corresponds to
       * an actual role assigned to this authenticated user.
       */
      if (!uniqueRoles.includes(selectedRole)) {
        await supabase.auth.signOut();

        throw new Error(
          `This account does not have ${selectedRole} portal access. Please select the correct portal.`
        );
      }

      /*
       * Step 4:
       * Authentication and role authorization both succeeded.
       *
       * Navigate directly to the selected portal.
       */
      navigate(
        portalDestinations[selectedRole],
        {
          replace: true,
        }
      );
    } catch (loginError) {
      console.error(
        'Portal login error:',
        loginError
      );

      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to sign in. Please check your email and password.'
      );

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] animate-pulse-glow" />

      <div
        className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-glow"
        style={{ animationDelay: '2s' }}
      />

      <div className="w-full max-w-6xl relative z-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Avelixa website
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
              Avelixa Portal
            </div>

            <h1 className="text-3xl font-light tracking-tight text-white mb-3">
              Select your portal
            </h1>

            <p className="text-gray-400 text-sm">
              Choose the portal that matches your Avelixa account.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resetMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{resetMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {portalRoles.map((role) => {
              const Icon = role.icon;
              const selected =
                selectedRole === role.id;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.id);
                    setError('');
                    setResetMessage('');
                  }}
                  className={`text-left rounded-2xl p-5 border transition-all duration-200 ${
                    selected
                      ? 'border-accent-400 bg-accent-500/10 shadow-lg shadow-accent-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                      selected
                        ? 'bg-accent-500 text-white'
                        : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-white font-semibold mb-1">
                    {role.title}
                  </h3>

                  <p className="text-gray-500 text-xs leading-relaxed">
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedRole && (
            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >
              <div className="border-t border-white/10 pt-8">
                <div className="text-center mb-6">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                    Selected portal
                  </p>

                  <p className="text-white font-medium">
                    {
                      portalRoles.find(
                        (role) =>
                          role.id === selectedRole
                      )?.title
                    }{' '}
                    Portal
                  </p>

                  {selectedRole === 'connector' && (
                    <p className="text-gray-500 text-xs mt-2">
                      Connector access is available only after your
                      application has been approved.
                    </p>
                  )}

                  {selectedRole === 'owner' && (
                    <p className="text-gray-500 text-xs mt-2">
                      Owner access provides full ownership and oversight
                      of the Avelixa platform.
                    </p>
                  )}
                </div>

                <div className="mb-5">
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
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Password</span>

                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                      className="text-accent-400 hover:text-accent-300 disabled:opacity-50"
                    >
                      {resetLoading
                        ? 'Sending...'
                        : 'Forgot password?'}
                    </button>
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Sign in to{' '}
                      {
                        portalRoles.find(
                          (role) =>
                            role.id === selectedRole
                        )?.title
                      }{' '}
                      portal
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              Don't have an Avelixa portal account?
            </p>

            <p className="text-xs text-gray-600 mt-2">
              Clients and operators receive access through Avelixa.
              Connectors must first apply and receive approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}