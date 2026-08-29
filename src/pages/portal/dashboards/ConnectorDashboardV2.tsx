import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import ConnectorRecruitmentCard from '../../../components/portal/ConnectorRecruitmentCard';
import ConnectorLeadGenerationToolkit from '../../../components/portal/ConnectorLeadGenerationToolkit';
import { buildAchievementStates, type AchievementState, type ConnectorActivityMetrics, type LeaderboardEntry } from '../../../lib/connectorLeadGeneration';
import { FolderKanban, Users, Link as LinkIcon, DollarSign, ArrowRight, Plus, CheckCircle2, Clock3, ReceiptText, UserPlus, Award, BarChart3, Crown, Medal, Target, TrendingUp } from 'lucide-react';

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

type ActivitySummary = {
  activity: ConnectorActivityMetrics;
  rank: number | null;
  recognition_labels: string[];
  monthly_challenge: { target: number; progress: number; remaining: number; percentage: number };
  achievements: AchievementState[];
  leaderboard: LeaderboardEntry[];
};

const EMPTY_ACTIVITY: ConnectorActivityMetrics = {
  leads_submitted: 0,
  qualified_leads: 0,
  projects_generated: 0,
  successful_referrals: 0,
  commission_earned: 0,
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
      <ConnectorLeadGenerationToolkit />
      <ConnectorActivity />

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

function ConnectorActivity() {
  const { user, roles } = useAuth();
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id || !roles.includes('connector')) {
      setLoading(false);
      return;
    }
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      const { data, error: rpcError } = await supabase.rpc('get_connector_activity_summary');
      if (!mounted) return;
      if (rpcError) {
        setError('Unable to load your Connector activity right now.');
        setSummary(null);
      } else {
        setSummary(data as ActivitySummary);
      }
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [user?.id, roles]);

  if (!user?.id || !roles.includes('connector')) return null;
  const activity = summary?.activity ?? EMPTY_ACTIVITY;
  const achievements = summary?.achievements?.length ? summary.achievements : buildAchievementStates(activity);
  const challenge = summary?.monthly_challenge ?? { target: 5, progress: 0, remaining: 5, percentage: 0 };
  const unlocked = achievements.filter((item) => item.unlocked).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10"><BarChart3 className="h-5 w-5 text-accent-400" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-400">Performance</p><h2 className="text-xl font-semibold text-white">Connector Activity</h2></div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-gray-400">Track the real activity that moves your Connector business forward: qualified leads, projects, successful referrals and earned commission.</p>
        </div>
        {summary?.recognition_labels?.length ? <div className="flex flex-wrap gap-2">{summary.recognition_labels.map((label) => <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-xs font-semibold text-accent-300"><Award className="h-3.5 w-3.5" />{label}</span>)}</div> : null}
      </div>
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ActivityStat label="Leads Submitted" value={activity.leads_submitted} loading={loading} />
        <ActivityStat label="Qualified Leads" value={activity.qualified_leads} loading={loading} />
        <ActivityStat label="Projects Generated" value={activity.projects_generated} loading={loading} />
        <ActivityStat label="Successful Referrals" value={activity.successful_referrals} loading={loading} />
        <ActivityStat label="Commission Earned" value={`KSh ${Number(activity.commission_earned || 0).toLocaleString()}`} loading={loading} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
          <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Target className="h-4 w-4 text-accent-400" /><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Monthly challenge</p></div><h3 className="mt-2 text-lg font-semibold text-white">Qualified Lead Challenge</h3><p className="mt-1 text-sm text-gray-500">Submit {challenge.target} qualified business leads this month.</p></div><span className="text-2xl font-light text-accent-300">{loading ? '—' : `${challenge.percentage}%`}</span></div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${challenge.percentage}%` }} /></div>
          <div className="mt-3 flex items-center justify-between text-xs"><span className="text-gray-400">{loading ? '—' : `${challenge.progress} / ${challenge.target} qualified leads`}</span><span className="font-medium text-accent-300">{loading ? '—' : challenge.remaining > 0 ? `${challenge.remaining} remaining` : 'Challenge complete'}</span></div>
        </div>
        <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Personal progress</p><h3 className="mt-2 text-lg font-semibold text-white">Your Activity</h3></div>{summary?.rank ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300"><Medal className="h-3.5 w-3.5 text-accent-400" />Rank #{summary.rank}</span> : null}</div>
          <div className="mt-5 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10"><TrendingUp className="h-5 w-5 text-accent-400" /></div><div><p className="text-sm font-semibold text-white">{unlocked} achievements unlocked</p><p className="mt-1 text-xs text-gray-500">Keep building legitimate activity. Your next project could be one lead away.</p></div></div>
        </div>
      </div>
      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
        <div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><Award className="h-4 w-4 text-accent-400" /><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Recognition</p></div><h3 className="mt-2 text-lg font-semibold text-white">Achievements & Milestones</h3></div><span className="text-xs text-gray-500">{unlocked} / {achievements.length} unlocked</span></div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{achievements.map((achievement) => <AchievementCard key={achievement.key} achievement={achievement} />)}</div>
      </div>
      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"><div><div className="flex items-center gap-2"><Crown className="h-4 w-4 text-accent-400" /><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Recognition</p></div><h3 className="mt-2 text-lg font-semibold text-white">Connector Leaderboard</h3><p className="mt-1 text-sm text-gray-500">Rankings prioritize projects generated, then qualified leads, then leads submitted.</p></div>{summary?.rank ? <span className="text-sm font-semibold text-accent-300">Your Rank: #{summary.rank}</span> : null}</div>
        <div className="mt-5 overflow-x-auto"><div className="min-w-[680px] space-y-2"><div className="grid grid-cols-[56px_1.5fr_repeat(3,100px)] gap-3 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-500"><span>#</span><span>Connector</span><span>Leads</span><span>Qualified</span><span>Projects</span></div>{summary?.leaderboard?.length ? summary.leaderboard.map((entry) => <div key={entry.connector_id} className={`grid grid-cols-[56px_1.5fr_repeat(3,100px)] items-center gap-3 rounded-xl border px-4 py-3 ${entry.is_current ? 'border-accent-500/25 bg-accent-500/[0.06]' : 'border-white/10 bg-white/[0.02]'}`}><span className="font-mono text-sm text-accent-300">#{entry.rank}</span><div className="flex min-w-0 items-center gap-2">{entry.rank === 1 ? <Crown className="h-4 w-4 shrink-0 text-accent-400" /> : <Users className="h-4 w-4 shrink-0 text-gray-500" />}<span className="truncate text-sm font-medium text-white">{entry.is_current ? 'You' : entry.connector_name}</span></div><span className="text-sm text-gray-300">{entry.leads_submitted}</span><span className="text-sm text-gray-300">{entry.qualified_leads}</span><span className="text-sm text-gray-300">{entry.projects_generated}</span></div>) : <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-gray-500">No leaderboard activity yet.</div>}</div></div>
      </div>
    </section>
  );
}

function ActivityStat({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p><p className="mt-2 text-2xl font-light text-white">{loading ? '—' : value}</p></div>;
}

function AchievementCard({ achievement }: { achievement: AchievementState }) {
  const percentage = Math.min(100, Math.floor((achievement.progress / achievement.target) * 100));
  return <div className={`rounded-xl border p-4 ${achievement.unlocked ? 'border-accent-500/20 bg-accent-500/[0.045]' : 'border-white/10 bg-white/[0.02]'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{achievement.title}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">{achievement.category}</p></div>{achievement.unlocked ? <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-400" /> : <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Locked</span>}</div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-accent-500" style={{ width: `${percentage}%` }} /></div><p className="mt-2 text-xs text-gray-500">{achievement.progress} / {achievement.target}</p></div>;
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
