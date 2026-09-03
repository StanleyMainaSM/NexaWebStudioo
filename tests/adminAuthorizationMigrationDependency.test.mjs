import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const helperName = '20260829119998_create_admin_authorization_helper.sql';
const baselineName = '20260829119999_create_admin_messages_baseline.sql';
const dependentName = '20260829120000_communication_secure_admin_message_and_presence.sql';

const helperPath = path.join(migrationsDir, helperName);
const baselinePath = path.join(migrationsDir, baselineName);
const dependentPath = path.join(migrationsDir, dependentName);

assert.ok(fs.existsSync(helperPath), `Missing ${helperName}`);
assert.ok(fs.existsSync(baselinePath), `Missing ${baselineName}`);
assert.ok(fs.existsSync(dependentPath), `Missing ${dependentName}`);

const helper = fs.readFileSync(helperPath, 'utf8');
const baseline = fs.readFileSync(baselinePath, 'utf8');
const dependent = fs.readFileSync(dependentPath, 'utf8');

assert.match(helper, /create\s+or\s+replace\s+function\s+private\.is_admin_or_owner\s*\(\)/i);
assert.match(helper, /private\.user_has_any_role\s*\(/i);
assert.match(helper, /array\s*\[\s*['"]owner['"]\s*,\s*['"]admin['"]\s*\]/i);
assert.match(helper, /revoke\s+all\s+on\s+function\s+private\.is_admin_or_owner\s*\(\)\s+from\s+public/i);
assert.match(helper, /grant\s+execute\s+on\s+function\s+private\.is_admin_or_owner\s*\(\)\s+to\s+authenticated/i);

assert.match(baseline, /private\.is_admin_or_owner\s*\(\)/i);
assert.match(dependent, /private\.is_admin_or_owner\s*\(\)/i);

assert.ok(helperName < baselineName, 'Authorization helper migration must precede admin_messages baseline');
assert.ok(baselineName < dependentName, 'admin_messages baseline must precede communication security migration');

console.log('admin authorization migration dependency tests passed');
