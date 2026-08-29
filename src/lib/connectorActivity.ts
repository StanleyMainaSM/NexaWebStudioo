export type ConnectorActivityMetrics = {
  leads_submitted: number;
  qualified_leads: number;
  projects_generated: number;
  successful_referrals: number;
  commission_earned: number;
};

export type AchievementState = {
  key: string;
  title: string;
  category: string;
  target: number;
  progress: number;
  unlocked: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  connector_id: string;
  connector_name: string;
  leads_submitted: number;
  qualified_leads: number;
  projects_generated: number;
  successful_referrals: number;
  commission_earned?: number | null;
  is_current: boolean;
};

export const ACHIEVEMENT_DEFINITIONS = [
  ['first_lead', 'First Lead', 'Lead Hunter', 'leads_submitted', 1],
  ['five_leads', '5 Leads', 'Lead Hunter', 'leads_submitted', 5],
  ['ten_leads', '10 Leads', 'Lead Hunter', 'leads_submitted', 10],
  ['twenty_five_leads', '25 Leads', 'Lead Hunter', 'leads_submitted', 25],
  ['first_qualified', 'First Qualified Lead', 'Growth', 'qualified_leads', 1],
  ['first_project', 'First Project', 'Project Generator', 'projects_generated', 1],
  ['three_projects', '3 Projects', 'Project Generator', 'projects_generated', 3],
  ['five_projects', '5 Projects', 'Project Generator', 'projects_generated', 5],
  ['ten_projects', '10 Projects', 'Project Generator', 'projects_generated', 10],
  ['first_referral', 'First Successful Referral', 'Connector Recruiter', 'successful_referrals', 1],
  ['three_referrals', '3 Successful Referrals', 'Connector Recruiter', 'successful_referrals', 3],
  ['five_referrals', '5 Successful Referrals', 'Connector Recruiter', 'successful_referrals', 5],
] as const;

export function buildAchievementStates(activity: ConnectorActivityMetrics): AchievementState[] {
  return ACHIEVEMENT_DEFINITIONS.map(([key, title, category, metric, target]) => {
    const value = activity[metric];
    return {
      key,
      title,
      category,
      target,
      progress: Math.min(value, target),
      unlocked: value >= target,
    };
  });
}

export function calculateChallengeProgress(progress: number, target = 5) {
  const safeTarget = Math.max(1, target);
  const safeProgress = Math.max(0, progress);
  return {
    target: safeTarget,
    progress: safeProgress,
    remaining: Math.max(safeTarget - safeProgress, 0),
    percentage: Math.min(100, Math.floor((safeProgress / safeTarget) * 100)),
  };
}

export function buildRecognitionLabels(
  activity: ConnectorActivityMetrics,
  rank: number | null,
  recentActivity: number,
): string[] {
  const labels: string[] = [];
  if (rank === 1) labels.push('Top Connector');
  if (activity.projects_generated >= 1) labels.push('Project Generator');
  if (activity.qualified_leads >= 5) labels.push('Lead Hunter');
  if (recentActivity >= 3 && activity.projects_generated === 0 && activity.qualified_leads < 5) labels.push('Rising Connector');
  if (recentActivity >= 1 && activity.projects_generated === 0 && activity.qualified_leads < 5) labels.push('Active Connector');
  if (activity.leads_submitted === 0 && activity.projects_generated === 0 && activity.successful_referrals === 0) labels.push('New Connector');
  return labels;
}

export function rankLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) =>
    a.projects_generated - b.projects_generated ||
    a.qualified_leads - b.qualified_leads ||
    a.leads_submitted - b.leads_submitted ||
    a.successful_referrals - b.successful_referrals ||
    a.connector_name.localeCompare(b.connector_name)
  ).reverse();
}
