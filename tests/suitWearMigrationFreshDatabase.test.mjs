import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase', 'migrations', '20260829150000_connect_suit_wear_transaction.sql');
const payoutColumnMigrationPath = path.join(root, 'supabase', 'migrations', '20260829149998_restore_payout_reconciliation_columns.sql');
const commissionColumnMigrationPath = path.join(root, 'supabase', 'migrations', '20260829149999_restore_commission_reconciliation_columns.sql');
const financeAccountsMigrationPath = path.join(root, 'supabase', 'migrations', '20260829169997_create_finance_accounts_baseline.sql');
const paymentColumnMigrationPath = path.join(root, 'supabase', 'migrations', '20260829169998_restore_payment_reconciliation_columns.sql');
const projectColumnMigrationPath = path.join(root, 'supabase', 'migrations', '20260829169999_restore_project_operator_payment_columns.sql');

assert.ok(fs.existsSync(migrationPath), 'Suit & Wear transaction migration must exist');
assert.ok(fs.existsSync(payoutColumnMigrationPath), 'payout reconciliation column migration must exist');
assert.ok(fs.existsSync(commissionColumnMigrationPath), 'commission reconciliation column migration must exist');
assert.ok(fs.existsSync(financeAccountsMigrationPath), 'finance accounts baseline migration must exist');
assert.ok(fs.existsSync(paymentColumnMigrationPath), 'payment reconciliation column migration must exist');
assert.ok(fs.existsSync(projectColumnMigrationPath), 'project operator payment column migration must exist');

const migration = fs.readFileSync(migrationPath, 'utf8');
const payoutColumnMigration = fs.readFileSync(payoutColumnMigrationPath, 'utf8');
const commissionColumnMigration = fs.readFileSync(commissionColumnMigrationPath, 'utf8');
const financeAccountsMigration = fs.readFileSync(financeAccountsMigrationPath, 'utf8');
const paymentColumnMigration = fs.readFileSync(paymentColumnMigrationPath, 'utf8');
const projectColumnMigration = fs.readFileSync(projectColumnMigrationPath, 'utf8');

assert.match(migration, /IF NOT EXISTS \(\s*SELECT 1\s+FROM public\.profiles[\s\S]*?WHERE id = v_connector[\s\S]*?\) THEN\s+RETURN;\s+END IF;/i, 'migration must exit cleanly on a fresh database when the production connector profile is absent');
assert.match(migration, /IF NOT EXISTS \([\s\S]*?FROM public\.user_roles[\s\S]*?role = 'connector'[\s\S]*?\) THEN\s+RAISE EXCEPTION 'Expected Suit & Wear connector role is missing'/i, 'existing production-data role validation must remain present once the connector profile exists');
assert.match(migration, /IF NOT EXISTS \([\s\S]*?FROM public\.connector_profiles[\s\S]*?commission_rate = 20\.00[\s\S]*?\) THEN\s+RAISE EXCEPTION 'Expected active 20%% connector profile is missing'/i, 'existing production-data connector profile validation must remain present');
assert.match(payoutColumnMigration, /ADD COLUMN IF NOT EXISTS payout_type\b/i, 'payout_type must be restored before payout workflow execution');
assert.match(payoutColumnMigration, /ADD COLUMN IF NOT EXISTS finance_account_id\b/i, 'payout finance_account_id must be restored before finance reconciliation');
assert.match(commissionColumnMigration, /ADD COLUMN IF NOT EXISTS verification_message\b/i, 'commission verification_message must be restored before commission workflow execution');
assert.match(commissionColumnMigration, /ADD COLUMN IF NOT EXISTS payment_method\b/i, 'commission payment_method must be restored before commission workflow execution');
assert.match(commissionColumnMigration, /ADD COLUMN IF NOT EXISTS payment_reference\b/i, 'commission payment_reference must be restored before commission workflow execution');
assert.match(financeAccountsMigration, /CREATE TABLE IF NOT EXISTS public\.finance_accounts/i, 'finance_accounts must have a clean-database baseline');
for (const column of ['payment_method', 'reference_number', 'verification_message', 'finance_account_id']) {
  assert.match(paymentColumnMigration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\b`, 'i'), `payment reconciliation column ${column} must be restored before finance reconciliation`);
}
for (const column of ['operator_payment_status', 'operator_paid_at', 'operator_payment_method', 'operator_payment_reference', 'operator_payment_verification']) {
  assert.match(projectColumnMigration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\b`, 'i'), `project operator payment column ${column} must be restored before finance reconciliation`);
}
assert.ok(
  '20260829149998_restore_payout_reconciliation_columns.sql' < '20260829149999_restore_commission_reconciliation_columns.sql'
    && '20260829149999_restore_commission_reconciliation_columns.sql' < '20260829150000_connect_suit_wear_transaction.sql'
    && '20260829150000_connect_suit_wear_transaction.sql' < '20260829150001_owner_connector_commission_management.sql'
    && '20260829150001_owner_connector_commission_management.sql' < '20260829169997_create_finance_accounts_baseline.sql'
    && '20260829169997_create_finance_accounts_baseline.sql' < '20260829169998_restore_payment_reconciliation_columns.sql'
    && '20260829169998_restore_payment_reconciliation_columns.sql' < '20260829169999_restore_project_operator_payment_columns.sql'
    && '20260829169999_restore_project_operator_payment_columns.sql' < '20260829170000_suit_wear_finance_and_commission_confirmation.sql',
  'all reconciliation dependency migrations must sort before their dependent Suit & Wear migrations',
);

console.log('Suit & Wear fresh-database migration guard: PASS');
