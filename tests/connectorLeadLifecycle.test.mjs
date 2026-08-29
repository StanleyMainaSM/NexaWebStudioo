import assert from 'node:assert/strict';
import { connectorLeadStageLabel, getConnectorLeadStage } from '../src/lib/connectorLeadLifecycle.ts';

const state = (leadStatus, projectStatus=null, commissionStatus=null, hasProject=false, hasCommission=false) => getConnectorLeadStage({ leadStatus, projectStatus, commissionStatus, hasProject, hasCommission });

assert.equal(state('pending'), 'submitted');
assert.equal(state('under_review'), 'under_review');
assert.equal(state('contacted'), 'contacted');
assert.equal(state('qualified'), 'qualified');
assert.equal(state('won'), 'converted');
assert.equal(state('won', 'in_progress', null, true), 'project_active');
assert.equal(state('won', 'completed', null, true), 'completed');
assert.equal(state('won', 'completed', 'paid', true, true), 'commission_earned');
assert.equal(state('rejected'), 'rejected');
assert.equal(connectorLeadStageLabel.commission_earned, 'Commission Earned');
console.log('connector lead lifecycle tests: PASS');
