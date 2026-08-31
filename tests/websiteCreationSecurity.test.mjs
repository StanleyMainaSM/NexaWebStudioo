import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260831100000_website_creation_foundation.sql', 'utf8');
const accessMigration = fs.readFileSync('supabase/migrations/20260831101000_website_creation_operator_access.sql', 'utf8');

for (const table of ['website_templates','creation_projects','creation_generation_entitlements','creation_generation_usage']) {
  assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
}
assert.match(migration, /generation_limit INTEGER NOT NULL DEFAULT 5/);
assert.match(migration, /v_used >= v_limit/);
assert.match(migration, /UPDATE public\.creation_generation_usage/);
assert.match(migration, /is_active = true/);
assert.match(migration, /client_id = auth\.uid\(\)/);
assert.match(migration, /connector_id = auth\.uid\(\)/);
assert.match(accessMigration, /can_generate BOOLEAN NOT NULL DEFAULT false/);
assert.match(accessMigration, /Owner authorization required/);
assert.match(accessMigration, /can_generate = true/);
assert.match(accessMigration, /Target user must have Operator role/);
console.log('websiteCreationSecurity.test.mjs: PASS');
