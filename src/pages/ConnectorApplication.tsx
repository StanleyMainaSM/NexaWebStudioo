import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  Briefcase,
  Coins,
  UserPlus,
  Eye,
  EyeOff,
  LockKeyhole,
  CheckCircle2,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ConnectorApplication() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralFromLink = searchParams.get('ref')?.trim() || '';
  const initialReferralRef = useRef(referralFromLink);
  const capturedReferral = initialReferralRef.current;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    county: '',
    city: '',
    password: '',
    confirmPassword: '',
    referralId: capturedReferral || '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [success, setSuccess] = useState(false);
  const [referralStatus, setReferralStatus] = useState<{
    checking: boolean;
    valid?: boolean;
    name?: string;
    error?: string;
  }>({ checking: false });

  // If referral comes from URL, validate it once on mount
  useEffect(() => {
    if (!capturedReferral) return;

    let mounted = true;
    async function verifyInitialReferral() {
      try {
        setReferralStatus({ checking: true });
        const { data, error: rpcError } = await supabase.rpc('validate_connector_referral', {
          p_referral: capturedReferral,
        });

        if (rpcError) throw rpcError;
        if (mounted) {
          const res = data as { valid?: boolean; avl_id?: string; connector_name?: string; error?: string };
          if (res?.valid) {
            setReferralStatus({
              checking: false,
              valid: true,
              name: res.connector_name || undefined,
            });
          } else {
            setReferralStatus({
              checking: false,
              valid: false,
              error: res?.error || 'Invalid or inactive referral ID.',
            });
          }
        }
      } catch (err) {
        if (mounted) {
          setReferralStatus({
            checking: false,
            valid: false,
            error: 'Could not verify the referring Connector ID.',
          });
        }
      }
    }

    void verifyInitialReferral();
    return () => {
      mounted = false;
    };
  }, [capturedReferral]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'email') {
      setEmailExists(false);
    }
  };

  const handleReferralBlur = async () => {
    const code = formData.referralId.trim();
    if (!code) {
      setReferralStatus({ checking: false });
      return;
    }

    try {
      setReferralStatus({ checking: true });
      const { data, error: rpcError } = await supabase.rpc('validate_connector_referral', {
        p_referral: code,
      });

      if (rpcError) throw rpcError;
      const res = data as { valid?: boolean; avl_id?: string; connector_name?: string; error?: string };
      if (res?.valid) {
        setReferralStatus({
          checking: false,
          valid: true,
          name: res.connector_name || undefined,
        });
      } else {
        setReferralStatus({
          checking: false,
          valid: false,
          error: res?.error || 'The referring Connector ID was not found or is inactive.',
        });
      }
    } catch {
      setReferralStatus({
        checking: false,
        valid: false,
        error: 'Unable to verify referral ID at this time.',
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setEmailExists(false);

    // Validation
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedName = formData.fullName.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedNationalId = formData.nationalId.trim();
    const trimmedCounty = formData.county.trim();
    const trimmedCity = formData.city.trim();
    const referralToUse = (capturedReferral || formData.referralId.trim()) || null;

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedNationalId || !trimmedCounty || !trimmedCity) {
      setError('Please fill in all required personal details.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Verify whether the email is already registered
      const { data: isRegistered, error: checkError } = await supabase.rpc('check_email_registered', {
        p_email: trimmedEmail,
      });

      if (!checkError && isRegistered === true) {
        setEmailExists(true);
        setError('This email address is already registered with an existing Avelixa account.');
        setLoading(false);
        return;
      }

      // Step 2: If referral is provided, validate it first
      if (referralToUse) {
        const { data: referralCheck, error: refRpcError } = await supabase.rpc('validate_connector_referral', {
          p_referral: referralToUse,
        });
        if (!refRpcError) {
          const res = referralCheck as { valid?: boolean; error?: string };
          if (res && res.valid === false) {
            setError(res.error || 'The referring Connector ID was not found or is inactive. Remove it or check the code.');
            setLoading(false);
            return;
          }
        }
      }

      // Step 3: Create the Connector account via Supabase Auth
      const { data, error: signupError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: formData.password,
        options: {
          data: {
            full_name: trimmedName,
            phone: trimmedPhone,
            national_id: trimmedNationalId,
            county: trimmedCounty,
            town: trimmedCity,
            registration_type: 'connector',
            referring_connector_avl_id: referralToUse,
          },
          emailRedirectTo: `${window.location.origin}/portal/connector/terms`,
        },
      });

      if (signupError) {
        const msg = signupError.message || '';
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already exists')) {
          setEmailExists(true);
          setError('This email address is already registered with an existing Avelixa account.');
          return;
        }
        throw signupError;
      }

      // Supabase obfuscated existing user check (identities empty when user already exists)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setEmailExists(true);
        setError('This email address is already registered with an existing Avelixa account.');
        return;
      }

      // If instant session is created (e.g., auto-confirm enabled in Supabase)
      if (data.session) {
        // Direct to Connector Terms and Conditions
        navigate('/portal/connector/terms', { replace: true });
        return;
      }

      // Email confirmation sent
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Connector registration error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete your Connector registration. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] animate-pulse-glow" />

        <div className="w-full max-w-xl glass rounded-3xl p-8 md:p-10 relative z-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>

          <div className="text-xs font-bold text-accent-400 uppercase tracking-widest mb-2">
            Account Created
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
            Welcome to the Connector Program
          </h1>
          <p className="text-gray-400 leading-relaxed max-w-md mx-auto mb-8 text-sm">
            Your Avelixa Connector account has been successfully created. No Owner approval is required. You can now log in using the email address and password you just created, then review and accept the Connector Terms.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left mb-8 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Account created — no approval required</p>
                <p className="text-xs text-gray-400 mt-0.5">Your account is active immediately after registration. Use the same email and password to log in.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Accept Connector Terms</p>
                <p className="text-xs text-gray-400 mt-0.5">Accept the Connector Terms and Conditions to immediately enter your Connector Portal.</p>
              </div>
            </div>
          </div>

          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold"
          >
            Log In to Connector Portal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 py-20 px-6 relative overflow-hidden">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="glass rounded-3xl p-8 md:p-12">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-accent-600 flex items-center justify-center rotate-3 shadow-lg shadow-accent-500/20">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-medium tracking-tight text-white">Avelixa</span>
          </div>

          {/* Captured Referral Banner */}
          {capturedReferral && (
            <div className="max-w-2xl mx-auto mb-8 rounded-2xl border border-accent-400/20 bg-accent-400/[0.06] px-5 py-4 flex items-start gap-3">
              <UserPlus className="w-5 h-5 text-accent-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">
                  You've been invited to become an Avelixa Connector.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Referring Connector: <span className="text-white font-mono">{capturedReferral}</span>
                  {referralStatus.name && ` (${referralStatus.name})`}
                </p>
              </div>
            </div>
          )}

          {/* Hero text */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">
              Avelixa Connector Program
            </div>
            <h1 className="text-3xl md:text-5xl font-light text-white mb-4 tracking-tight">
              Help businesses discover Avelixa
            </h1>
            <p className="text-gray-400 leading-relaxed mb-10">
              Become an Avelixa Connector and help businesses connect with professional digital solutions. Register your account directly to get started.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            <div className="glass rounded-2xl p-5">
              <Users className="w-6 h-6 text-accent-400 mb-3" />
              <h2 className="font-semibold text-white mb-1">Find businesses</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Identify businesses that could benefit from a stronger online presence.
              </p>
            </div>
            <div className="glass rounded-2xl p-5">
              <Briefcase className="w-6 h-6 text-accent-400 mb-3" />
              <h2 className="font-semibold text-white mb-1">Make the connection</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Refer qualified businesses that need websites or digital solutions to Avelixa.
              </p>
            </div>
            <div className="glass rounded-2xl p-5">
              <Coins className="w-6 h-6 text-accent-400 mb-3" />
              <h2 className="font-semibold text-white mb-1">Earn commissions</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Eligible successful referrals earn you a 20% commission on website projects.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="border-t border-white/5 pt-10">
            <h2 className="text-2xl font-semibold text-white text-center mb-2">
              Become an Avelixa Connector
            </h2>
            <p className="text-gray-500 text-sm text-center mb-8">
              Create your Connector account and choose your password to get started immediately.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Existing email banner */}
              {emailExists && (
                <div className="p-5 rounded-2xl bg-accent-500/10 border border-accent-500/20 text-white text-sm space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">An account already exists with this email</p>
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                        If you already registered an Avelixa account, please log in with your credentials or reset your password.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      to="/login"
                      className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-accent-400 transition-colors"
                    >
                      Log In to Avelixa
                    </Link>
                    <Link
                      to="/reset-password"
                      className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                    >
                      Reset Password
                    </Link>
                  </div>
                </div>
              )}

              {/* General error message */}
              {error && !emailExists && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Full Name *
                  </span>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                    placeholder="Jane Doe"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Email Address *
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Phone Number *
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                    placeholder="+254 712 345 678"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    National ID *
                  </span>
                  <input
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                    placeholder="National ID Number"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    County *
                  </span>
                  <input
                    type="text"
                    name="county"
                    value={formData.county}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                    placeholder="e.g. Nairobi"
                    required
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    City / Town *
                  </span>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                    placeholder="e.g. Westlands"
                    required
                  />
                </label>
              </div>

              {/* Password Creation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <label className="block">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Password *
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-4 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Confirm Password *
                  </span>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full pl-4 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                      placeholder="Re-enter your password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </label>
              </div>

              {/* Optional Referral ID */}
              <div className="pt-4 border-t border-white/5">
                <label className="block">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Referral ID (Optional)
                    </span>
                    {referralStatus.checking && (
                      <span className="text-xs text-accent-400 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                      </span>
                    )}
                    {!referralStatus.checking && referralStatus.valid && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        {referralStatus.name && ` (${referralStatus.name})`}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    name="referralId"
                    value={formData.referralId}
                    onChange={handleChange}
                    onBlur={handleReferralBlur}
                    readOnly={Boolean(capturedReferral)}
                    aria-readonly={capturedReferral ? 'true' : undefined}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all font-mono ${
                      capturedReferral ? 'cursor-not-allowed opacity-90' : ''
                    }`}
                    placeholder="AVL-XXXX"
                    autoCapitalize="characters"
                  />
                  <p className="text-gray-500 text-xs mt-2">
                    If another Avelixa Connector referred you, enter their ID here. Leave empty if you do not have one.
                  </p>
                  {referralStatus.error && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {referralStatus.error}
                    </p>
                  )}
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-white/5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Become a Connector'
                  )}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>

              {/* Login redirection link */}
              <div className="text-center pt-2">
                <p className="text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-white hover:text-accent-400 font-medium transition-colors">
                    Log in here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link to="/connectors" className="text-sm text-gray-500 hover:text-accent-400 transition-colors">
            ← Back to Connector Program
          </Link>
        </div>
      </div>
    </div>
  );
}
