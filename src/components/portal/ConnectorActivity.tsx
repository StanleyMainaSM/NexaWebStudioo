import { useEffect, useState } from 'react';
import { Award, BarChart3, CheckCircle2, Crown, Medal, Target, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { buildAchievementStates, type AchievementState, type ConnectorActivityMetrics, type LeaderboardEntry } from '../../lib/connectorActivity';

type ActivitySummary = {
  activity: ConnectorActivityMetrics;
  rank: number | null;
  recognition_labels: string[];
  monthly_challenge: {
    target: number;
    progress: number;
    remaining: number;
    percentage: number;
  };
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

export default function ConnectorActivity() {
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
  const achievements = summary?.achievements?.length
    ? summary.achievements
    : buildAchievementStates(activity);
  const challenge = summary?.monthly_challenge ?? { target: 5, progress: 0, remaining: 5, percentage: 0 };
  const unlocked = achievements.filter((item) => item.unlocked).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10">
              <BarChart3 className="h-5 w-5 text-accent-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-400">Performance</p>
              <h2 className="text-xl font-semibold text-white">Connector Activity</h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-gray-400">Track the real activity that moves your Connector business forward: qualified leads, projects, successful referrals and earned commission.</p>
        </div>
        {summary?.recognition_labels?.length ? (
          <div className="flex flex-wrap gap-2">
            {summary.recognition_labels.map((label) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-xs font-semibold text-accent-300">
                <Award className="h-3.5 w-3.5" /> {label}
              </span>
            ))}
          </div>
        ) : null}
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><Target className="h-4 w-4 text-accent-400" /><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Monthly challenge</p></div>
              <h3 className="mt-2 text-lg font-semibold text-white">Qualified Lead Challenge</h3>
              <p className="mt-1 text-sm text-gray-500">Submit {challenge.target} qualified business leads this month.</p>
            </div>
            <span className="text-2xl font-light text-accent-300">{loading ? '—' : `${challenge.percentage}%`}</span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${challenge.percentage}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-gray-400">{loading ? '—' : `${challenge.progress} / ${challenge.target} qualified leads`}</span>
            <span className="font-medium text-accent-300">{loading ? '—' : challenge.remaining > 0 ? `${challenge.remaining} remaining` : 'Challenge complete'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Personal progress</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Your Activity</h3>
            </div>
            {summary?.rank ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300"><Medal className="h-3.5 w-3.5 text-accent-400" /> Rank #{summary.rank}</span> : null}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10"><TrendingUp className="h-5 w-5 text-accent-400" /></div>
            <div>
              <p className="text-sm font-semibold text-white">{unlocked} achievements unlocked</p>
              <p className="mt-1 text-xs text-gray-500">Keep building legitimate activity. Your next project could be one lead away.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-accent-400" /><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Recognition</p></div>
            <h3 className="mt-2 text-lg font-semibold text-white">Achievements & Milestones</h3>
          </div>
          <span className="text-xs text-gray-500">{unlocked} / {achievements.length} unlocked</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.key} achievement={achievement} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-accent-400" /><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Recognition</p></div>
            <h3 className="mt-2 text-lg font-semibold text-white">Connector Leaderboard</h3>
            <p className="mt-1 text-sm text-gray-500">Rankings prioritize projects generated, then qualified leads, then leads submitted.</p>
          </div>
          {summary?.rank ? <span className="text-sm font-semibold text-accent-300">Your Rank: #{summary.rank}</span> : null}
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[680px] space-y-2">
            <div className="grid grid-cols-[56px_1.5fr_repeat(3,100px)] gap-3 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <span>#</span><span>Connector</span><span>Leads</span><span>Qualified</span><span>Projects</span>
            </div>
            {summary?.leaderboard?.length ? summary.leaderboard.map((entry) => (
              <div key={entry.connector_id} className={`grid grid-cols-[56px_1.5fr_repeat(3,100px)] items-center gap-3 rounded-xl border px-4 py-3 ${entry.is_current ? 'border-accent-500/25 bg-accent-500/[0.06]' : 'border-white/10 bg-white/[0.02]'}`}>
                <span className="font-mono text-sm text-accent-300">#{entry.rank}</span>
                <div className="flex min-w-0 items-center gap-2">
                  {entry.rank === 1 ? <Crown className="h-4 w-4 shrink-0 text-accent-400" /> : <Users className="h-4 w-4 shrink-0 text-gray-500" />}
                  <span className="truncate text-sm font-medium text-white">{entry.is_current ? 'You' : entry.connector_name}</span>
                </div>
                <span className="text-sm text-gray-300">{entry.leads_submitted}</span>
                <span className="text-sm text-gray-300">{entry.qualified_leads}</span>
                <span className="text-sm text-gray-300">{entry.projects_generated}</span>
              </div>
            )) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-gray-500">No leaderboard activity yet.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ActivityStat({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-light text-white">{loading ? '—' : value}</p>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementState }) {
  const percentage = Math.min(100, Math.floor((achievement.progress / achievement.target) * 100));
  return (
    <div className={`rounded-xl border p-4 ${achievement.unlocked ? 'border-accent-500/20 bg-accent-500/[0.045]' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{achievement.title}</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">{achievement.category}</p>
        </div>
        {achievement.unlocked ? <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-400" /> : <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Locked</span>}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-accent-500" style={{ width: `${percentage}%` }} /></div>
      <p className="mt-2 text-xs text-gray-500">{achievement.progress} / {achievement.target}</p>
    </div>
  );
}
