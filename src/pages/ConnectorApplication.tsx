import { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ConnectorApplication() {
  const [searchParams] = useSearchParams();
  const referralFromLink = searchParams.get('ref')?.trim() || '';
  const initialReferralRef = useRef(referralFromLink);
  const capturedReferral = initialReferralRef.current;

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    nationalId: '',
    county: '',
    town: '',
    referringConnector: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!capturedReferral) return;

    setFormData((previous) => ({
      ...previous,
      referringConnector: capturedReferral,
    }));
  }, [capturedReferral]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authoritativeReferral = capturedReferral || formData.referringConnector.trim() || null;

      const { data: applicationId, error: submissionError } =
        await supabase.rpc('submit_connector_application', {
          p_full_name: formData.fullName,
          p_phone: formData.phone,
          p_email: formData.email,
          p_national_id: formData.nationalId,
          p_county: formData.county,
          p_town: formData.town,
          p_referring_connector: authoritativeReferral,
        });

      if (submissionError) {
        const message = submissionError.message || '';
        if (message.toLowerCase().includes('active connector application')) {
          throw new Error('An active Connector application already exists for this email address.');
        }
        if (message.toLowerCase().includes('referring connector id')) {
          throw new Error('The referring Connector ID was not found or is inactive.');
        }
        throw new Error(message);
      }

      if (!applicationId) {
        throw new Error('The application was not created. Please try again.');
      }

      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred while submitting your application.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] animate-pulse-glow" />
        <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Application Submitted</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Thank you for applying to become an Avelixa Connector. Your application has been received and will be reviewed by the Avelixa team.
          </p>
          <Link to="/" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors font-medium">
            Return to Avelixa
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
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-accent-600 flex items-center justify-center rotate-3 shadow-lg shadow-accent-500/20">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-medium tracking-tight text-white">Avelixa</span>
          </div>

          {capturedReferral && (
            <div className="max-w-2xl mx-auto mb-8 rounded-2xl border border-accent-400/20 bg-accent-400/[0.06] px-5 py-4 flex items-start gap-3">
              <UserPlus className="w-5 h-5 text-accent-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">You've been invited to become an Avelixa Connector.</p>
                <p className="text-xs text-gray-400 mt-1">Your referring Connector has been captured from the invitation link. Avelixa validates the referral on submission.</p>
              </div>
            </div>
          )}

          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-400 mb-3">Avelixa Connector Program</div>
            <h1 className="text-3xl md:text-5xl font-light text-white mb-4 tracking-tight">Help businesses discover Avelixa</h1>
            <p className="text-gray-400 leading-relaxed mb-10">
              Become an Avelixa Connector and help businesses that need professional websites and digital solutions discover our services. Connect businesses with Avelixa and earn commissions for successful referrals.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            <div className="glass rounded-2xl p-5"><Users className="w-6 h-6 text-accent-400 mb-3" /><h2 className="font-semibold text-white mb-1">Find businesses</h2><p className="text-sm text-gray-400 leading-relaxed">Identify businesses that could benefit from a stronger online presence.</p></div>
            <div className="glass rounded-2xl p-5"><Briefcase className="w-6 h-6 text-accent-400 mb-3" /><h2 className="font-semibold text-white mb-1">Make the connection</h2><p className="text-sm text-gray-400 leading-relaxed">Refer qualified businesses that need websites or digital solutions to Avelixa.</p></div>
            <div className="glass rounded-2xl p-5"><Coins className="w-6 h-6 text-accent-400 mb-3" /><h2 className="font-semibold text-white mb-1">Earn commissions</h2><p className="text-sm text-gray-400 leading-relaxed">Eligible successful referrals can earn you a commission under the Avelixa Connector program.</p></div>
          </div>

          <div className="border-t border-white/5 pt-10">
            <h2 className="text-2xl font-semibold text-white text-center mb-2">Apply to become a Connector</h2>
            <p className="text-gray-500 text-sm text-center mb-8">Submit your details and the Avelixa team will review your application.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label><span className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Full Name</span><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all" placeholder="John Doe" required /></label>
                <label><span className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Email Address</span><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all" placeholder="you@example.com" required /></label>
                <label><span className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Phone Number</span><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all" placeholder="+254 XXX XXX XXX" required /></label>
                <label><span className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">National ID</span><input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all" placeholder="ID Number" required /></label>
                <label><span className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">County</span><input type="text" name="county" value={formData.county} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all" placeholder="e.g. Nairobi" required /></label>
                <label><span className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Town/City</span><input type="text" name="town" value={formData.town} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all" placeholder="e.g. Westlands" required /></label>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Referring Connector ID (Optional)</label>
                <input type="text" name="referringConnector" value={formData.referringConnector} onChange={handleChange} readOnly={Boolean(capturedReferral)} aria-readonly={capturedReferral ? 'true' : undefined} className={`w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all ${capturedReferral ? 'cursor-not-allowed opacity-90' : ''}`} placeholder="AVL-XXXX" autoCapitalize="characters" />
                <p className="text-gray-500 text-xs mt-2">If another Avelixa Connector referred you, enter their ID here. Referral IDs are validated by Avelixa when the application is submitted.</p>
                {capturedReferral && formData.referringConnector && (
                  <p className="text-accent-300 text-xs mt-2">Referral captured from your invitation link.</p>
                )}
              </div>
              <div className="pt-4 border-t border-white/5">
                <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply to Become a Connector'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="text-center mt-8"><Link to="/connectors" className="text-sm text-gray-500 hover:text-accent-400 transition-colors">← Back to Connector Program</Link></div>
      </div>
    </div>
  );
}
