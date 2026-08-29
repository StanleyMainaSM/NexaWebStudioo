import assert from 'node:assert/strict';
import {
  buildClientReferralLink,
  getClientReferralIdFromSearch,
  normalizeClientReferralId,
} from '../src/lib/clientReferral.ts';

assert.equal(normalizeClientReferralId(' avl-0002 '), 'AVL-0002');
assert.equal(getClientReferralIdFromSearch('?ref=avl-0002'), 'AVL-0002');
assert.equal(getClientReferralIdFromSearch('?ref='), '');
assert.equal(
  buildClientReferralLink('avl-0002', 'https://www.avelixa.co.ke'),
  'https://www.avelixa.co.ke/client-register?ref=AVL-0002',
);
assert.equal(buildClientReferralLink('', 'https://www.avelixa.co.ke'), '');

console.log('client referral tests: PASS');
