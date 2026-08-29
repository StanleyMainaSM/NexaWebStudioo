import assert from 'node:assert/strict';
import { calculateConnectorEarnings, formatConnectorMoney } from '../src/lib/connectorEarnings.ts';

const result = calculateConnectorEarnings([
  { amount: 4000, status: 'paid', paid_at: '2026-08-29T09:23:21Z' },
  { amount: 2500, status: 'pending', paid_at: null },
  { amount: 1000, status: 'cancelled', paid_at: null },
]);

assert.deepEqual(result, { totalEarned: 6500, paid: 4000, pending: 2500 });
assert.deepEqual(calculateConnectorEarnings([{ amount: null, status: 'paid', paid_at: null }]), {
  totalEarned: 0,
  paid: 0,
  pending: 0,
});
assert.equal(formatConnectorMoney(4000), 'KSh 4,000');

console.log('connector earnings tests: PASS');
