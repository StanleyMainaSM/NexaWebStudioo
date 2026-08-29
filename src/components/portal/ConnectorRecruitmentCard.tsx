import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clipboard, ExternalLink, MessageCircle, Share2, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

type RecruitmentApplication = {
  id: string;
  full_name: string | null;
  status: 'applied' | 'approved' | 'active' | 'successful';
  created_at: string | null;
};

type RecruitmentSummary = {
  invited_count: number;
  applied_count: number;
  approved_count: number;
  active_count: number;
  successful_referral_count: number;
  applications: RecruitmentApplication[];
};

const APPLICATION_URL = 'https://www.avelixa.co.ke/connector-apply';

export default function ConnectorRecruitmentCard() {
  const { user } = useAuth();
  const [avlId, setAvlId] = useState<string | null>(null);
  const [summary, setSummary] = useState<RecruitmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const referralLink = useMemo(
    () => (avlId ? `${APPLICATION_URL}?ref=${encodeURIComponent(avlId)}` : ''),
    [avlId]
  );

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setError('');

    try {
      const [profileResult, summaryResult] = await Promise.all([
        supabase.from('connector_profiles').select('avl_id').eq('user_id', user.id).maybeSingle(),
        supabase.rpc('get_connector_recruitment_summary'),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (summaryResult.error) throw summaryResult.error;

      setAvlId(profileResult.data?.avl_id || null);
      setSummary((summaryResult.data || null) as RecruitmentSummary | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load your Connector recruitment data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  async function copyLink() {
    if (!referralLink) return;
    setError('');
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Your browser did not allow clipboard access. Copy the link from the field instead.');
    }
  }

  function inviteWhatsApp() {
    if (!referralLink) return;
    const message = `Hey! Avelixa is currently looking for Connectors. You can earn commission by connecting businesses that need professional websites with Avelixa. Apply here: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function shareLink() {
    if (!referralLink || !navigator.share) return;
    setSharing(true);
    try {
      await navigator.share({
        title: 'Become an Avelixa Connector',
        text: 'Join the Avelixa Connector program and apply using my referral link.',
        url: referralLink,
      });
    } catch {
      // User cancellation is intentionally silent.
    } finally {
      setSharing(false);
    }
  }

  if (!user?.id) return null;

  const applications = summary?.applications || [];
  const stats = [
    ['Invited', summary?.invited_count ?? 0],
    ['Applications', (summary?.applied_count ?? 0) + (summary?.approved_count ?? 0)],
    ['Approved', summary?.approved_count ?? 0],
    ['Active', summary?.active_count ?? 0],
    ['Successful', summary?.successful_referral_count ?? 0],
  ];

  return (
    <section className="rounded-2xl border border-accent-500/20 bg-accent-500/[0.045] p-6 sm:p-7">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Recruit a Connector</h2>
              <p className="text-sm text-gray-400 mt-1">Invite people into the existing Avelixa Connector program using your AVL identity.</p>
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-accent-300 font-bold">
          <CheckCircle2 className="w-4 h-4" /> 20% project commission program
        </span>
      </div>

      {error && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Your AVL referral ID</p>
            <p className="mt-1 font-mono text-lg text-accent-300">{loading ? 'Loading…' : avlId || 'Not assigned'}</p>
          </div>
          <span className="text-xs text-gray-500">This is the existing authoritative Connector ID.</span>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            readOnly
            value={loading ? 'Loading referral link…' : referralLink}
            aria-label="Personal Connector referral link"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-gray-300 outline-none"
          />
          <div className="grid grid-cols-2 sm:flex gap-2">
            <button type="button" onClick={() => void copyLink()} disabled={!referralLink} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50">
              <Clipboard className="w-4 h-4" /> {copied ? 'Link copied!' : 'Copy Link'}
            </button>
            <button type="button" onClick={inviteWhatsApp} disabled={!referralLink} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button type="button" onClick={() => void shareLink()} disabled={!referralLink || sharing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.08] disabled:opacity-50 col-span-2 sm:col-span-1">
                <Share2 className="w-4 h-4" /> {sharing ? 'Sharing…' : 'Share'}
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Find → Invite → Apply → Onboard → Successful referral</span>
          <a href={referralLink || APPLICATION_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-300 hover:text-accent-200">
            Open application <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-light text-white">{loading ? '—' : String(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Recruitment progress</h3>
            <p className="text-xs text-gray-500 mt-1">Only your own referral-attributed applicants are shown.</p>
          </div>
          <button type="button" onClick={() => void load()} className="text-xs font-semibold text-accent-300 hover:text-accent-200">Refresh</button>
        </div>
        {applications.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-gray-400">No Connector applications have been attributed to your AVL ID yet.</div>
        ) : (
          <div className="space-y-2">
            {applications.map((application) => (
              <div key={application.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{application.full_name || 'Applicant'}</p>
                  <p className="text-xs text-gray-500 mt-1">Applied {application.created_at ? new Date(application.created_at).toLocaleDateString('en-KE') : '—'}</p>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                  application.status === 'successful' ? 'bg-emerald-500/10 text-emerald-300' :
                  application.status === 'active' ? 'bg-accent-500/10 text-accent-300' :
                  application.status === 'approved' ? 'bg-blue-500/10 text-blue-300' :
                  'bg-amber-500/10 text-amber-300'
                }`}>
                  {application.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
