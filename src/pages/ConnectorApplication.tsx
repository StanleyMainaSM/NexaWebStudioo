import { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ConnectorApplication() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/connector-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          nationalId: formData.nationalId,
          county: formData.county,
          town: formData.town,
          referringConnector: formData.referringConnector,
        }),
      });

      const responseText = await response.text();

      let result: {
        success?: boolean;
        message?: string;
        error?: string;
      } = {};

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(
            `The server returned an invalid response (${response.status}).`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `Application submission failed (${response.status}).`
        );
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] animate-pulse-glow" />

        <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">
            Application Submitted
          </h2>

          <p className="text-gray-400 mb-8">
            Thank you for applying to become an Avelixa Connector. Our team
            will review your application and get back to you shortly.
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors font-medium"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 py-20 px-6 relative overflow-hidden">
      <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto glass rounded-3xl p-8 md:p-12 relative z-10">
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

        <h2 className="text-3xl font-light text-white mb-2 text-center tracking-tight">
          Become a Connector
        </h2>

        <p className="text-gray-400 text-center mb-10 max-w-lg mx-auto">
          Join our exclusive network and earn commissions by connecting
          businesses with premium enterprise solutions.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Full Name
              </label>

              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Email Address
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Phone Number
              </label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="+254 XXX XXX XXX"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                National ID
              </label>

              <input
                type="text"
                name="nationalId"
                value={formData.nationalId}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="ID Number"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                County
              </label>

              <input
                type="text"
                name="county"
                value={formData.county}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="e.g. Nairobi"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Town/City
              </label>

              <input
                type="text"
                name="town"
                value={formData.town}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
                placeholder="e.g. Westlands"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
              Referring Connector ID (Optional)
            </label>

            <input
              type="text"
              name="referringConnector"
              value={formData.referringConnector}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-accent-400/60 focus:bg-white/[0.07] transition-all"
              placeholder="AVL-XXXX"
            />

            <p className="text-gray-500 text-xs mt-2">
              If another Avelixa Connector referred you, enter their ID here.
            </p>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-zinc-100 text-black hover:bg-accent-400 transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Submit Application'
              )}

              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
