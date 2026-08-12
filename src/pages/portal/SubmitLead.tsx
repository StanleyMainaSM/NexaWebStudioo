import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function SubmitLead() {
  const { user } = useAuth();
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
    estimatedBudget: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Create Business
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert([{
          name: formData.businessName,
          industry: formData.industry,
          contact_name: formData.contactName,
          email: formData.email,
          phone: formData.phone
        }])
        .select()
        .single();
      
      if (businessError) throw businessError;

      // 2. Create Lead
      const { error: leadError } = await supabase
        .from('leads')
        .insert([{
          business_id: business.id,
          connector_id: user.id,
          title: `Lead from ${formData.businessName}`,
          requirements: formData.requirements,
          estimated_budget: formData.estimatedBudget ? Number(formData.estimatedBudget) : null,
          status: 'pending'
        }]);
      
      if (leadError) throw leadError;

      setSuccess(true);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      setError(error.message || 'An error occurred while submitting the lead.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center p-12 glass rounded-3xl border border-ink-800/50">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-4">Lead Submitted</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          You have successfully submitted a new business lead. The admin team will review and follow up.
        </p>
        <button onClick={() => navigate('/portal')} className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors font-medium">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link to="/portal" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-bold text-white mb-2">Submit New Lead</h2>
        <p className="text-gray-400 text-sm">Register a business you've connected with to start the sales process.</p>
      </div>

      <div className="glass rounded-3xl p-8 border border-ink-800/50 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Business Name</label>
              <input type="text" required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Industry</label>
              <input type="text" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Contact Name</label>
              <input type="text" required value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Contact Email</label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Contact Phone</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Estimated Budget (KSh)</label>
              <input type="number" value={formData.estimatedBudget} onChange={e => setFormData({...formData, estimatedBudget: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-500 focus:outline-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-ink-500 uppercase tracking-widest mb-2">Requirements / Notes</label>
            <textarea rows={4} required value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-500 focus:outline-none resize-none" placeholder="What does the business need?"></textarea>
          </div>

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors uppercase tracking-widest text-sm font-bold disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Lead'}
          </button>
        </form>
      </div>
    </div>
  );
}
