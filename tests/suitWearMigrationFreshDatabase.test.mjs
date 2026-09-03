import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260829150000_connect_suit_wear_transaction.sql',
);

assert.ok(fs.existsSync(migrationPath), 'Suit & Wear transaction migration must exist');

const migration = fs.readFileSync(migrationPath, 'utf8');

assert.match(
  migration,
  /IF NOT EXISTS \(\s*SELECT 1\s+FROM public\.user_roles[\s\S]*?role = 'connector'[\s\S]*?\) THEN/i,
  'migration must check whether the connector fixture exists before requiring it',
);
assert.match(
  migration,
  /RAISE EXCEPTION 'Expected Suit & Wear connector role is missing'/i,
  'existing production-data validation must remain present',
);
assert.match(
  migration,
  /IF NOT EXISTS \([\s\S]*?FROM public\.user_roles[\s\S]*?\) THEN\s+RETURN;\s+END IF;/i,
  'migration must exit cleanly on a fresh database when the production connector fixture is absent',
);

console.log('Suit & Wear fresh-database migration guard: PASS');
