import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Users,
  Download,
  Smartphone,
  Bell,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';

import {
  getPortalPathForRole,
  getPrimaryPortalRole,
} from '../../lib/auth';

import {
  initializeAvelixaPushNotifications,
  requestPushNotificationPermission,
} from '../../lib/pushNotificationService';

interface BeforeInstallPromptEvent
  extends Event {
  readonly platforms: string[];

  readonly userChoice: Promise<{
    outcome:
      | 'accepted'
      | 'dismissed';
    platform: string;
  }>;

  prompt(): Promise<void>;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    resetMessage,
    setResetMessage,
  ] = useState('');

  const [
    resetLoading,
    setResetLoading,
  ] = useState(false);

  const [
    deferredPrompt,
    setDeferredPrompt,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null
    );

  const [
    isInstalled,
    setIsInstalled,
  ] = useState(false);

  const [
    isStandaloneApp,
    setIsStandaloneApp,
  ] = useState(false);

  const [
    notificationStatus,
    setNotificationStatus,
  ] = useState<
    'checking' |
    'available' |
    'enabled' |
    'blocked' |
    'error'
  >('checking');

  const [
    notificationMessage,
    setNotificationMessage,
  ] = useState('');

  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(false);

  useEffect(() => {
    const standaloneMediaQuery =
      window.matchMedia(
        '(display-mode: standalone)'
      );

    const checkStandaloneMode =
      () => {
        const standalone =
          standaloneMediaQuery.matches ||
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

        setIsStandaloneApp(
          standalone
        );

        if (standalone) {
          setIsInstalled(true);
        }
      };

    checkStandaloneMode();

    const handleStandaloneChange =
      () => {
        checkStandaloneMode();
      };

    if (
      typeof standaloneMediaQuery.addEventListener ===
      'function'
    ) {
      standaloneMediaQuery.addEventListener(
        'change',
        handleStandaloneChange
      );
    } else {
      standaloneMediaQuery.addListener(
        handleStandaloneChange
      );
    }

    const handleBeforeInstallPrompt =
      (event: Event) => {
        event.preventDefault();

        setDeferredPrompt(
          event as BeforeInstallPromptEvent
        );
      };

    const handleAppInstalled =
      () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setIsStandaloneApp(true);
      };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      );

      if (
        typeof standaloneMediaQuery.removeEventListener ===
        'function'
      ) {
        standaloneMediaQuery.removeEventListener(
          'change',
          handleStandaloneChange
        );
      } else {
        standaloneMediaQuery.removeListener(
          handleStandaloneChange
        );
      }
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window)
    ) {
      setNotificationStatus(
        'blocked'
      );

      setNotificationMessage(
        'This browser does not support push notifications.'
      );

      return;
    }

    if (
      Notification.permission ===
      'granted'
    ) {
      setNotificationStatus(
        'enabled'
      );

      setNotificationMessage(
        'Avelixa notifications are allowed on this device.'
      );
    } else if (
      Notification.permission ===
      'denied'
    ) {
      setNotificationStatus(
        'blocked'
      );

      setNotificationMessage(
        'Notifications are blocked for Avelixa in this browser. Allow notifications in the browser site settings to enable them.'
      );
    } else {
      setNotificationStatus(
        'available'
      );
    }
  }, []);

  const handleInstallApp =
    async () => {
      if (!deferredPrompt) {
        return;
      }

      deferredPrompt.prompt();

      await deferredPrompt.userChoice;

      setDeferredPrompt(null);
    };

  const handleEnableNotifications =
    async () => {
      if (notificationLoading) {
        return;
      }

      setNotificationLoading(true);
      setNotificationMessage('');
      setError('');

      try {
        const permission =
          await requestPushNotificationPermission();

        if (
          permission === 'denied'
        ) {
          setNotificationStatus(
            'blocked'
          );

          setNotificationMessage(
            'Notification permission was denied. Allow notifications for Avelixa in your browser settings and try again.'
          );

          return;
        }

        if (
          permission !== 'granted'
        ) {
          setNotificationStatus(
            'available'
          );

          setNotificationMessage(
            'Notification permission was not granted.'
          );

          return;
        }

        const result =
          await initializeAvelixaPushNotifications();

        if (
          result.subscribed
        ) {
          setNotificationStatus(
            'enabled'
          );

          setNotificationMessage(
            'Notifications are enabled. Avelixa can now send notifications to this device.'
          );

          return;
        }

        setNotificationStatus(
          'error'
        );

        setNotificationMessage(
          'Notification permission was granted, but Avelixa could not finish registering this device. Please try again.'
        );
      } catch (notificationError) {
        console.error(
          'Avelixa notification setup error:',
          notificationError
        );

        setNotificationStatus(
          'error'
        );

        setNotificationMessage(
          notificationError instanceof Error
            ? notificationError.message
            : 'Avelixa could not enable notifications on this device.'
        );
      } finally {
        setNotificationLoading(false);
      }
    };

  const handleResetPassword =
    async () => {
      if (!email.trim()) {
        setError(
          'Please enter your email address first.'
        );

        return;
      }

      setResetLoading(true);
      setError('');
      setResetMessage('');

      try {
        const {
          error: resetError,
        } =
          await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
              redirectTo: `${window.location.origin}/reset-password`,
            }
          );

        if (resetError) {
          throw resetError;
        }

        setResetMessage(
          'Password reset instructions have been sent to your email address.'
        );
      } catch (resetError) {
        console.error(
          'Password reset error:',
          resetError
        );

        setError(
          resetError instanceof Error
            ? resetError.message
            : 'Unable to send password reset instructions.'
        );
      } finally {
        setResetLoading(false);
      }
    };

  const handleLogin =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      setLoading(true);
      setError('');
      setResetMessage('');

      try {
        const {
          data: authData,
          error: loginError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email: email.trim(),
              password,
            }
          );

        if (loginError) {
          throw loginError;
        }

        if (!authData.user) {
          throw new Error(
            'Authentication succeeded, but no user account was returned.'
          );
        }

        const {
          data: roleData,
          error: roleError,
        } =
          await supabase.rpc(
            'get_my_roles'
          );

        if (roleError) {
          throw roleError;
        }

        const authenticatedRoles =
          Array.isArray(roleData)
            ? roleData
                .map(
                  (
                    item: {
                      role?: string;
                    }
                  ) =>
                    item?.role
                      ?.trim()
                      .toLowerCase()
                )
                .filter(
                  (
                    role
                  ): role is string =>
                    typeof role ===
                      'string' &&
                    role.length > 0
                )
            : [];

        const uniqueRoles =
          Array.from(
            new Set(
              authenticatedRoles
            )
          );

        console.log(
          'Authenticated portal roles:',
          uniqueRoles
        );

        const primaryRole =
          getPrimaryPortalRole(
            uniqueRoles
          );

        if (!primaryRole) {
          await supabase.auth.signOut();

          throw new Error(
            'Your Avelixa account does not currently have an active portal role. Please contact Avelixa support.'
          );
        }

        const destination =
          getPortalPathForRole(
            primaryRole
          );

        const requestedPath =
          (
            location.state as
              | {
                  from?: string;
                }
              | null
              | undefined
          )?.from;

        const safeRequestedPath =
          typeof requestedPath ===
            'string' &&
          requestedPath.startsWith(
            '/portal'
          )
            ? requestedPath
            : null;

        navigate(
          safeRequestedPath ??
            destination,
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
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] animate-pulse-glow" />

      <div
        className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-glow"
        style={{
          animationDelay: '2s',
        }}
      />

      <div className="w-full max-w-lg relative z-10">

        {!isStandaloneApp && (
          <button
            type="button"
            onClick={() =>
              navigate('/')
            }
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />

            Back to Avelixa website
          </button>
        )}

        <div className="glass rounded-3xl p-8 md:p-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center rotate-3 shadow-lg shadow-accent-500/20">
              <img
                src="/pwa-192x192.png"
                alt="Avelixa"
                className="w-full h-full object-contain"
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
              Welcome back
            </h1>

            <p className="text-gray-400 text-sm">
              Sign in to your Avelixa account.
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

              <span>
                {resetMessage}
              </span>
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="portal-email"
                className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2"
              >
                Email address
              </label>

              <input
                id="portal-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="portal-password"
                className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2 flex justify-between"
              >
                <span>Password</span>

                <button
                  type="button"
                  onClick={
                    handleResetPassword
                  }
                  disabled={
                    resetLoading
                  }
                  className="text-accent-400 hover:text-accent-300 disabled:opacity-50 normal-case tracking-normal font-medium"
                >
                  {resetLoading
                    ? 'Sending...'
                    : 'Forgot password?'}
                </button>
              </label>

              <input
                id="portal-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
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

                  Signing in...
                </>
              ) : (
                <>
                  Sign in

                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {notificationStatus ===
            'available' && (
            <div className="mt-6 rounded-2xl border border-accent-400/20 bg-accent-400/5 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-400/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-accent-400" />
                </div>

                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-white">
                    Stay updated
                  </h2>

                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Allow Avelixa to send you important portal notifications about your projects, messages, invoices and other account activity.
                  </p>

                  <button
                    type="button"
                    onClick={
                      handleEnableNotifications
                    }
                    disabled={
                      notificationLoading
                    }
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-400 text-black hover:bg-accent-300 transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-60 disabled:cursor-wait"
                  >
                    {notificationLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />

                        Enabling...
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />

                        Enable Notifications
                      </>
                    )}
                  </button>

                  {notificationMessage && (
                    <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                      {notificationMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {notificationStatus ===
            'enabled' && (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-emerald-400" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Notifications enabled
                  </h2>

                  <p className="text-xs text-gray-500 mt-1">
                    {notificationMessage ||
                      'Avelixa can now send notifications to this device.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {notificationStatus ===
            'blocked' && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-red-400" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Notifications blocked
                  </h2>

                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {notificationMessage ||
                      'Allow notifications for Avelixa in your browser settings.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {notificationStatus ===
            'error' && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>

                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-white">
                    Notification setup failed
                  </h2>

                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {notificationMessage}
                  </p>

                  <button
                    type="button"
                    onClick={
                      handleEnableNotifications
                    }
                    disabled={
                      notificationLoading
                    }
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-400 text-black hover:bg-accent-300 transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                  >
                    <Bell className="w-4 h-4" />

                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isInstalled &&
            deferredPrompt && (
            <div className="mt-6 rounded-2xl border border-accent-400/20 bg-accent-400/5 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-400/10 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-accent-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-white">
                    Install Avelixa App
                  </h2>

                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Install the Avelixa Portal on your device for quick access.
                  </p>

                  <button
                    type="button"
                    onClick={
                      handleInstallApp
                    }
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-400 text-black hover:bg-accent-300 transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    <Download className="w-4 h-4" />

                    Install Avelixa
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isInstalled &&
            !deferredPrompt && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-accent-400" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Avelixa App
                  </h2>

                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    If your browser supports installation, the install option will appear here.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-xs text-gray-500 mb-4">
              Don't have an Avelixa account?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-gray-200 hover:bg-white/[0.07] hover:border-accent-400/40 hover:text-white transition-all text-sm font-medium"
              >
                <UserPlus className="w-4 h-4 text-accent-400" />

                Create Client Account
              </Link>

              <Link
                to="/connector-apply"
                className="group inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-gray-200 hover:bg-white/[0.07] hover:border-accent-400/40 hover:text-white transition-all text-sm font-medium"
              >
                <Users className="w-4 h-4 text-accent-400" />

                Become a Connector
              </Link>
            </div>

            <p className="text-center text-xs text-gray-600 mt-4 leading-relaxed">
              Operator, Admin and Owner accounts
              are created and managed by Avelixa.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Secure Avelixa portal access
        </p>
      </div>
    </div>
  );
}