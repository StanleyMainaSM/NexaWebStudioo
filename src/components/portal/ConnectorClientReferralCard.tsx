import { useMemo, useState } from 'react';
import { Clipboard, MessageCircle, Share2, Users } from 'lucide-react';
import { buildClientReferralLink } from '../../lib/clientReferral';

interface ConnectorClientReferralCardProps {
  avlId: string | null;
}

export default function ConnectorClientReferralCard({ avlId }: ConnectorClientReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const referralLink = useMemo(() => buildClientReferralLink(avlId), [avlId]);
  const message = referralLink
    ? `Hi! I can connect you with Avelixa for your website or digital project. Create your Client account here: ${referralLink}`
    : '';

  async function copyLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Keep the read-only link visible if clipboard access is unavailable.
    }
  }

  function shareWhatsApp() {
    if (!message) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function share() {
    if (!referralLink || !navigator.share) return;
    setSharing(true);
    try {
      await navigator.share({
        title: 'Start your Avelixa Client account',
        text: 'Create your Avelixa Client account and tell us about your business or project.',
        url: referralLink,
      });
    } catch {
      // User cancellation is intentionally silent.
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10">
          <Users className="h-5 w-5 text-accent-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Refer a Client</h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Send a business owner your personal Avelixa client link. When they complete onboarding, their request is attributed to you automatically.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row">
        <input
          readOnly
          value={referralLink || 'Your client referral link is loading…'}
          aria-label="Personal Client referral link"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300 outline-none"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 xl:flex">
          <button type="button" onClick={() => void copyLink()} disabled={!referralLink} className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50">
            <Clipboard className="h-4 w-4" /> {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button type="button" onClick={shareWhatsApp} disabled={!referralLink} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button type="button" onClick={() => void share()} disabled={!referralLink || sharing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.08] disabled:opacity-50">
              <Share2 className="h-4 w-4" /> {sharing ? 'Sharing…' : 'Share'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
