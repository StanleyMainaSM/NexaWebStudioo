import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const tablePattern = /\bnotification_email_queue\b/i;
const createTablePattern = /\bcreate\s+table(?:\s+if\s+not\s+exists)?\s+public\.notification_email_queue\b/i;

const referencedMigrations = migrationFiles.filter((file) =>
  tablePattern.test(fs.readFileSync(path.join(migrationsDir, file), 'utf8')),
);

const creatorMigrations = migrationFiles.filter((file) =>
  createTablePattern.test(fs.readFileSync(path.join(migrationsDir, file), 'utf8')),
);

test('notification_email_queue is created before any migration references it', () => {
  assert.ok(creatorMigrations.length > 0, 'migration chain must contain a migration that creates public.notification_email_queue');

  const firstCreator = creatorMigrations[0];
  const firstCreatorIndex = migrationFiles.indexOf(firstCreator);

  assert.ok(
    referencedMigrations.length > 0,
    'migration chain must contain at least one notification_email_queue reference to validate the dependency',
  );

  for (const migration of referencedMigrations) {
    if (migration === firstCreator) continue;

    assert.ok(
      firstCreatorIndex < migrationFiles.indexOf(migration),
      `${firstCreator} must precede ${migration} because ${migration} references public.notification_email_queue`,
    );
  }
});

console.log('notification_email_queue migration dependency guard: PASS');
