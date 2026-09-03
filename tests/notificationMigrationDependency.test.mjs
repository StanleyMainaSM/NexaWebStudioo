import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'supabase', 'migrations', '20260829169994_create_notification_helper_baseline.sql');
const dependentPaths = [
  path.join(root, 'supabase', 'migrations', '20260830193000_harden_client_project_handoff_notifications.sql'),
  path.join(root, 'supabase', 'migrations', '20260830210000_connector_operational_notifications.sql'),
];

assert.ok(fs.existsSync(baselinePath), 'notification helper baseline must exist');
const baseline = fs.readFileSync(baselinePath, 'utf8');
assert.match(baseline, /create or replace function private\.create_avelixa_notification/i);
assert.match(baseline, /notification_type text/i);
assert.match(baseline, /entity_type text/i);
assert.match(baseline, /entity_id uuid/i);
assert.match(baseline, /metadata jsonb/i);
assert.match(baseline, /on conflict \(dedupe_key\) do nothing/i);
assert.match(baseline, /revoke all on function private\.create_avelixa_notification/i);
assert.match(baseline, /grant execute on function private\.create_avelixa_notification.*to authenticated/i);

for (const dependentPath of dependentPaths) {
  assert.ok(fs.existsSync(dependentPath), `dependent migration must exist: ${path.basename(dependentPath)}`);
  const dependent = fs.readFileSync(dependentPath, 'utf8');
  assert.match(dependent, /private\.create_avelixa_notification/i);
  assert.ok(
    path.basename(baselinePath) < path.basename(dependentPath),
    `${path.basename(baselinePath)} must precede ${path.basename(dependentPath)}`,
  );
}

console.log('Notification migration dependency guard: PASS');
