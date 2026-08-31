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
  '20260830220001_harden_payment_commission_handoff.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

assert.match(sql, /CREATE OR REPLACE FUNCTION public\.create_connector_commission_for_payment\(\)/);
assert.match(sql, /INSERT INTO public\.commissions/);
assert.match(sql, /ON CONFLICT DO NOTHING/);
assert.match(sql, /WHERE\s+payment_id\s*=\s*NEW\.id/);
assert.match(sql, /DROP INDEX IF EXISTS public\.commissions_payment_id_unique_idx;/);

assert.match(sql, /CREATE OR REPLACE FUNCTION public\.verify_invoice_payment\(/);
assert.match(sql, /v_invoice\.status\s+NOT IN\s*\(\s*'unpaid'\s*,\s*'overdue'\s*\)/);
assert.match(sql, /SELECT\s+coalesce\(sum\(p\.amount\)\s*,\s*0\)/);
assert.match(sql, /v_remaining_balance\s*:=\s*greatest/);
assert.match(sql, /v_payment\.amount\s*<=\s*0\s+OR\s+v_payment\.amount\s*>\s*v_remaining_balance/);
assert.doesNotMatch(sql, /Another completed payment already exists for this invoice/);
assert.doesNotMatch(sql, /v_payment\.amount\s*<>\s*v_invoice\.amount/);
assert.match(sql, /Only pending payments can be verified/);

// Partial payments must not settle an invoice until the completed-payment total reaches its amount.
assert.match(sql, /CREATE OR REPLACE FUNCTION public\.sync_maintenance_subscription_after_payment\(\)/);
assert.match(sql, /v_invoice_fully_paid\s*:=\s*v_paid_amount\s*>=\s*coalesce\(v_invoice\.amount\s*,\s*0\s*\)/);
assert.match(sql, /IF v_invoice_fully_paid THEN/);
assert.match(sql, /IF v_invoice\.recurring_service_id\s+IS NULL OR NOT v_invoice_fully_paid THEN/);

// The migration must not grant clients direct write access to payments.
assert.doesNotMatch(sql, /CREATE POLICY .*payments.*FOR INSERT.*client/i);

console.log('payment finance handoff tests: PASS');
