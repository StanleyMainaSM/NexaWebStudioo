import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(
  here,
  '..',
  'supabase',
  'migrations',
  '20260830220000_harden_payment_commission_handoff.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

assert.match(sql, /CREATE OR REPLACE FUNCTION public\.create_connector_commission_for_payment\(\)/);
assert.match(sql, /INSERT INTO public\.commissions/);
assert.match(sql, /ON CONFLICT DO NOTHING/);
assert.match(sql, /WHERE payment_id = NEW\.id/);
assert.match(sql, /DROP INDEX IF EXISTS public\.commissions_payment_id_unique_idx;/);

assert.match(sql, /CREATE OR REPLACE FUNCTION public\.verify_invoice_payment\(/);
assert.match(sql, /v_invoice\.status NOT IN \('unpaid', 'overdue'\)/);
assert.match(sql, /Another completed payment already exists for this invoice/);
assert.match(sql, /v_payment\.amount <> v_invoice\.amount/);
assert.match(sql, /Only pending payments can be verified/);

// The migration must not grant clients direct write access to payments.
assert.doesNotMatch(sql, /CREATE POLICY .*payments.*FOR INSERT.*client/i);

console.log('payment finance handoff tests: PASS');
