import assert from 'node:assert/strict';
import { validatePaymentAmount } from '../src/lib/paymentAmountValidation.ts';

const validFull = validatePaymentAmount('60000', 60000);
assert.deepEqual(validFull, { valid: true, amount: 60000 });

const validPartial = validatePaymentAmount('40000', 60000);
assert.deepEqual(validPartial, { valid: true, amount: 40000 });

const zero = validatePaymentAmount('0', 60000);
assert.equal(zero.valid, false);
assert.match(zero.message, /greater than zero/i);

const negative = validatePaymentAmount('-100', 60000);
assert.equal(negative.valid, false);
assert.match(negative.message, /greater than zero/i);

const overBalance = validatePaymentAmount('60001', 60000);
assert.equal(overBalance.valid, false);
assert.match(overBalance.message, /remaining balance/i);

const invalid = validatePaymentAmount('not-a-number', 60000);
assert.equal(invalid.valid, false);
assert.match(invalid.message, /valid payment amount/i);

const invalidBalance = validatePaymentAmount('100', 0);
assert.equal(invalidBalance.valid, false);
assert.match(invalidBalance.message, /remaining balance/i);

console.log('client payment amount tests: PASS');
