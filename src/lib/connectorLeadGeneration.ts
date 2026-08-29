export const LEAD_HUNTING_CATEGORIES = [
  'Restaurants',
  'Salons & Barbershops',
  'Clothing & Fashion',
  'Hotels & Guest Houses',
  'Real Estate',
  'Clinics',
  'Law Firms',
  'Schools & Training Centres',
  'Gyms',
  'Car Dealerships',
  'Auto Repair',
  'Tour & Travel',
  'Construction',
  'Professional Services',
  'Local Shops',
  'Growing SMEs',
] as const;

export const GOOD_PROSPECTS = [
  'No website or an outdated website',
  'Heavy reliance on WhatsApp or social media',
  'Growing business or multiple locations',
  'Weak online visibility or calls-to-action',
  'Products or services that need clearer presentation',
  'Active advertising with a weak digital destination',
  'Strong physical presence but limited online presence',
] as const;

export const LEAD_FIND_STEPS = [
  ['Search', 'Google Maps, Instagram, Facebook, TikTok, local directories, business listings, physical businesses and your own network.'],
  ['Identify the opportunity', 'Look for missing, outdated or weak digital presence, poor mobile presentation, weak calls-to-action or a need for enquiries/bookings.'],
  ['Contact the business', 'Start a professional conversation. Ask about the business and its goals before pitching a solution.'],
  ['Submit the lead', 'Capture accurate contact details, explain the opportunity and submit the business through Avelixa.'],
] as const;

export const OUTREACH_SCRIPTS = [
  ['WhatsApp', 'Hi! I came across your business and noticed there may be an opportunity to strengthen how customers find and learn about your services online. I work with Avelixa, which helps businesses build professional websites and digital solutions. Would you be open to a quick conversation about what you currently use online?'],
  ['Phone', 'Hi, my name is [Name]. I work with Avelixa and I am reaching out because I noticed your business may have an opportunity to improve its online presence. Is now a good time for a quick question about how customers currently find you online?'],
  ['In person', 'Hi, I am [Name]. I work with Avelixa, a web and digital solutions company. I was looking at your business and thought there may be a few ways to make it easier for customers to discover your services online. Could I briefly explain?'],
  ['Follow-up', 'Hi [Name], just following up on my earlier message. I would be happy to share a few practical ideas for improving your business presence online. If it is useful, we can have a short conversation at a time that works for you.'],
] as const;

export function buildLeadStatusLabel(status: string | null | undefined): string {
  const key = (status || 'pending').trim().toLowerCase();
  return ({
    pending: 'Submitted',
    submitted: 'Submitted',
    contacted: 'Contacted',
    qualified: 'Qualified',
    proposal: 'Proposal',
    won: 'Won',
    lost: 'Lost',
  } as Record<string, string>)[key] ?? key.replace(/_/g, ' ');
}

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
    return { key, title, category, target, progress: Math.min(value, target), unlocked: value >= target };
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

export function buildRecognitionLabels(activity: ConnectorActivityMetrics, rank: number | null, recentActivity: number): string[] {
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
    b.projects_generated - a.projects_generated ||
    b.qualified_leads - a.qualified_leads ||
    b.leads_submitted - a.leads_submitted ||
    b.successful_referrals - a.successful_referrals ||
    a.connector_name.localeCompare(b.connector_name)
  );
}
