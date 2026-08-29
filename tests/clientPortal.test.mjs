import assert from 'node:assert/strict';
import { getClientLifecycleState } from '../src/lib/clientPortal.ts';

assert.equal(getClientLifecycleState('pending', null).label, 'Request submitted');
assert.equal(getClientLifecycleState('contacted', null).label, 'Contacted');
assert.equal(getClientLifecycleState('qualified', null).label, 'Qualified');
assert.equal(getClientLifecycleState('proposal', null).label, 'Proposal');
assert.equal(getClientLifecycleState('won', null).label, 'Converted');
assert.equal(getClientLifecycleState('won', 'in_progress').label, 'Project active');
assert.equal(getClientLifecycleState('won', 'review').label, 'Ready for review');
assert.equal(getClientLifecycleState('won', 'completed').label, 'Completed');
assert.equal(getClientLifecycleState('lost', null).label, 'Not proceeding');

const active = getClientLifecycleState('won', 'in_progress');
assert.equal(active.steps.find((step) => step.key === 'project')?.current, true);
assert.equal(active.steps.filter((step) => step.completed).length, 6);

console.log('client portal lifecycle tests: PASS');
