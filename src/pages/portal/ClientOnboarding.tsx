import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading, roles, rolesLoading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [referred, setReferred] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [requirements, setRequirements] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (authLoading || rolesLoading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const isClient = roles.some((role) => role.toLowerCase() === 'client');
    if (!isClient) {
      navigate('/portal', { replace: true });
      return;
    }

    let mounted = true;

    async function loadState() {
      setChecking(true);
      setError('');

      try {
        const [profileResult, leadResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('client_referrer_connector_id, full_name')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('leads')
            .select('id')
            .eq('client_id', user.id)
            .limit(1),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (leadResult.error) throw leadResult.error;
        if (!mounted) return;

        const hasReferral = Boolean(profileResult.data?.client_referrer_connector_id);
        const hasLead = (leadResult.data || []).length > 0;

        setReferred(hasReferral);
        setAlreadySubmitted(hasLead);
        setBusinessName('');
        setContactName(profileResult.data?.full_name || '');

        if (hasLead) {
          navigate('/portal', { replace: true });
        }
      } catch (loadError) {
        console.error('Client onboarding state error:', loadError);
        if (mounted) setError('We could not load your onboarding state. Please try again.');
      } finally {
        if (mounted) setChecking(false);
      }
    }

    void loadState();

    return () => {
      mounted = false;
    };
  }, [authLoading, rolesLoading, user?.id, roles, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!businessName.trim() || !requirements.trim()) {
      setError('Business name and project requirements are required.');
      return;
    }

    const parsedBudget = budget.trim() ? Number(budget) : null;
    if (parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
      setError('Please enter a valid budget amount.');
      return;
    }

    setLoading(true);

    try {
      const { error: onboardingError } = await supabase.rpc('complete_client_referral_onboarding', {
        p_business_name: businessName.trim(),
        p_industry: industry.trim() || null,
        p_contact_name: contactName.trim() || null,
        p_phone: phone.trim() || null,
        p_requirements: requirements.trim(),
        p_estimated_budget: parsedBudget,
        p_timeline: timeline.trim() || null,
      });

      if (onboardingError) throw onboardingError;
      setSuccess(true);
      setAlreadySubmitted(true);
    } catch (onboardingError) {
      console.error('Client onboarding submission error:', onboardingError);
      setError(
        onboardingError instanceof Error
          ? onboardingError.message
          : 'Unable to submit your project request. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || rolesLoading || checking) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-400 animate-spin" />
      </div>
    );
  }

  if (alreadySubmitted && !success) return null;

  if (!referred) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6">
        <div className="glass w-full max-w-lg rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Client onboarding is not required</h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            This account was not created through a Connector client invitation. You can continue using your normal Avelixa Client portal.
          </p>
          <button type="button" onClick={() => navigate('/portal', { replace: true })} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white">
            Continue to Client Portal <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px]" />
      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px]" />

      <div className="w-full max-w-3xl relative z-10">
        <div className="glass rounded-3xl border border-ink-800/50 p-7 md:p-10">
          {success ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold text-white">Your request is with Avelixa</h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
                Your business information has been submitted through your Connector referral. Avelixa can now review your request and continue the existing lead-to-project process.
              </p>
              <button type="button" onClick={() => navigate('/portal', { replace: true })} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-400">
                Enter Client Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Welcome to Avelixa
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">Tell us about your business</h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  A few details help Avelixa understand what you need. Once submitted, your request becomes a lead for the Connector who invited you.
                </p>
              </div>

              {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-7">
                <section>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Business</h2>
                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <div>
                      <label htmlFor="onboarding-business" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Business name</label>
                      <input id="onboarding-business" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="Your business name" />
                    </div>
                    <div>
                      <label htmlFor="onboarding-industry" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Industry / category</label>
                      <input id="onboarding-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="e.g. Fashion, Construction" />
                    </div>
                    <div>
                      <label htmlFor="onboarding-contact" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Contact name</label>
                      <input id="onboarding-contact" value={contactName} onChange={(event) => setContactName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="Primary contact" />
                    </div>
                    <div>
                      <label htmlFor="onboarding-phone" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Phone</label>
                      <input id="onboarding-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="+254..." />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">What do you need?</h2>
                  <div className="mt-4 space-y-5">
                    <div>
                      <label htmlFor="onboarding-requirements" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Project / website requirements</label>
                      <textarea id="onboarding-requirements" value={requirements} onChange={(event) => setRequirements(event.target.value)} required rows={6} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-accent-400/60" placeholder="Tell us what you want Avelixa to build or improve, the problem you are trying to solve, and the result you want." />
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label htmlFor="onboarding-budget" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Estimated budget (KSh)</label>
                        <input id="onboarding-budget" type="number" min="0" step="100" value={budget} onChange={(event) => setBudget(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="Optional" />
                      </div>
                      <div>
                        <label htmlFor="onboarding-timeline" className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Preferred timeline</label>
                        <input id="onboarding-timeline" value={timeline} onChange={(event) => setTimeline(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-accent-400/60" placeholder="e.g. Within 30 days" />
                      </div>
                    </div>
                  </div>
                </section>

                <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-black hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <>Submit My Request <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
