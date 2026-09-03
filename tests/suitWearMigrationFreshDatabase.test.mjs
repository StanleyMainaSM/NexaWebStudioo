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
const columnMigrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260829169999_restore_project_operator_payment_columns.sql',
);

assert.ok(fs.existsSync(migrationPath), 'Suit & Wear transaction migration must exist');
assert.ok(fs.existsSync(columnMigrationPath), 'project operator payment column migration must exist');

const migration = fs.readFileSync(migrationPath, 'utf8');
const columnMigration = fs.readFileSync(columnMigrationPath, 'utf8');

assert.match(
  migration,
  /IF NOT EXISTS \(\s*SELECT 1\s+FROM public\.profiles[\s\S]*?WHERE id = v_connector[\s\S]*?\) THEN\s+RETURN;\s+END IF;/i,
  'migration must exit cleanly on a fresh database when the production connector profile is absent',
);
assert.match(
  migration,
  /IF NOT EXISTS \([\s\S]*?FROM public\.user_roles[\s\S]*?role = 'connector'[\s\S]*?\) THEN\s+RAISE EXCEPTION 'Expected Suit & Wear connector role is missing'/i,
  'existing production-data role validation must remain present once the connector profile exists',
);
assert.match(
  migration,
  /IF NOT EXISTS \([\s\S]*?FROM public\.connector_profiles[\s\S]*?commission_rate = 20\.00[\s\S]*?\) THEN\s+RAISE EXCEPTION 'Expected active 20%% connector profile is missing'/i,
  'existing production-data connector profile validation must remain present',
);
for (const column of [
  'operator_payment_status',
  'operator_paid_at',
  'operator_payment_method',
  'operator_payment_reference',
  'operator_payment_verification',
]) {
  assert.match(
    columnMigration,
    new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\b`, 'i'),
    `project operator payment column ${column} must be restored before finance reconciliation`,
  );
}
assert.ok(
  '20260829150000_connect_suit_wear_transaction.sql' < '20260829169999_restore_project_operator_payment_columns.sql'
    && '20260829169999_restore_project_operator_payment_columns.sql' < '20260829170000_suit_wear_finance_and_commission_confirmation.sql',
  'operator payment column migration must sort between the Suit & Wear transaction and finance reconciliation migrations',
);

console.log('Suit & Wear fresh-database migration guard: PASS');
