import assert from 'node:assert/strict';
import { GOOD_PROSPECTS, LEAD_FIND_STEPS, LEAD_HUNTING_CATEGORIES, OUTREACH_SCRIPTS, buildLeadStatusLabel } from '../src/lib/connectorLeadGeneration.ts';

assert.equal(LEAD_HUNTING_CATEGORIES[0], 'Restaurants');
assert.equal(LEAD_HUNTING_CATEGORIES.length, 16);
assert.equal(GOOD_PROSPECTS.length, 7);
assert.equal(LEAD_FIND_STEPS.length, 4);
assert.equal(OUTREACH_SCRIPTS.length, 4);
assert.equal(buildLeadStatusLabel('pending'), 'Submitted');
assert.equal(buildLeadStatusLabel('won'), 'Won');
assert.equal(buildLeadStatusLabel('contacted'), 'Contacted');
