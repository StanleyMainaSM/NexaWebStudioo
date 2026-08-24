import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Building2,
} from 'lucide-react';

export default function SubmitLead() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    contactName: '',
    email: '',
    phone: '',
    requirements: '',
  });

  const handleChange = (
    field: keyof typeof formData,
    value: string
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to submit a lead.');
      return;
    }

    if (!roles.includes('connector')) {
      setError(
        'Your account does not currently have connector access.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: submitError } = await supabase.rpc(
        'submit_connector_lead',
        {
          p_business_name: formData.businessName.trim(),
          p_industry: formData.industry.trim() || null,
          p_contact_name: formData.contactName.trim(),
          p_email: formData.email.trim(),
          p_phone: formData.phone.trim() || null,
          p_requirements: formData.requirements.trim(),
        }
      );

      if (submitError) {
        throw submitError;
      }

      if (!data) {
        throw new Error(
          'The lead was not created. Please try again.'
        );
      }

      setSuccess(true);
    } catch (err: unknown) {
      console.error('Error submitting connector lead:', err);

      const message =
        err instanceof Error
          ? err.message
          : 'An error occurred while submitting the lead.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass rounded-3xl border border-ink-800/50 p-10 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">
            Lead Submitted Successfully
          </h2>

          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            The business has been registered and your lead has
            been submitted to the Avelixa admin team for review.
            The admin team will contact the business and determine
            the appropriate project pricing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/portal/connector/leads"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-medium transition-colors"
            >
              View My Leads
            </Link>

            <button
              onClick={() => navigate('/portal/connector')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
            >
              Connector Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          to="/portal/connector"
          className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Connector Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Submit New Lead
            </h1>

            <p className="text-gray-400 text-sm mt-1">
              Register a business you've connected with to start
              the Avelixa sales process.
            </p>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 md:p-8 border border-ink-800/50 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-white mb-1">
              Business Information
            </h2>

            <p className="text-xs text-gray-500">
              Enter the business details accurately so the admin
              team can follow up.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Business Name
              </label>

              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) =>
                  handleChange('businessName', e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-accent-500 focus:outline-none"
                placeholder="Example Business Ltd"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Industry
              </label>

              <input
                type="text"
                value={formData.industry}
                onChange={(e) =>
                  handleChange('industry', e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-accent-500 focus:outline-none"
                placeholder="Retail, restaurant, school..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Contact Name
              </label>

              <input
                type="text"
                required
                value={formData.contactName}
                onChange={(e) =>
                  handleChange('contactName', e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-accent-500 focus:outline-none"
                placeholder="Business contact person"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Contact Email
              </label>

              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  handleChange('email', e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-accent-500 focus:outline-none"
                placeholder="contact@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
                Contact Phone
              </label>

              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  handleChange('phone', e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-accent-500 focus:outline-none"
                placeholder="+254..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">
              Requirements / Notes
            </label>

            <textarea
              rows={6}
              required
              value={formData.requirements}
              onChange={(e) =>
                handleChange('requirements', e.target.value)
              }
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-accent-500 focus:outline-none resize-none"
              placeholder="What does the business need? Include important requirements, website type, features, timeline, or other useful information."
            />
          </div>

          <div className="p-4 rounded-xl bg-accent-500/5 border border-accent-500/10">
            <p className="text-sm text-gray-400 leading-relaxed">
              <span className="text-white font-medium">
                Pricing is handled by Avelixa.
              </span>{' '}
              You do not need to determine the project's final
              price. After submission, the admin team will review
              the lead, contact the business, and establish the
              appropriate project price.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Lead'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}