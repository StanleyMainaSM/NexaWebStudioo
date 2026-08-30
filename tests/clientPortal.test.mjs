import assert from 'node:assert/strict';
import { getClientLifecycleState, getClientProjectPresentation } from '../src/lib/clientPortal.ts';

assert.equal(getClientLifecycleState('pending', null).label, 'Request submitted');
assert.equal(getClientLifecycleState('contacted', null).label, 'Contacted');
assert.equal(getClientLifecycleState('qualified', null).label, 'Qualified');
assert.equal(getClientLifecycleState('proposal', null).label, 'Proposal');
assert.equal(getClientLifecycleState('won', null).label, 'Converted');
assert.equal(getClientLifecycleState('won', 'pending').label, 'Project setup');
assert.equal(getClientLifecycleState('won', 'in_progress').label, 'Project active');
assert.equal(getClientLifecycleState('won', 'review').label, 'Ready for review');
assert.equal(getClientLifecycleState('won', 'pending_review').label, 'Ready for review');
assert.equal(getClientLifecycleState('won', 'completed').label, 'Completed');
assert.equal(getClientLifecycleState('won', 'cancelled').label, 'Cancelled');
assert.equal(getClientLifecycleState('won', 'cancelled_by_client').label, 'Cancelled');
assert.equal(getClientLifecycleState('lost', null).label, 'Not proceeding');

const active = getClientLifecycleState('won', 'in_progress');
assert.equal(active.steps.find((step) => step.key === 'project')?.current, true);
assert.equal(active.steps.filter((step) => step.completed).length, 6);

assert.deepEqual(getClientProjectPresentation('pending'), {
  label: 'Project setup',
  nextAction: 'Review your project details',
});
assert.deepEqual(getClientProjectPresentation('in_progress'), {
  label: 'In progress',
  nextAction: 'Review project progress',
});
assert.deepEqual(getClientProjectPresentation('review'), {
  label: 'Ready for review',
  nextAction: 'Review the latest project update',
});
assert.deepEqual(getClientProjectPresentation('completed'), {
  label: 'Completed',
  nextAction: 'Review your completed project',
});

console.log('client portal lifecycle tests: PASS');
