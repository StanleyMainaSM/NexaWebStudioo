import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'supabase', 'migrations', '20260829119999_create_admin_messages_baseline.sql');
const dependentPath = path.join(root, 'supabase', 'migrations', '20260829120000_communication_secure_admin_message_and_presence.sql');
const notificationHelperPath = path.join(root, 'supabase', 'migrations', '20260829169994_create_notification_helper_baseline.sql');
const notificationDependentPath = path.join(root, 'supabase', 'migrations', '20260830193000_harden_client_project_handoff_notifications.sql');

assert.ok(fs.existsSync(baselinePath), 'admin_messages baseline migration must exist');
assert.ok(fs.existsSync(dependentPath), 'communication secure admin message migration must exist');
assert.ok(fs.existsSync(notificationHelperPath), 'notification helper baseline migration must exist');
assert.ok(fs.existsSync(notificationDependentPath), 'notification workflow migration must exist');

const baseline = fs.readFileSync(baselinePath, 'utf8');
const dependent = fs.readFileSync(dependentPath, 'utf8');
const notificationHelper = fs.readFileSync(notificationHelperPath, 'utf8');
const notificationDependent = fs.readFileSync(notificationDependentPath, 'utf8');

assert.match(
  baseline,
  /create table if not exists public\.admin_messages\s*\(/i,
  'baseline must create public.admin_messages'
);
assert.match(
  baseline,
  /references public\.admin_conversations\(id\)/i,
  'admin_messages must remain attached to the existing admin_conversations architecture'
);
assert.match(
  baseline,
  /alter table public\.admin_messages enable row level security/i,
  'admin_messages baseline must enable RLS'
);
assert.match(
  baseline,
  /admin_messages_insert_user_or_management/i,
  'admin_messages baseline must preserve the existing insert authorization boundary'
);
assert.match(
  baseline,
  /admin_messages_select_user_or_management/i,
  'admin_messages baseline must preserve the existing select authorization boundary'
);
assert.match(
  dependent,
  /returns public\.admin_messages/i,
  'dependent migration must continue using the existing admin_messages return type'
);
assert.ok(
  '20260829119999_create_admin_messages_baseline.sql' < '20260829120000_communication_secure_admin_message_and_presence.sql',
  'admin_messages baseline must sort before the dependent migration'
);

assert.match(
  notificationHelper,
  /create or replace function private\.create_avelixa_notification\s*\(/i,
  'notification helper baseline must create private.create_avelixa_notification'
);
assert.match(
  notificationHelper,
  /returns void/i,
  'notification helper baseline must preserve the existing notification helper return contract'
);
assert.match(
  notificationHelper,
  /insert into public\.notifications/i,
  'notification helper must write through the existing notifications table'
);
assert.match(
  notificationHelper,
  /on conflict \(dedupe_key\) do nothing/i,
  'notification helper must preserve notification deduplication behavior'
);
assert.match(
  notificationDependent,
  /private\.create_avelixa_notification/i,
  'notification workflow must continue using the shared notification helper'
);
assert.ok(
  '20260829169994_create_notification_helper_baseline.sql' < '20260830193000_harden_client_project_handoff_notifications.sql',
  'notification helper baseline must sort before the dependent notification workflow migration'
);


const callSignalsBaselinePath = path.join(root, 'supabase', 'migrations', '20260923160000_restore_call_signals_baseline.sql');
const callSignalsDependentPath = path.join(root, 'supabase', 'migrations', '20260923161018_communication_realtime_delivery_hardening.sql');

assert.ok(fs.existsSync(callSignalsBaselinePath), 'call_signals baseline migration must exist');
assert.ok(fs.existsSync(callSignalsDependentPath), 'call_signals realtime dependent migration must exist');

const callSignalsBaseline = fs.readFileSync(callSignalsBaselinePath, 'utf8');
const callSignalsDependent = fs.readFileSync(callSignalsDependentPath, 'utf8');

assert.match(
  callSignalsBaseline,
  /create table if not exists public\\.call_signals\\s*\\(/i,
  'baseline must create the existing public.call_signals schema before realtime hardening'
);
assert.match(
  callSignalsBaseline,
  /alter table public\\.call_signals enable row level security/i,
  'call_signals baseline must enable RLS'
);
assert.match(
  callSignalsBaseline,
  /call_signals_insert_participant[\\s\\S]*with check/i,
  'call_signals inserts must remain restricted to the authenticated call participant'
);
assert.match(
  callSignalsBaseline,
  /call_signals_select_remote_signals[\\s\\S]*sender_id <> \\(select auth\\.uid\\(\\)\\)/i,
  'call_signals reads must remain restricted to remote signals for authenticated call participants'
);
assert.match(
  callSignalsDependent,
  /alter publication supabase_realtime add table public\\.call_signals/i,
  'dependent migration must only publish the restored call_signals table'
);
assert.ok(
  '20260923160000_restore_call_signals_baseline.sql' < '20260923161018_communication_realtime_delivery_hardening.sql',
  'call_signals baseline must sort before its Realtime publication dependency'
);

console.log('Communication migration dependency regression: PASS');
