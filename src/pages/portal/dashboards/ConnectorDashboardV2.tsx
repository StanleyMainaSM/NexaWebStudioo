import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import ConnectorRecruitmentCard from '../../../components/portal/ConnectorRecruitmentCard';
import { FolderKanban, Users, Link as LinkIcon, DollarSign, ArrowRight, Plus, CheckCircle2, Clock3, ReceiptText, UserPlus } from 'lucide-react';

type Commission = {
  id: string;
  project_id: string;
  amount: number;
  commission_percentage: number;
  status: string;
  payment_reference: string | null;
  paid_at: string | null;
};

type Payout = {
  id: string;
  project_id: string | null;
  commission_id: string | null;
  amount: number;
  status: string | null;
  confirmation_status: string | null;
  payment_method: string | null;
  reference_number: string | null;
  sent_at: string | null;
  confirmed_at: string | null;
};

type Referral = {
  id: string;
  referred_connector_id: string;
  created_at: string | null;
  status: string | null;
};

type ReferralProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function ConnectorDashboardV2() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ avl_id: string | null; commission_rate: number | null } | null>(null);
  const [leads, setLeads] = useState(0);
  const [projects, setProjects] = useState(0);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralProfiles, setReferralProfiles] = useState<Record<string, ReferralProfile>>({});
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setError('');

    try {
      const [profileResult, leadsResult, projectsResult, commissionsResult, payoutsResult, referralsResult] = await Promise.all([
        supabase.from('connector_profiles').select('avl_id,commission_rate').eq('user_id', user.id).maybeSingle(),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('connector_id', user.id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('connector_id', user.id).not('status', 'in', '(completed,cancelled)'),
        supabase.from('commissions').select('id,project_id,amount,commission_percentage,status,payment_reference,paid_at').eq('connector_id', user.id).order('created_at', { ascending: false }),
        supabase.from('payouts').select('id,project_id,commission_id,amount,status,confirmation_status,payment_method,reference_number,sent_at,confirmed_at').eq('recipient_id', user.id).eq('recipient_role', 'connector').order('created_at', { ascending: false }).limit(20),
        supabase.from('referral_bonuses').select('id,referred_connector_id,created_at,status').eq('referrer_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (leadsResult.error) throw leadsResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (commissionsResult.error) throw commissionsResult.error;
      if (payoutsResult.error) throw payoutsResult.error;
      if (referralsResult.error) throw referralsResult.error;

      const nextCommissions = (commissionsResult.data || []) as Commission[];
      const nextPayouts = (payoutsResult.data || []) as Payout[];
      const nextReferrals = (referralsResult.data || []) as Referral[];

      const projectIds = [
        ...new Set([
          ...nextCommissions.map((commission) => commission.project_id),
          ...nextPayouts.map((payout) => payout.project_id).filter(Boolean) as string[],
        ]),
      ];

      let names: Record<string, string> = {};
      if (projectIds.length) {
        const { data, error: projectError } = await supabase
          .from('projects')
          .select('id,title')
          .in('id', projectIds);
        if (projectError) throw projectError;
        names = Object.fromEntries((data || []).map((project: { id: string; title: string }) => [project.id, project.title]));
      }

      let nextReferralProfiles: Record<string, ReferralProfile> = {};
      const referredIds = [...new Set(nextReferrals.map((referral) => referral.referred_connector_id))];
      if (referredIds.length) {
        const { data, error: referralProfileError } = await supabase
          .from('profiles')
          .select('id,full_name,email')
          .in('id', referredIds);
        if (referralProfileError) throw referralProfileError;
        nextReferralProfiles = Object.fromEntries(
          (data || []).map((referralProfile: ReferralProfile) => [referralProfile.id, referralProfile])
        );
      }

      setProfile(profileResult.data);
      setLeads(leadsResult.count || 0);
      setProjects(projectsResult.count || 0);
      setCommissions(nextCommissions);
      setPayouts(nextPayouts);
      setReferrals(nextReferrals);
      setReferralProfiles(nextReferralProfiles);
      setProjectNames(names);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Connector data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  async function confirmPayout(id: string) {
    setConfirming(id);
    setError('');
    try {
      const { error: rpcError } = await supabase.rpc('connector_confirm_commission_received', { p_payout_id: id });
      if (rpcError) throw rpcError;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to confirm payment.');
    } finally {
      setConfirming(null);
    }
  }

  const paidCommissions = commissions
    .filter((commission) => ['paid', 'completed'].includes(String(commission.status).toLowerCase()))
    .reduce((sum, commission) => sum + Number(commission.amount || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent-500/10 flex items-center justify-center">
            <LinkIcon className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Connector Dashboard</h1>
            <p className="text-sm text-gray-400">Manage your leads, projects, commissions, payouts and referrals.</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      {profile && (
        <div className="rounded-xl bg-accent-500/10 border border-accent-500/20 p-4 flex flex-col sm:flex-row sm:justify-between gap-3">
          <span className="text-white">Connector ID <strong className="font-mono text-accent-400 ml-2">{profile.avl_id || 'Not assigned'}</strong></span>
          <span className="text-sm text-gray-400">Commission rate: <strong className="text-accent-400">{profile.commission_rate ?? 0}%</strong></span>
        </div>
      )}

      <ConnectorRecruitmentCard />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Stat icon={Users} label="My Leads" value={loading ? '—' : String(leads)} />
        <Stat icon={FolderKanban} label="Active Projects" value={loading ? '—' : String(projects)} />
        <Stat icon={DollarSign} label="Paid Commissions" value={loading ? '—' : `KSh ${paidCommissions.toLocaleString()}`} />
        <Stat icon={UserPlus} label="Successful Referrals" value={loading ? '—' : String(referrals.length)} />
      </div>

      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
        <div className="flex items-center gap-3 mb-5">
          <UserPlus className="w-5 h-5 text-accent-400" />
          <div>
            <h2 className="text-lg font-medium text-white">My Referrals</h2>
            <p className="text-sm text-gray-500">A referral is counted only after the referred Connector completes required onboarding.</p>
          </div>
        </div>

        {referrals.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm font-medium text-white">Successful Referrals</p>
            <p className="mt-1 text-sm text-gray-400">0 — no referred Connector has completed onboarding yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Successful Referrals: <strong className="text-white">{referrals.length}</strong></p>
            {referrals.map((referral) => {
              const referredProfile = referralProfiles[referral.referred_connector_id];
              return (
                <div key={referral.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{referredProfile?.full_name || 'Connector'}</p>
                    <p className="text-sm text-gray-400">{referredProfile?.email || 'Connector account'} · Successfully onboarded</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold uppercase text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Successful Referral
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
        <div className="flex items-center gap-3 mb-5">
          <ReceiptText className="w-5 h-5 text-accent-400" />
          <div>
            <h2 className="text-lg font-medium text-white">Commission Payments</h2>
            <p className="text-sm text-gray-500">Payments belonging to your authenticated Connector account.</p>
          </div>
        </div>

        {payouts.length === 0 ? (
          <p className="text-sm text-gray-400">No commission payouts yet.</p>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
              <div key={payout.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="font-medium text-white">{projectNames[payout.project_id || ''] || 'Project'}</p>
                  <p className="text-sm text-gray-400">KSh {Number(payout.amount).toLocaleString()} · {payout.payment_method || 'Avelixa internal transfer'}</p>
                  <p className="mt-1 text-xs text-gray-500">Avelixa payout reference: {payout.reference_number || '—'}</p>
                </div>
                <div className="flex flex-col items-start lg:items-end gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase ${payout.confirmation_status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {payout.confirmation_status === 'confirmed' ? <CheckCircle2 className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}
                    {payout.confirmation_status === 'confirmed' ? 'Received / Confirmed' : 'Awaiting Your Confirmation'}
                  </span>
                  {payout.confirmation_status === 'sent' && (
                    <button onClick={() => void confirmPayout(payout.id)} disabled={confirming === payout.id} className="rounded-xl bg-accent-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                      {confirming === payout.id ? 'Confirming…' : 'Confirm Payment Received'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/portal/leads/new" className="rounded-2xl bg-accent-600 p-6 text-white">
          <Plus className="w-5 h-5" />
          <h2 className="mt-4 font-medium">Submit New Lead</h2>
          <p className="mt-1 text-sm text-white/70">Register a business you've connected with.</p>
          <ArrowRight className="mt-4 w-5 h-5" />
        </Link>
        <Link to="/portal/connector/leads" className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white">
          <Users className="w-5 h-5 text-accent-400" />
          <h2 className="mt-4 font-medium">View My Leads</h2>
          <p className="mt-1 text-sm text-gray-400">Track businesses you've submitted.</p>
          <ArrowRight className="mt-4 w-5 h-5 text-gray-500" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-500">
        <Icon className="w-5 h-5 text-accent-500" />
        {label}
      </div>
      <div className="mt-4 text-4xl font-light text-white">{value}</div>
    </div>
  );
}
