import { useState } from 'react';
import { CheckCircle2, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const TERMS_VERSION = '1.0';

export default function ConnectorTerms() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!accepted) {
      setError('Please confirm that you have read and agree to the Connector Terms & Conditions.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: acceptError } = await supabase.rpc('accept_connector_terms', {
        p_terms_version: TERMS_VERSION,
      });

      if (acceptError) throw acceptError;

      navigate('/portal/connector', { replace: true });
    } catch (err) {
      console.error('Connector terms acceptance error:', err);
      setError('We could not record your acceptance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10">
          <FileText className="h-6 w-6 text-accent-400" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">Connector onboarding</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Avelixa Connector Terms & Conditions</h1>
        </div>
      </div>

      <div className="glass rounded-3xl border border-ink-800/60 p-6 md:p-8">
        <div className="mb-6 rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" />
            <p className="text-sm leading-6 text-gray-300">
              Your Connector account has been approved. Before you can access the Connector Portal,
              you must read and accept these terms. Your acceptance is recorded with your account.
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-7 text-gray-300">
          <section>
            <h2 className="text-base font-semibold text-white">1. Connector role</h2>
            <p className="mt-2">You agree to represent Avelixa professionally when identifying and referring businesses that may need Avelixa services.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white">2. Accurate information</h2>
            <p className="mt-2">Information submitted through the Connector Portal must be accurate, lawful, and relevant to the business opportunity being referred.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white">3. Professional conduct</h2>
            <p className="mt-2">You must communicate honestly and professionally and must not misrepresent Avelixa, its services, prices, staff, or policies.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white">4. Confidentiality</h2>
            <p className="mt-2">Business, client, project, financial, and portal information made available to you must be treated as confidential and used only for legitimate Avelixa work.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white">5. Leads and referrals</h2>
            <p className="mt-2">Lead and referral information must be submitted through the designated Avelixa systems. Referral relationships and any applicable commissions are determined by Avelixa's approved rules and records.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white">6. Account security</h2>
            <p className="mt-2">You are responsible for protecting your Avelixa login credentials and must not share your account with another person.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white">7. Compliance</h2>
            <p className="mt-2">You agree to follow Avelixa policies, lawful instructions from authorized Avelixa administrators, and any updated Connector rules communicated through the platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white">8. Suspension or termination</h2>
            <p className="mt-2">Avelixa may suspend or terminate Connector access where an account violates these terms, platform rules, security requirements, or applicable law.</p>
          </section>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 accent-accent-500"
            />
            <span className="text-sm leading-6 text-gray-300">
              I have read and understood the Avelixa Connector Terms & Conditions and agree to follow them.
            </span>
          </label>

          {error && (
            <p className="mt-3 text-sm text-red-300">{error}</p>
          )}

          <button
            type="button"
            onClick={handleAccept}
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {loading ? 'Recording acceptance...' : 'Accept Terms & Continue to Connector Portal'}
          </button>
        </div>
      </div>
    </div>
  );
}
