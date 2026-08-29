import assert from 'node:assert/strict';
import { GOOD_PROSPECTS, LEAD_FIND_STEPS, LEAD_HUNTING_CATEGORIES, OUTREACH_SCRIPTS, buildAchievementStates, buildLeadStatusLabel, buildRecognitionLabels, calculateChallengeProgress, rankLeaderboard } from '../src/lib/connectorLeadGeneration.ts';

assert.equal(LEAD_HUNTING_CATEGORIES[0], 'Restaurants');
assert.equal(LEAD_HUNTING_CATEGORIES.length, 16);
assert.equal(GOOD_PROSPECTS.length, 7);
assert.equal(LEAD_FIND_STEPS.length, 4);
assert.equal(OUTREACH_SCRIPTS.length, 4);
assert.equal(buildLeadStatusLabel('pending'), 'Submitted');
assert.equal(buildLeadStatusLabel('won'), 'Won');
assert.equal(buildLeadStatusLabel('contacted'), 'Contacted');

const activity = {
  leads_submitted: 6,
  qualified_leads: 2,
  projects_generated: 1,
  successful_referrals: 0,
  commission_earned: 25000,
};

const achievements = buildAchievementStates(activity);
assert.equal(achievements.find((item) => item.key === 'five_leads')?.unlocked, true);
assert.equal(achievements.find((item) => item.key === 'ten_leads')?.progress, 6);
assert.equal(achievements.find((item) => item.key === 'first_project')?.unlocked, true);
assert.equal(achievements.find((item) => item.key === 'first_qualified')?.unlocked, true);

assert.deepEqual(calculateChallengeProgress(3, 5), {
  target: 5,
  progress: 3,
  remaining: 2,
  percentage: 60,
});
assert.equal(calculateChallengeProgress(9, 5).percentage, 100);

assert.deepEqual(buildRecognitionLabels(activity, 1, 2), ['Top Connector', 'Project Generator']);
assert.deepEqual(buildRecognitionLabels({ ...activity, projects_generated: 0, qualified_leads: 0, leads_submitted: 0 }, 7, 0), ['New Connector']);

const ranked = rankLeaderboard([
  { rank: 0, connector_id: 'b', connector_name: 'Beta', leads_submitted: 5, qualified_leads: 2, projects_generated: 0, successful_referrals: 1, is_current: false },
  { rank: 0, connector_id: 'a', connector_name: 'Alpha', leads_submitted: 3, qualified_leads: 1, projects_generated: 1, successful_referrals: 0, is_current: false },
  { rank: 0, connector_id: 'c', connector_name: 'Gamma', leads_submitted: 8, qualified_leads: 4, projects_generated: 0, successful_referrals: 0, is_current: false },
]);
assert.deepEqual(ranked.map((entry) => entry.connector_id), ['a', 'c', 'b']);
