import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(here, '..', 'supabase', 'migrations', '20260830200000_portal_organization_security_hardening.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

const obsoleteTriggerDrops = sql.match(/DROP TRIGGER IF EXISTS trg_notify_invoice_workflow_change ON public\.invoices;/g) ?? [];
const canonicalTriggerDrops = sql.match(/DROP TRIGGER IF EXISTS trg_avelixa_invoice_workflow ON public\.invoices;/g) ?? [];
const canonicalTriggerCreates = sql.match(/CREATE TRIGGER trg_avelixa_invoice_workflow\b/g) ?? [];

assert.equal(obsoleteTriggerDrops.length, 1);
assert.equal(canonicalTriggerDrops.length, 1);
assert.equal(canonicalTriggerCreates.length, 1);
assert.match(sql, /AFTER INSERT OR UPDATE OF status ON public\.invoices/);
assert.match(
  sql,
  /v_dedupe_key := 'invoice_status_changed:' \|\| NEW\.id::text \|\| ':' \|\| coalesce\(NEW\.status, 'unknown'\) \|\| ':' \|\| coalesce\(NEW\.client_id::text, 'none'\);/
);
assert.match(sql, /private\.create_avelixa_notification\(/);
assert.match(sql, /private\.log_avelixa_automation_event\(/);

// Notification email delivery remains downstream of the shared notifications table.
assert.doesNotMatch(sql, /DROP TRIGGER IF EXISTS notifications_queue_email/);
assert.doesNotMatch(sql, /DROP TRIGGER IF EXISTS avelixa_push_worker_on_notification/);

console.log('invoice notification consolidation tests: PASS');
